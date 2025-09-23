// Define types for the API

export interface LoginCredentials {
  user_id: string;
  dob: string;
}

export interface User {
  user_id: string;
  name: string;
  is_admin: boolean;
}

export interface LoginResponse {
  message: string;
  token?: string;
  user: User;
}

// Admin specific types
export interface AdminLoginCredentials {
  password: string;
}

export interface AdminLoginResponse {
  message: string;
  token: string;
  user?: User;
}

export interface Question {
  id: number;
  section_id: number;
  section_name: string;
  question_id: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
}

export interface Section {
  id: number;
  name: string;
  questions: Question[];
}

export interface ExamData {
  sections: Section[];
}

// Question state types for the UI
export type QuestionStatus = 'not-visited' | 'not-answered' | 'answered' | 'marked-for-review';

export interface QuestionState {
  id: number;
  status: QuestionStatus;
  answer?: string;
}

// Answers map for submission
export type AnswersMap = Record<string, string>;

export interface SubmissionData {
  user_id?: string;
  answers: Record<string, string>;
}

export interface Score {
  points: number;
  total: number;
  percentage: number;
}

// Result types
export interface ScoreResult {
  points: number;
  total: number;
  percentage: number;
}

export interface SubmissionResponse {
  message: string;
  submission_id: number;
  score: Score;
}

export interface SubmissionRecord {
  id: number;
  user_id: string;
  answers: Record<string, string>;
  score: Score;
  submitted_at: string;
}

export interface ScoresResponse {
  submissions: SubmissionRecord[];
}