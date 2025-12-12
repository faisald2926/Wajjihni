export enum UserStatus {
  Student = 'student',
  Graduate = 'graduate'
}

export interface AssessmentQuestion {
  id: number;
  text: string;
}

export interface UserProfile {
  name: string;
  description: string;
  major: string;
  status: UserStatus;
  yearsOfExperience: number; // Used for both Experience Years OR Academic Level
  assessmentAnswers?: { question: string; score: number }[]; 
}

export interface AnalysisResult {
  summary: string;
  strengths: string[];
  recommendedRoles: string[];
}

export interface RoadmapStep {
  title: string;
  description: string;
  certifications: string[];
  platform: 'LinkedIn' | 'Udemy' | 'Coursera' | 'General' | 'EdX';
  duration: string;
}

export interface InterviewEvaluation {
  score: number;
  feedback: string;
  improvements: string[];
  strengths: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export enum AppView {
  Landing,
  Onboarding,
  Dashboard
}
