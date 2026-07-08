import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url().default('https://api.womenshealth.example.com'),
  EXPO_PUBLIC_AI_KEY: z.string().optional(),
  EXPO_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
});

const _env = {
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_AI_KEY: process.env.EXPO_PUBLIC_AI_KEY,
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
};

const parsed = envSchema.safeParse(_env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment variables. Please check your .env file.');
}

export const env = parsed.data;
export type EnvConfig = z.infer<typeof envSchema>;
