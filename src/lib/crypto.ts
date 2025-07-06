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

// Utility function to convert base64 to base64url
function base64ToBase64Url(base64: string): string {
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

// Utility function to convert base64url to base64
function base64UrlToBase64(base64url: string): string {
    let base64 = base64url
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    
    // Add padding if needed
    while (base64.length % 4) {
        base64 += '=';
    }
    
    return base64;
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
        
        // Use base64url encoding for URL safety
        const base64 = result.toString('base64');
        const base64url = base64ToBase64Url(base64);
        
        console.log('🔐 Encryption successful:', {
            inputLength: text.length,
            outputLength: base64url.length,
            hasUrlUnsafeChars: /[+/=]/.test(base64url)
        });
        
        return base64url;
    } catch (error) {
        console.error('Encryption failed:', error);
        throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export function decrypt(encryptedText: string): string | null {
    if (!encryptedText) {
        console.error('Decrypt: Empty encrypted text');
        return null;
    }

    try {
        const key = getEncryptionKey();
        
        console.log('🔓 Attempting decryption:', {
            inputLength: encryptedText.length,
            hasUrlUnsafeChars: /[+/=]/.test(encryptedText)
        });
        
        // Try multiple decode strategies
        let data: Buffer | null = null;
        let decodeMethod = '';
        
        // Strategy 1: Try as base64url first
        try {
            const base64 = base64UrlToBase64(encryptedText);
            data = Buffer.from(base64, 'base64');
            decodeMethod = 'base64url->base64';
        } catch (e) {
            console.log('Failed base64url decode, trying direct base64...');
        }
        
        // Strategy 2: Try direct base64 if base64url failed
        if (!data) {
            try {
                data = Buffer.from(encryptedText, 'base64');
                decodeMethod = 'direct base64';
            } catch (e) {
                console.error('Failed both base64url and base64 decode');
                return null;
            }
        }
        
        console.log('✅ Buffer decode successful:', {
            method: decodeMethod,
            bufferLength: data.length,
            expectedMinLength: IV_LENGTH + TAG_LENGTH
        });
        
        if (data.length < IV_LENGTH + TAG_LENGTH) {
            console.error('Encrypted data is too short:', {
                actual: data.length,
                minimum: IV_LENGTH + TAG_LENGTH
            });
            return null;
        }

        const iv = data.subarray(0, IV_LENGTH);
        const authTag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
        const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH);

        console.log('🔧 Decryption components:', {
            ivLength: iv.length,
            tagLength: authTag.length,
            encryptedLength: encrypted.length
        });

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);
        
        const result = decrypted.toString('utf8');
        
        console.log('✅ Decryption successful:', {
            outputLength: result.length,
            isValidJson: result.startsWith('{') && result.endsWith('}')
        });
        
        return result;
    } catch (error) {
        console.error("Decryption failed:", error);
        
        // Log more details for debugging
        if (error instanceof Error) {
            console.error("Error details:", {
                name: error.name,
                message: error.message,
                stack: error.stack?.split('\n')[0]
            });
        }
        
        return null;
    }
}

// Utility function to test encryption/decryption
export function testEncryption(testData: string = '{"test":true,"timestamp":' + Date.now() + '}'): boolean {
    try {
        console.log('🧪 Testing encryption/decryption...');
        const encrypted = encrypt(testData);
        const decrypted = decrypt(encrypted);
        
        const success = decrypted === testData;
        console.log('🧪 Test result:', {
            success,
            originalLength: testData.length,
            encryptedLength: encrypted.length,
            decryptedLength: decrypted?.length || 0
        });
        
        return success;
    } catch (error) {
        console.error('🧪 Test failed:', error);
        return false;
    }
}

// Utility function to generate a new encryption key
export function generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
}