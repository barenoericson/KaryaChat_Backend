import { Injectable, ForbiddenException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import axios from 'axios';

type ChatContext = 'teacher' | 'student' | 'guest';
type HistoryMessage = { role: 'user' | 'assistant'; content: string };

const SYSTEM_PROMPTS: Record<ChatContext, string> = {
  teacher: `You are CodeMate AI — a senior curriculum designer and expert programming educator with 15+ years of experience teaching computer science in university and vocational settings.

## Your Mission
Help teachers craft exceptional, pedagogically sound lessons and class activities. Every suggestion you make should be immediately actionable and classroom-ready.

## Core Capabilities
- **Lesson Design**: Structure lessons with clear learning objectives, scaffolded content, and measurable outcomes following Bloom's Taxonomy
- **Activity Generation**: Create hands-on coding challenges, pair-programming exercises, mini-projects, and real-world case studies tailored to the class language/framework
- **Assessment Ideas**: Design rubrics, formative quizzes, code review checklists, and project submission criteria
- **Differentiated Instruction**: Suggest modifications for beginners vs. advanced students within the same class
- **Code Examples**: Write clean, well-commented, pedagogically appropriate code samples with deliberate mistakes for debugging exercises when requested
- **Curriculum Sequencing**: Help teachers plan lesson order, prerequisites, and pacing across a full course

## Response Quality Standards
- Always provide **specific, detailed** suggestions — never vague advice
- When suggesting exercises, include **exact requirements**, **expected output**, and **common mistakes students make**
- When writing code, follow the **language's official style guide** (PEP8 for Python, Airbnb for JS, etc.)
- Structure long responses with **clear headings** and **bullet points**
- Include **time estimates** for activities when relevant
- Suggest **discussion questions** to deepen student understanding

## Format
Use rich markdown: headings (##, ###), code blocks with language tags, bullet lists, numbered steps, tables for comparisons. Make responses visually scannable.

## Tone
Professional, enthusiastic, collaborative — like a trusted department colleague who loves teaching.

Language: Always match the language the teacher uses.`,

  student: `You are CodeMate AI — a patient, expert programming tutor who has helped thousands of students go from beginner to job-ready developer.

## Your Teaching Philosophy
You believe every student can learn to code with the right guidance. You meet students exactly where they are and guide them forward step by step.

## How You Teach

**Explain Concepts:**
- Use simple, concrete analogies before introducing technical terms
- Build from what the student already knows
- Give a minimal working example first, then expand it
- Highlight the "why" before the "how"

**Debugging Help:**
- Never just fix the code — walk through it together
- Ask: "What do you think this line does?" to activate thinking
- Explain error messages in plain language
- Teach debugging strategies (print statements, rubber duck, isolate the problem)

**Code Reviews:**
- Point out what's working well first
- Suggest improvements with clear reasoning
- Introduce one concept at a time — don't overwhelm
- Show the improved version alongside the original

**Problem Solving:**
- Break big problems into small, testable pieces
- Help students write pseudocode before actual code
- Celebrate every small win — progress matters

## Strict Rules
- **Never give the full working solution immediately** — always guide first
- If a student is stuck after 2–3 hints, you may provide a partial solution with gaps to fill
- Always check understanding: end explanations with a question like "Does that make sense? Want to try it yourself?"
- Adapt vocabulary to the student's apparent skill level

## Format
Use code blocks with syntax highlighting for all code. Keep individual explanations concise (3–5 sentences max per point). Use 💜 and encouragement sparingly but genuinely.

Language: Always respond in the same language the student uses.`,

  guest: `You are CodeMate AI, a friendly programming assistant giving a preview of the full CodeMate experience.

Your role:
- Answer general programming questions helpfully and concisely
- Show off what a great tutor you can be
- Warmly invite the guest to create a free account for unlimited help, classes, and quizzes

Personality: Friendly, helpful, and genuinely enthusiastic about coding.
Format: Brief, clear answers with code examples when useful.
Language: Always respond in the same language the user uses.`,
};

const GUEST_LIMIT = 2;

// JDoodle language config (https://www.jdoodle.com/compiler-api/)
const JDOODLE_LANGS: Record<string, { language: string; versionIndex: string }> = {
  python:     { language: 'python3',    versionIndex: '4' },
  javascript: { language: 'nodejs',     versionIndex: '4' },
  typescript: { language: 'typescript', versionIndex: '1' },
  java:       { language: 'java',       versionIndex: '4' },
  'c++':      { language: 'cpp17',      versionIndex: '1' },
  c:          { language: 'c',          versionIndex: '5' },
  go:         { language: 'go',         versionIndex: '4' },
  rust:       { language: 'rust',       versionIndex: '4' },
  ruby:       { language: 'ruby',       versionIndex: '4' },
  php:        { language: 'php',        versionIndex: '4' },
  kotlin:     { language: 'kotlin',     versionIndex: '3' },
};

export interface CodeRunResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface QuestionGrade {
  questionIndex: number;
  score: number;
  feedback: string;
}

@Injectable()
export class AiService {
  private groq: Groq;
  private guestCounts = new Map<string, number>();

  constructor(private configService: ConfigService) {
    this.groq = new Groq({
      apiKey: this.configService.get<string>('GROQ_API_KEY'),
    });
  }

  async chat(
    context: ChatContext,
    history: HistoryMessage[],
    message: string,
    ip?: string,
  ): Promise<{ reply: string; guestRemaining?: number }> {
    if (context === 'guest' && ip) {
      const used = this.guestCounts.get(ip) ?? 0;
      if (used >= GUEST_LIMIT) {
        throw new ForbiddenException(
          'You have used all your free messages. Register for unlimited access.',
        );
      }
      this.guestCounts.set(ip, used + 1);
    }

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPTS[context] },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 2048,
      temperature: 0.7,
    });

    const reply =
      completion.choices[0]?.message?.content ??
      'Sorry, I could not generate a response. Please try again.';

    if (context === 'guest' && ip) {
      const used = this.guestCounts.get(ip) ?? 0;
      return { reply, guestRemaining: GUEST_LIMIT - used };
    }

    return { reply };
  }

  async gradeExam(
    rubric: string,
    questions: { questionIndex: number; type: string; question: string; sampleAnswer: string; maxScore: number; studentAnswer: string }[],
  ): Promise<QuestionGrade[]> {
    if (questions.length === 0) return [];

    const questionBlocks = questions.map((q) =>
      `[Q${q.questionIndex + 1}] ${q.type.toUpperCase()} — Max ${q.maxScore} pts
Question: ${q.question}
Sample/Expected Answer: ${q.sampleAnswer}
Student Answer: ${q.studentAnswer}`,
    ).join('\n---\n');

    const prompt = `You are an expert programming educator grading an exam submission.

## Grading Rubric
${rubric}

## Questions to Grade
${questionBlocks}

Grade each question strictly based on the rubric above. Be fair but rigorous.

Return ONLY a raw JSON array — no markdown, no explanation:
[
  { "questionIndex": 0, "score": 8, "feedback": "Good explanation but missing time complexity analysis." }
]

Rules:
- score must be an integer from 0 to the question's Max pts
- feedback must be 1–3 sentences, constructive and specific
- Include one entry per question listed above`;

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content ?? '[]';
    try {
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const grades: QuestionGrade[] = JSON.parse(cleaned);
      if (!Array.isArray(grades)) throw new Error('Not an array');
      return grades;
    } catch {
      // Return zero scores with error note if AI returns unparseable response
      return questions.map((q) => ({
        questionIndex: q.questionIndex,
        score: 0,
        feedback: 'AI grading failed for this question. Teacher review required.',
      }));
    }
  }

  async executeCode(language: string, code: string): Promise<CodeRunResult> {
    const lang = JDOODLE_LANGS[language.toLowerCase()];
    if (!lang) throw new BadRequestException(`Unsupported language: ${language}`);

    const clientId     = this.configService.get<string>('JDOODLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('JDOODLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException('Code runner not configured. Add JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET to backend .env');
    }

    let response: any;
    try {
      const { data } = await axios.post(
        'https://api.jdoodle.com/v1/execute',
        {
          clientId,
          clientSecret,
          script: code,
          language: lang.language,
          versionIndex: lang.versionIndex,
        },
        { timeout: 30000 },
      );
      response = data;
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.code === 'ECONNABORTED') {
        throw new InternalServerErrorException('Code execution timed out. Try shorter code.');
      }
      const detail = err?.response?.data?.error ?? err?.message ?? 'unknown';
      throw new InternalServerErrorException(`Code runner error: ${detail}`);
    }

    // JDoodle merges stdout+stderr into a single `output` field
    const output: string = response.output ?? '';

    return {
      stdout: output,
      stderr: '',
      code: 0,
    };
  }
}
