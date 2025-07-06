import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

const getEncryptionKey = () => {
    const secret = process.env.URL_ENCRYPTION_SECRET;
    
    // Check if secret exists and is valid hex string
    if (secret) {
        try {
            const keyBuffer = Buffer.from(secret, 'hex');
            if (keyBuffer.length === 32) {
                return keyBuffer;
            }
            console.error('URL_ENCRYPTION_SECRET must be exactly 64 hex characters (32 bytes)');
        } catch (error) {
            console.error('URL_ENCRYPTION_SECRET must be a valid hex string');
        }
    }

    if (process.env.NODE_ENV === 'development') {
        console.warn('URL_ENCRYPTION_SECRET is not set or invalid. Using a temporary key for development.');
        console.warn('For production, generate a key with: node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"');
        
        // Fallback for development ONLY
        return crypto.createHash('sha256').update('temporary-dev-secret-key-replace-me-123').digest();
    }
    
    throw new Error('URL_ENCRYPTION_SECRET must be set and be a 64-character hex string. Generate one with: node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"');
}

export function encrypt(text: string): string {
    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        
        const encrypted = Buffer.concat([
            cipher.update(text, 'utf8'),
            cipher.final()
        ]);
        
        const authTag = cipher.getAuthTag();
        const result = Buffer.concat([iv, authTag, encrypted]).toString('base64url');
        
        return result;
    } catch (error) {
        console.error('Encryption failed:', error);
        throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export function decrypt(encryptedText: string): string | null {
    try {
        const key = getEncryptionKey();
        const data = Buffer.from(encryptedText, 'base64url');
        
        if (data.length < IV_LENGTH + TAG_LENGTH) {
            console.error('Encrypted data is too short');
            return null;
        }

        const iv = data.subarray(0, IV_LENGTH);
        const authTag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
        const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH);

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);
        
        return decrypted.toString('utf8');
    } catch (error) {
        console.error("Decryption failed:", error);
        return null;
    }
}

// Utility function to generate a new encryption key
export function generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
}