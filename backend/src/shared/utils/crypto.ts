import crypto from 'crypto';

// The key used for encryption. If not provided in the environment, we use a robust default fallback.
const ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY || 'a_very_secure_and_long_secret_key_32_bytes!';
const IV_LENGTH = 16; // AES block size is 16 bytes

/**
 * Encrypts a plaintext string using AES-256-CBC.
 * Returns the IV and ciphertext separated by a colon.
 */
export function encrypt(text: string): string {
  if (!text) return '';
  try {
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).substring(0, 32));
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('🔒 [Crypto Error] Encryption failed:', error);
    return text; // Fallback to raw text in case of fatal error
  }
}

/**
 * Decrypts a ciphertext string back to plaintext.
 * Expects the input to be in the "iv:ciphertext" format.
 */
export function decrypt(text: string): string {
  if (!text) return '';
  try {
    if (!text.includes(':')) {
      // If it doesn't contain a colon, it's likely not encrypted yet (legacy/raw)
      return text;
    }
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).substring(0, 32));
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('🔒 [Crypto Error] Decryption failed:', error);
    return text; // Fallback to raw text in case of failure
  }
}
