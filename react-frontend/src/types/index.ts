// User types
export interface User {
  user_id: string;
  name?: string;
  is_admin?: boolean;
}

export interface LoginCredentials {
  user_id: string;
  dob: string;
}

export interface LoginResponse {
  message: string;
  token?: string;
  user: User;
}

// Question types
export interface Option {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface Question {
  id: number;
  section_id: number;
  section_name: string;
  question_id: number;
  question: string;
  options: Option;
}

export interface Section {
  id: number;
  name: string;
  questions: Question[];
}

export interface ExamData {
  test_id?: number;
  title?: string;
  description?: string;
  duration_minutes?: number;
  sections: Section[];
}

// Question status types
export type QuestionStatus = 'not-visited' | 'not-answered' | 'answered' | 'marked-for-review' | 'answered-marked';

export interface QuestionState {
  id: number;
  status: QuestionStatus;
  answer?: string;
}

// Submission types
export interface AnswersMap {
  [questionId: string]: string;
}

// Submission data structure with optional question states for analysis
export interface SubmissionData {
  user_id: string;
  answers: AnswersMap;
  test_id?: number;
  question_states?: {
    [questionId: string]: {
      marked_for_review: boolean;
    };
  };
}

export interface ScoreResult {
  points: number;
  total: number;
  percentage: number;
}

export interface SubmissionResponse {
  message: string;
  submission_id: number;
  score: ScoreResult;
}