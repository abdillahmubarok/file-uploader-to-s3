import { redirect } from 'next/navigation';
import { decrypt } from '@/lib/crypto';
import { getShareableLink } from '@/app/actions';
import { AlertCircle, Clock, LinkIcon, Bug } from 'lucide-react';

export const runtime = 'nodejs'; // Force Node.js runtime for crypto module compatibility

interface SharePageProps {
  params: {
    payload: string;
  };
}

const MessageScreen = ({ 
  title, 
  message, 
  icon: Icon, 
  debug 
}: { 
  title: string; 
  message: string; 
  icon: React.ElementType;
  debug?: string;
}) => {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-8 text-center text-card-foreground shadow-sm max-w-md">
                <Icon className="h-12 w-12 text-primary" />
                <h1 className="text-2xl font-semibold">{title}</h1>
                <p className="text-muted-foreground">{message}</p>
                {debug && process.env.NODE_ENV === 'development' && (
                    <details className="w-full mt-4">
                        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                            🐛 Debug Info (dev only)
                        </summary>
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                            {debug}
                        </pre>
                    </details>
                )}
            </div>
        </main>
    );
};

function sanitizePayload(payload: string): string {
    // Handle URL encoding issues
    let sanitized = payload;
    
    // Decode URL encoding if present
    try {
        sanitized = decodeURIComponent(sanitized);
    } catch (e) {
        // If decoding fails, use original
    }
    
    // Replace URL-safe characters that might have been corrupted
    sanitized = sanitized
        .replace(/\s/g, '+') // Replace spaces with +
        .replace(/-/g, '+')  // Replace - with + (base64url to base64)
        .replace(/_/g, '/'); // Replace _ with / (base64url to base64)
    
    return sanitized;
}

export default async function SharePage({ params }: SharePageProps) {
  const { payload: rawPayload } = params;

  console.log('🔗 Share page accessed:', {
    rawPayload: rawPayload?.substring(0, 50) + '...',
    payloadLength: rawPayload?.length,
    hasPayload: !!rawPayload
  });

  if (!rawPayload) {
    return (
      <MessageScreen 
        title="Invalid Link" 
        message="The share link is missing required information." 
        icon={AlertCircle}
      />
    );
  }

  // Sanitize payload
  const sanitizedPayload = sanitizePayload(rawPayload);
  
  console.log('🧹 Payload sanitization:', {
    original: rawPayload.substring(0, 50) + '...',
    sanitized: sanitizedPayload.substring(0, 50) + '...',
    lengthChanged: rawPayload.length !== sanitizedPayload.length
  });

  // Try to decrypt
  let decryptedPayload: string | null = null;
  let decryptionError: string | null = null;
  
  try {
    console.log('🔓 Attempting to decrypt payload...');
    decryptedPayload = decrypt(sanitizedPayload);
    
    if (!decryptedPayload) {
      // Try with original payload if sanitized failed
      console.log('🔄 Trying with original payload...');
      decryptedPayload = decrypt(rawPayload);
    }
    
    console.log('🔓 Decryption result:', {
      success: !!decryptedPayload,
      decryptedLength: decryptedPayload?.length || 0
    });
    
  } catch (error) {
    decryptionError = error instanceof Error ? error.message : 'Unknown decryption error';
    console.error('❌ Decryption failed:', decryptionError);
  }

  if (!decryptedPayload) {
    const debugInfo = JSON.stringify({
      payloadLength: rawPayload.length,
      sanitizedLength: sanitizedPayload.length,
      firstChars: rawPayload.substring(0, 20),
      lastChars: rawPayload.substring(rawPayload.length - 20),
      decryptionError,
      nodeEnv: process.env.NODE_ENV
    }, null, 2);

    return (
      <MessageScreen 
        title="Invalid Link" 
        message="This share link is either invalid, corrupted, or has been tampered with." 
        icon={AlertCircle}
        debug={debugInfo}
      />
    );
  }

  // Try to parse JSON
  let linkData: { path: string; expiresAt: number } | null = null;
  let parseError: string | null = null;

  try {
    console.log('📋 Parsing decrypted payload...');
    linkData = JSON.parse(decryptedPayload);
    console.log('📋 Parsed data:', {
      hasPath: !!linkData?.path,
      hasExpiresAt: !!linkData?.expiresAt,
      expiresAt: linkData?.expiresAt ? new Date(linkData.expiresAt).toISOString() : 'N/A'
    });
  } catch (error) {
    parseError = error instanceof Error ? error.message : 'JSON parse error';
    console.error('❌ JSON parsing failed:', parseError);
  }

  if (!linkData || !linkData.path || !linkData.expiresAt) {
    const debugInfo = JSON.stringify({
      decryptedPayload: decryptedPayload.substring(0, 100),
      parseError,
      linkData,
      nodeEnv: process.env.NODE_ENV
    }, null, 2);

    return (
      <MessageScreen 
        title="Invalid Link" 
        message="Could not process the share link data." 
        icon={AlertCircle}
        debug={debugInfo}
      />
    );
  }

  // Check expiration
  const now = Date.now();
  if (now > linkData.expiresAt) {
    console.log('⏰ Link expired:', {
      now: new Date(now).toISOString(),
      expiresAt: new Date(linkData.expiresAt).toISOString(),
      expiredBy: now - linkData.expiresAt
    });

    return (
      <MessageScreen 
        title="Link Expired" 
        message="This share link has expired and is no longer valid." 
        icon={Clock}
      />
    );
  }

  // Generate presigned URL for actual file access
  console.log('🔗 Generating presigned URL for path:', linkData.path);
  
  try {
    const result = await getShareableLink(linkData.path, 300); // 5 minutes

    if (result.success) {
      console.log('✅ Presigned URL generated, redirecting...');
      redirect(result.success.url);
    } else {
      console.error('❌ Failed to generate presigned URL:', result.failure);
      
      const debugInfo = JSON.stringify({
        path: linkData.path,
        error: result.failure,
        nodeEnv: process.env.NODE_ENV
      }, null, 2);

      return (
        <MessageScreen 
          title="File Not Found" 
          message={result.failure || "The requested file could not be found or accessed."} 
          icon={AlertCircle}
          debug={debugInfo}
        />
      );
    }
  } catch (error) {
    console.error('❌ Error in getShareableLink:', error);
    
    const debugInfo = JSON.stringify({
      path: linkData.path,
      error: error instanceof Error ? error.message : 'Unknown error',
      nodeEnv: process.env.NODE_ENV
    }, null, 2);

    return (
      <MessageScreen 
        title="Server Error" 
        message="An error occurred while processing the share link." 
        icon={AlertCircle}
        debug={debugInfo}
      />
    );
  }
}