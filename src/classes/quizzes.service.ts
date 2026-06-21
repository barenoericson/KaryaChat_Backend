import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { Quiz, QuizQuestion } from './entities/quiz.entity';
import { QuizResult, SubmittedAnswer } from './entities/quiz-result.entity';
import { Lesson } from './entities/lesson.entity';
import { Class } from './entities/class.entity';
import { UserRole } from '../users/user.entity';
import { User } from '../users/user.entity';
import { AiService } from '../ai/ai.service';

@Injectable()
export class QuizzesService {
  private _groq: Groq | undefined;

  constructor(
    @InjectRepository(Quiz)
    private quizRepo: Repository<Quiz>,
    @InjectRepository(QuizResult)
    private resultRepo: Repository<QuizResult>,
    @InjectRepository(Lesson)
    private lessonRepo: Repository<Lesson>,
    @InjectRepository(Class)
    private classRepo: Repository<Class>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private configService: ConfigService,
    private aiService: AiService,
  ) {}

  private get groq(): Groq {
    if (!this._groq) {
      const apiKey = this.configService.get<string>('GROQ_API_KEY');
      if (!apiKey) throw new InternalServerErrorException('GROQ_API_KEY is not configured on the server.');
      this._groq = new Groq({ apiKey });
    }
    return this._groq;
  }

  async generate(teacherId: string, classId: string, lessonId: string): Promise<Quiz> {
    await this.assertTeacherAccess(teacherId, classId);
    const lesson = await this.assertLessonExists(classId, lessonId);

    const prompt = `You are an expert programming educator. Generate a quiz with exactly 5 questions based on the lesson below.

Lesson Title: ${lesson.title}
Lesson Content: ${lesson.content}${lesson.codeSnippet ? `\n\nCode Example:\n${lesson.codeSnippet}` : ''}

Requirements:
- Mix question types: at least 2 MCQ, 1 fill-in-the-blank, 1 short answer
- Questions must test understanding of the lesson content
- MCQ must have exactly 4 options labeled A, B, C, D
- Answers for MCQ must be the full option text (not just the letter)
- Keep questions clear and unambiguous

Return ONLY valid JSON — no markdown, no explanation, no code blocks. Just raw JSON array:
[
  {
    "type": "mcq",
    "question": "...",
    "options": ["option A text", "option B text", "option C text", "option D text"],
    "answer": "option A text",
    "explanation": "Brief explanation of why this is correct"
  },
  {
    "type": "fill",
    "question": "Complete the statement: ___",
    "answer": "the correct word or phrase",
    "explanation": "..."
  },
  {
    "type": "short",
    "question": "Explain in one sentence...",
    "answer": "expected answer keywords",
    "explanation": "..."
  }
]`;

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      temperature: 0.5,
    });

    const raw = completion.choices[0]?.message?.content ?? '[]';
    let questions: QuizQuestion[];

    try {
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      questions = JSON.parse(cleaned);
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Invalid format');
      }
    } catch {
      throw new BadRequestException('AI returned an invalid quiz format. Please try again.');
    }

    const existing = await this.quizRepo.findOne({ where: { classId, lessonId } });
    if (existing) {
      existing.questions = questions;
      existing.createdBy = teacherId;
      return this.quizRepo.save(existing);
    }

    const quiz = this.quizRepo.create({ classId, lessonId, createdBy: teacherId, questions });
    return this.quizRepo.save(quiz);
  }

  async getQuiz(requesterId: string, classId: string, lessonId: string): Promise<Quiz> {
    await this.assertAccess(requesterId, classId);
    const quiz = await this.quizRepo.findOne({ where: { classId, lessonId } });
    if (!quiz) throw new NotFoundException('No quiz found for this lesson');
    return quiz;
  }

  async submitQuiz(
    studentId: string,
    classId: string,
    lessonId: string,
    answers: SubmittedAnswer[],
  ): Promise<QuizResult> {
    await this.assertStudentAccess(studentId, classId);
    const quiz = await this.quizRepo.findOne({ where: { classId, lessonId } });
    if (!quiz) throw new NotFoundException('No quiz found for this lesson');

    const existingResult = await this.resultRepo.findOne({
      where: { quizId: quiz.id, studentId },
    });

    let correct = 0;
    const total = quiz.questions.length;

    for (const submitted of answers) {
      const q = quiz.questions[submitted.questionIndex];
      if (!q) continue;
      const normalize = (s: string) => s.trim().toLowerCase();
      if (normalize(submitted.answer) === normalize(q.answer)) {
        correct++;
      }
    }

    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    if (existingResult) {
      existingResult.answers = answers;
      existingResult.correct = correct;
      existingResult.total = total;
      existingResult.score = score;
      return this.resultRepo.save(existingResult);
    }

    const result = this.resultRepo.create({
      quizId: quiz.id,
      studentId,
      answers,
      correct,
      total,
      score,
    });
    return this.resultRepo.save(result);
  }

  async getResultsForLesson(
    teacherId: string,
    classId: string,
    lessonId: string,
  ): Promise<QuizResult[]> {
    await this.assertTeacherAccess(teacherId, classId);
    const quiz = await this.quizRepo.findOne({ where: { classId, lessonId } });
    if (!quiz) return [];
    return this.resultRepo.find({
      where: { quizId: quiz.id },
      order: { completedAt: 'DESC' },
    });
  }

  async getMyResult(
    studentId: string,
    classId: string,
    lessonId: string,
  ): Promise<QuizResult | null> {
    await this.assertStudentAccess(studentId, classId);
    const quiz = await this.quizRepo.findOne({ where: { classId, lessonId } });
    if (!quiz) return null;
    return this.resultRepo.findOne({ where: { quizId: quiz.id, studentId } }) ?? null;
  }

  private async assertTeacherAccess(teacherId: string, classId: string) {
    const cls = await this.classRepo.findOne({ where: { id: classId } });
    if (!cls) throw new NotFoundException('Class not found');
    if (cls.teacherId !== teacherId) throw new ForbiddenException('Not your class');
  }

  private async assertStudentAccess(studentId: string, classId: string) {
    const cls = await this.classRepo.findOne({
      where: { id: classId },
      relations: ['students'],
    });
    if (!cls) throw new NotFoundException('Class not found');
    const enrolled = cls.students.some((s) => s.id === studentId);
    if (!enrolled) throw new ForbiddenException('You are not enrolled in this class');
  }

  private async assertAccess(requesterId: string, classId: string) {
    const user = await this.userRepo.findOne({ where: { id: requesterId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === UserRole.TEACHER) {
      await this.assertTeacherAccess(requesterId, classId);
    } else {
      await this.assertStudentAccess(requesterId, classId);
    }
  }

  private async assertLessonExists(classId: string, lessonId: string): Promise<Lesson> {
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId, classId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    return lesson;
  }

  // ─── Exam methods ───────────────────────────────────────────────────────────

  async createExam(
    teacherId: string,
    classId: string,
    data: { title: string; rubric: string; questions: QuizQuestion[] },
  ): Promise<Quiz> {
    await this.assertTeacherAccess(teacherId, classId);
    if (!data.questions || data.questions.length === 0) {
      throw new BadRequestException('Exam must have at least one question.');
    }
    const exam = this.quizRepo.create({
      classId,
      lessonId: null,
      createdBy: teacherId,
      isExam: true,
      title: data.title.trim(),
      rubric: data.rubric.trim(),
      questions: data.questions,
    });
    return this.quizRepo.save(exam);
  }

  async getExams(requesterId: string, classId: string): Promise<Quiz[]> {
    await this.assertAccess(requesterId, classId);
    return this.quizRepo.find({ where: { classId, isExam: true }, order: { createdAt: 'DESC' } });
  }

  async getExam(requesterId: string, classId: string, examId: string): Promise<Quiz> {
    await this.assertAccess(requesterId, classId);
    const exam = await this.quizRepo.findOne({ where: { id: examId, classId, isExam: true } });
    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }

  async submitExam(
    studentId: string,
    classId: string,
    examId: string,
    rawAnswers: SubmittedAnswer[],
  ): Promise<QuizResult> {
    await this.assertStudentAccess(studentId, classId);
    const exam = await this.quizRepo.findOne({ where: { id: examId, classId, isExam: true } });
    if (!exam) throw new NotFoundException('Exam not found');

    const answers: SubmittedAnswer[] = rawAnswers.map((a) => ({ ...a }));
    const normalize = (s: string) => s.trim().toLowerCase();
    let autoCorrect = 0;

    // Auto-grade MCQ, fill, short
    for (const a of answers) {
      const q = exam.questions[a.questionIndex];
      if (!q) continue;
      if (q.type === 'mcq' || q.type === 'fill' || q.type === 'short') {
        const maxPts = q.maxScore ?? 1;
        if (normalize(a.answer) === normalize(q.answer)) {
          a.aiScore = maxPts;
          a.aiFeedback = 'Correct!';
          autoCorrect++;
        } else {
          a.aiScore = 0;
          a.aiFeedback = `Incorrect. Expected: ${q.answer}`;
        }
      }
    }

    // AI-grade open-ended, essay, coding
    const toGrade = answers
      .map((a) => {
        const q = exam.questions[a.questionIndex];
        if (!q || q.type === 'mcq' || q.type === 'fill' || q.type === 'short') return null;
        return {
          questionIndex: a.questionIndex,
          type: q.type,
          question: q.question,
          sampleAnswer: q.answer,
          maxScore: q.maxScore ?? 10,
          studentAnswer: a.answer,
        };
      })
      .filter(Boolean) as {
        questionIndex: number; type: string; question: string;
        sampleAnswer: string; maxScore: number; studentAnswer: string;
      }[];

    if (toGrade.length > 0 && exam.rubric) {
      const grades = await this.aiService.gradeExam(exam.rubric, toGrade);
      for (const g of grades) {
        const a = answers.find((x) => x.questionIndex === g.questionIndex);
        if (a) {
          a.aiScore = g.score;
          a.aiFeedback = g.feedback;
        }
      }
    }

    // Compute final score as percentage of max points
    let totalEarned = 0;
    let totalPossible = 0;
    for (const a of answers) {
      const q = exam.questions[a.questionIndex];
      if (!q) continue;
      const maxPts = q.maxScore ?? (q.type === 'mcq' || q.type === 'fill' || q.type === 'short' ? 1 : 10);
      totalPossible += maxPts;
      totalEarned += a.aiScore ?? 0;
    }
    const score = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;

    const existing = await this.resultRepo.findOne({ where: { quizId: examId, studentId } });
    if (existing) {
      existing.answers = answers;
      existing.correct = autoCorrect;
      existing.total = exam.questions.length;
      existing.score = score;
      existing.isGraded = true;
      return this.resultRepo.save(existing);
    }

    const result = this.resultRepo.create({
      quizId: examId,
      studentId,
      answers,
      correct: autoCorrect,
      total: exam.questions.length,
      score,
      isGraded: true,
    });
    return this.resultRepo.save(result);
  }

  async overrideGrades(
    teacherId: string,
    classId: string,
    examId: string,
    resultId: string,
    overrides: { questionIndex: number; score: number; note?: string }[],
  ): Promise<QuizResult> {
    await this.assertTeacherAccess(teacherId, classId);
    const exam = await this.quizRepo.findOne({ where: { id: examId, classId, isExam: true } });
    if (!exam) throw new NotFoundException('Exam not found');
    const result = await this.resultRepo.findOne({ where: { id: resultId, quizId: examId } });
    if (!result) throw new NotFoundException('Result not found');

    for (const ov of overrides) {
      const a = result.answers.find((x) => x.questionIndex === ov.questionIndex);
      if (a) {
        a.teacherScore = ov.score;
        a.teacherNote = ov.note ?? '';
      }
    }

    // Recalculate score using teacherScore where set, aiScore otherwise
    let totalEarned = 0;
    let totalPossible = 0;
    for (const a of result.answers) {
      const q = exam.questions[a.questionIndex];
      if (!q) continue;
      const maxPts = q.maxScore ?? (q.type === 'mcq' || q.type === 'fill' || q.type === 'short' ? 1 : 10);
      totalPossible += maxPts;
      totalEarned += a.teacherScore != null ? a.teacherScore : (a.aiScore ?? 0);
    }
    result.score = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;

    return this.resultRepo.save(result);
  }

  async getExamResults(
    teacherId: string,
    classId: string,
    examId: string,
  ): Promise<QuizResult[]> {
    await this.assertTeacherAccess(teacherId, classId);
    const exam = await this.quizRepo.findOne({ where: { id: examId, classId, isExam: true } });
    if (!exam) throw new NotFoundException('Exam not found');
    return this.resultRepo.find({ where: { quizId: examId }, order: { completedAt: 'DESC' } });
  }

  async getMyExamResult(
    studentId: string,
    classId: string,
    examId: string,
  ): Promise<QuizResult | null> {
    await this.assertStudentAccess(studentId, classId);
    return this.resultRepo.findOne({ where: { quizId: examId, studentId } }) ?? null;
  }
}
