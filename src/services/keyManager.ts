// src/services/keyManager.ts

/**
 * Parses environment variables to find keys matching a prefix (e.g., VITE_AAI_KEY_1, VITE_AAI_KEY_2)
 */
const getKeysFromEnv = (prefix: string): string[] => {
  const keys: string[] = [];
  // check up to 6 keys
  for (let i = 1; i <= 6; i++) {
    const key = import.meta.env[`${prefix}_${i}`];
    if (key) keys.push(key);
  }
  return keys;
};

/**
 * GENERIC RETRY LOGIC
 * Takes a list of keys and a function to execute.
 * If the function throws an error, it tries the next key.
 */
export async function executeWithKeyRotation<T>(
  envPrefix: string,
  operation: (apiKey: string) => Promise<T>
): Promise<T> {
  const keys = getKeysFromEnv(envPrefix);
  
  if (keys.length === 0) {
    throw new Error(`No API keys found for prefix: ${envPrefix}`);
  }

  let lastError: Error | unknown;

  for (const apiKey of keys) {
    try {
      // Try to run the operation with the current key
      return await operation(apiKey);
    } catch (error) {
      console.warn(`API Call failed with key ...${apiKey.slice(-4)}. Trying next key.`);
      lastError = error;
      // If error is 401 (Unauthorized) or 429 (Rate Limit), continue loop.
      // Otherwise, you might want to throw immediately depending on logic.
      continue;
    }
  }

  throw new Error(`All API keys failed. Last error: ${lastError}`);
}