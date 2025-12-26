// ai-workspace/src/types.ts
export enum View {
  LOGIN = 'LOGIN',
  SIGNUP = 'SIGNUP',
  FORGOT_PASSWORD = 'FORGOT_PASSWORD',
  RESET_PASSWORD = 'RESET_PASSWORD',
  DASHBOARD = 'DASHBOARD',
  UPLOAD = 'UPLOAD',
  CHAT = 'CHAT',
  ANALYTICS = 'ANALYTICS',
  BIOMETRICS = 'BIOMETRICS',
  MEETING_DETAILS = 'MEETING_DETAILS',
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: string;
  status: 'Processing' | 'Completed' | 'Failed';
  audio_url?: string; // 👈 NEW FIELD
  summary?: string;
  transcript?: string;
  speakers?: { name: string; value: number; color: string }[];
  sentiment?: 'Positive' | 'Neutral' | 'Negative';
  sentimentScore?: number;
  keywords?: string[];
  actionItems?: ActionItem[];
  userNotes?: string;
}


export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface MetricData {
  name: string;
  value: number;
}
