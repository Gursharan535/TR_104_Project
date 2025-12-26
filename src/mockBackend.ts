// ai-workspace/src/mockBackend.ts
/**
 * MOCK BACKEND SERVER
 * This file simulates the server-side logic for the AI Workspace application.
 */

const USERS_DB_KEY = 'ai_workspace_users_db';
const ATTEMPTS_DB_KEY = 'ai_workspace_login_attempts';
const JWT_SECRET_MOCK = 'ai_workspace_v1_secure_key';

interface ServerResponse {
  status: number;
  message: string;
  data?: unknown;
}

/**
 * SHA-256 Hashing for password storage and comparison
 */
const hashPassword = async (password: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Server-side Password Validation Simulation
 */
const isStrongEnough = (password: string): boolean => {
  if (password.length < 8) return false;
  const categoriesMet = [
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password)
  ].filter(Boolean).length;
  return categoriesMet >= 3;
};

/**
 * Shared JWT Generation Logic
 */
const generateToken = (payload: unknown): string => {
  return btoa(JSON.stringify(payload)) + '.' + btoa(JWT_SECRET_MOCK);
};

/**
 * MOCK SIGNUP ENDPOINT logic
 */
export const handleSignupRequest = async (name: string, email: string, password: string): Promise<ServerResponse> => {
  const normalizedEmail = email.toLowerCase().trim();
  
  if (!isStrongEnough(password)) {
    return {
      status: 400,
      message: 'Server security audit: Password does not meet complexity requirements.'
    };
  }

  const usersRaw = localStorage.getItem(USERS_DB_KEY);
  const users = usersRaw ? JSON.parse(usersRaw) : [];

  if (users.find((u: unknown) => u.email === normalizedEmail)) {
    return {
      status: 409,
      message: 'An account with this email already exists'
    };
  }

  const hashedPassword = await hashPassword(password);
  const newUser = {
    id: 'usr_' + Math.random().toString(36).substr(2, 9),
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=128`,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));

  const payload = {
    userId: newUser.id,
    email: newUser.email,
    iat: Date.now(),
    exp: Date.now() + (24 * 60 * 60 * 1000)
  };
  const token = generateToken(payload);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...userSafe } = newUser;
  
  return {
    status: 201,
    message: 'User created successfully',
    data: {
      user: userSafe,
      token: token
    }
  };
};

/**
 * MOCK LOGIN ENDPOINT logic
 */
export const handleLoginRequest = async (email: string, password: string): Promise<ServerResponse> => {
  const normalizedEmail = email.toLowerCase().trim();
  
  const usersRaw = localStorage.getItem(USERS_DB_KEY);
  const users = usersRaw ? JSON.parse(usersRaw) : [];
  
  const attemptsRaw = localStorage.getItem(ATTEMPTS_DB_KEY);
  const attempts = attemptsRaw ? JSON.parse(attemptsRaw) : {};
  const userAttempt = attempts[normalizedEmail] || { count: 0, lastAttempt: 0 };
  
  const lockoutTime = 30 * 1000; 
  if (userAttempt.count >= 5 && (Date.now() - userAttempt.lastAttempt) < lockoutTime) {
    const remaining = Math.ceil((lockoutTime - (Date.now() - userAttempt.lastAttempt)) / 1000);
    return {
      status: 429,
      message: `Too many failed attempts. Account locked. Please try again in ${remaining} seconds.`
    };
  }

  const user = users.find((u: unknown) => u.email === normalizedEmail);
  const inputHash = await hashPassword(password);

  if (!user || user.password !== inputHash) {
    attempts[normalizedEmail] = {
      count: userAttempt.count + 1,
      lastAttempt: Date.now()
    };
    localStorage.setItem(ATTEMPTS_DB_KEY, JSON.stringify(attempts));
    
    return {
      status: 401,
      message: 'Invalid email or password. Please try again.'
    };
  }

  delete attempts[normalizedEmail];
  localStorage.setItem(ATTEMPTS_DB_KEY, JSON.stringify(attempts));

  const payload = {
    userId: user.id,
    email: user.email,
    iat: Date.now(),
    exp: Date.now() + (24 * 60 * 60 * 1000)
  };
  const token = generateToken(payload);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...userSafe } = user;
  
  return {
    status: 200,
    message: 'Login successful',
    data: {
      user: userSafe,
      token: token
    }
  };
};
