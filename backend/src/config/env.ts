import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface EnvConfig {
  PORT: number;
  MONGO_URI: string;
  ANGELONE_API_KEY: string;
  ANGELONE_CLIENT_CODE: string;
  ANGELONE_PIN: string;
  ANGELONE_TOTP_SECRET: string;
}

export const env: EnvConfig = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/algotrade',
  ANGELONE_API_KEY: process.env.ANGELONE_API_KEY || '',
  ANGELONE_CLIENT_CODE: process.env.ANGELONE_CLIENT_CODE || '',
  ANGELONE_PIN: process.env.ANGELONE_PIN || '',
  ANGELONE_TOTP_SECRET: process.env.ANGELONE_TOTP_SECRET || '',
};
