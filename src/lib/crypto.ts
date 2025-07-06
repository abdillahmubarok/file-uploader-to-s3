import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

const getEncryptionKey = () => {
    const secret = process.env.URL_ENCRYPTION_SECRET;
    
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
        const result = Buffer.concat([iv, authTag, encrypted]);
        
        // Use native base64url encoding for URL safety
        return result.toString('base64url');
    } catch (error) {
        console.error('Encryption failed:', error);
        throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export function decrypt(encryptedText: string): string | null {
    if (!encryptedText) {
        console.error('Decrypt Error: Received empty or null text.');
        return null;
    }

    try {
        const key = getEncryptionKey();
        
        // Use native base64url decoding
        const data = Buffer.from(encryptedText, 'base64url');
        
        if (data.length < IV_LENGTH + TAG_LENGTH) {
            console.error(`Decrypt Error: Encrypted data is too short. Expected > ${IV_LENGTH + TAG_LENGTH}, got ${data.length}`);
            return null;
        }

        const iv = data.subarray(0, IV_LENGTH);
        const authTag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
        const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH);

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final() // This will throw if the auth tag is invalid
        ]);
        
        return decrypted.toString('utf8');
    } catch (error) {
        console.error("Decryption failed. The link may be invalid, expired, or tampered with.", error);
        return null;
    }
}
