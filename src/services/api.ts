import type { User, Meeting } from '../types';

const API_URL = 'http://localhost:8000';
const TOKEN_KEY = 'ai_workspace_token';

// --- HELPERS ---
export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const checkPasswordStrength = (password: string): 'weak' | 'fair' | 'strong' => {
  if (password.length < 8) return 'weak';
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const categoriesMet = [hasUpper, hasLower, hasNumbers, hasSpecial].filter(Boolean).length;
  if (categoriesMet < 3) return 'weak';
  if ((password.length >= 12 && categoriesMet >= 3) || (password.length >= 10 && categoriesMet === 4)) return 'strong';
  return 'fair';
};

const getHeaders = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// --- AUTH API ---
export const authApi = {
  signup: async (name: string, email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Signup failed');
    localStorage.setItem(TOKEN_KEY, data.access_token);
    return { user: data.user, token: data.access_token };
  },

  checkEmailExists: async (email: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      return data.exists; 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return false; 
    }
  },

  login: async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login-json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Login failed');
    localStorage.setItem(TOKEN_KEY, data.access_token);
    return { user: data.user, token: data.access_token };
  },

  logout: () => localStorage.removeItem(TOKEN_KEY),

  getCurrentUser: async (): Promise<User | null> => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    try {
      const res = await fetch(`${API_URL}/users/me`, { headers: getHeaders() });
      if (!res.ok) { localStorage.removeItem(TOKEN_KEY); return null; }
      const user = await res.json();
      return { ...user, id: String(user.id) };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) { return null; }
  },
  
  requestPasswordReset: async () => ({ resetToken: 'mock' }),
  resetPassword: async () => {}
};

// --- MEETING API ---
export const meetingApi = {
  getAll: async (): Promise<Meeting[]> => {
    const res = await fetch(`${API_URL}/meetings`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch meetings');
    
    const rawData = await res.json();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rawData.map((m: any) => ({
      ...m,
      id: String(m.id),
      keywords: JSON.parse(m.keywords_json || "[]"),
      actionItems: JSON.parse(m.action_items_json || "[]"),
      speakers: JSON.parse(m.speakers_json || "[]")
    }));
  },

  uploadMedia: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/upload-media`, {
      method: 'POST',
      body: formData, 
    });

    if (!res.ok) throw new Error('Failed to upload audio file');
    const data = await res.json();
    return data.url; 
  },

  create: async (meeting: Partial<Meeting>): Promise<Meeting> => {
    const payload = {
      title: meeting.title,
      date: meeting.date,
      duration: meeting.duration,
      status: meeting.status,
      audio_url: meeting.audio_url || "", 
      summary: meeting.summary,
      transcript: meeting.transcript,
      sentiment: meeting.sentiment,
      sentimentScore: meeting.sentimentScore,
      keywords: meeting.keywords || [],
      actionItems: meeting.actionItems || [],
      speakers: meeting.speakers || []
    };

    const res = await fetch(`${API_URL}/meetings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Failed to save meeting');
    const m = await res.json();
    
    return {
      ...m,
      id: String(m.id),
      keywords: JSON.parse(m.keywords_json),
      actionItems: JSON.parse(m.action_items_json),
      speakers: JSON.parse(m.speakers_json)
    };
  },

  // 👇 NEW: Extract Entities via Backend Spacy
  extractEntities: async (text: string) => {
    const res = await fetch(`${API_URL}/nlp/extract-entities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return { entities: [] };
    return await res.json();
  }
};