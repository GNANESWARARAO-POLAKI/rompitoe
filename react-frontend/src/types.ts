// Define types for the API

export interface LoginCredentials {
  user_id: string;
  dob: string;
}

export interface User {
  user_id: string;
  name: string;
  is_admin: boolean;
  profilePicture?: string;
  
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

export interface Test {
  id: number;
  name: string;  // Changed from title to name to match backend
  description: string;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  sections_count?: number;
  questions_count?: number;
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
  test_id: number;
  title: string;  // Keep 'title' here since the backend API for questions returns 'title'
  description: string;
  duration_minutes: number;
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
  test_id: number;
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
  test_id: number;
  test_name: string;
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