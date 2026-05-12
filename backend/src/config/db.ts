import mongoose from 'mongoose';
import { env } from './env';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB! Check your MONGO_URI environment variable.`);
    console.error(`Error details: ${(error as Error).message}`);
    console.warn(`⚠️ Continuing without database connection for Angel One testing.`);
  }
};
