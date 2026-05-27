import mongoose, { Document, Schema } from 'mongoose';

export interface IAngelOneSession extends Document {
  clientCode: string;
  jwtToken: string;
  refreshToken: string;
  feedToken: string;
  lastLoginTime: Date;
  sessionEstablished: boolean;
  pin?: string;          // Encrypted PIN
  totpSecret?: string;   // Encrypted TOTP secret
  websocketStatus?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AngelOneSessionSchema: Schema = new Schema(
  {
    clientCode: { type: String, required: true, unique: true, index: true },
    jwtToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    feedToken: { type: String, required: true },
    lastLoginTime: { type: Date, required: true, default: Date.now },
    sessionEstablished: { type: Boolean, required: true, default: false },
    pin: { type: String },
    totpSecret: { type: String },
    websocketStatus: { type: String, default: 'disconnected' },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

export const AngelOneSession = mongoose.model<IAngelOneSession>('AngelOneSession', AngelOneSessionSchema);
