
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

const getEncryptionKey = () => {
    const secret = process.env.URL_ENCRYPTION_SECRET;
    if (secret && Buffer.from(secret, 'hex').length === 32) {
        return Buffer.from(secret, 'hex');
    }

    if (process.env.NODE_ENV === 'development') {
        console.warn('URL_ENCRYPTION_SECRET is not set or invalid. Using a temporary key for development. Please set a 64-character hex string in your .env file for production.');
        // Fallback for development ONLY to prevent crashing. This is NOT secure for production.
        return crypto.createHash('sha256').update('temporary-dev-secret-key-replace-me-123').digest();
    }
    
    throw new Error('URL_ENCRYPTION_SECRET must be set in .env and be a 64-character hex string.');
}

export function encrypt(text: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64url');
}

export function decrypt(encryptedText: string): string | null {
    try {
        const key = getEncryptionKey();
        const data = Buffer.from(encryptedText, 'base64url');
        
        if (data.length < IV_LENGTH + TAG_LENGTH) {
            return null;
        }

        const iv = data.subarray(0, IV_LENGTH);
        const authTag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
        const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH);

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString('utf8');
    } catch (error) {
        console.error("Decryption failed. The link may be tampered with or invalid.");
        return null;
    }
}
