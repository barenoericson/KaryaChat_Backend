import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Quiz } from './quiz.entity';
import { User } from '../../users/user.entity';

export interface SubmittedAnswer {
  questionIndex: number;
  answer: string;
  // Populated after AI grading (exam submissions only)
  aiScore?: number;
  aiFeedback?: string;
  // Populated after teacher review (null = not overridden, use aiScore)
  teacherScore?: number | null;
  teacherNote?: string;
}

@Entity('quiz_results')
export class QuizResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'quiz_id' })
  quizId: string;

  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ type: 'jsonb' })
  answers: SubmittedAnswer[];

  @Column()
  correct: number;

  @Column()
  total: number;

  @Column({ type: 'float' })
  score: number;

  // True after AI grading completes (always true for regular quizzes, set async for exams)
  @Column({ name: 'is_graded', default: true })
  isGraded: boolean;

  @ManyToOne(() => Quiz, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'quiz_id' })
  quiz: Quiz;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @CreateDateColumn({ name: 'completed_at' })
  completedAt: Date;
}
