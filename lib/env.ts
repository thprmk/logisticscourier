/**
 * Environment Variable Validation
 * Validates all required environment variables at startup
 */

interface EnvConfig {
  MONGODB_URI: string;
  JWT_SECRET: string;
  BLOB_READ_WRITE_TOKEN: string;
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  NODE_ENV: 'development' | 'production' | 'test';
}

/**
 * Validated environment variables
 * Throws error if any required variable is missing
 */
export const env: EnvConfig = {
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN || '',
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || '',
  NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
};

/**
 * Validate environment variables
 * Should be called at application startup
 */
export function validateEnv(): void {
  const requiredVars: Array<keyof EnvConfig> = [
    'MONGODB_URI',
    'JWT_SECRET',
    'BLOB_READ_WRITE_TOKEN',
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'VAPID_SUBJECT',
  ];

  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!env[varName] || env[varName].trim() === '') {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env.local file and ensure all required variables are set.`
    );
  }

  // Additional validations
  if (env.JWT_SECRET.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters long for security reasons.'
    );
  }

  if (!env.MONGODB_URI.startsWith('mongodb://') && !env.MONGODB_URI.startsWith('mongodb+srv://')) {
    throw new Error(
      'MONGODB_URI must be a valid MongoDB connection string (starting with mongodb:// or mongodb+srv://)'
    );
  }

  if (!env.VAPID_SUBJECT.startsWith('mailto:')) {
    throw new Error(
      'VAPID_SUBJECT must start with "mailto:" (e.g., mailto:admin@example.com)'
    );
  }
}

/**
 * Get environment variable with fallback
 */
export function getEnv(key: keyof EnvConfig, fallback?: string): string {
  const value = env[key];
  if (!value && fallback) {
    return fallback;
  }
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

// Validate on module load (only in server-side code)
if (typeof window === 'undefined') {
  try {
    validateEnv();
  } catch (error) {
    // In development, log the error but don't crash
    // In production, this should fail fast
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Environment validation failed:', error);
      throw error;
    } else {
      console.warn('⚠️  Environment validation warning:', error);
    }
  }
}

