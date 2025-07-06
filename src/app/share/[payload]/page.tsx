import { redirect } from 'next/navigation';
import { decrypt } from '@/lib/crypto';
import { getShareableLink } from '@/app/actions';
import { AlertCircle, Clock } from 'lucide-react';

export const runtime = 'nodejs';

interface SharePageProps {
  params: {
    payload: string;
  };
}

const MessageScreen = ({ 
  title, 
  message, 
  icon: Icon, 
  debugInfo
}: { 
  title: string; 
  message: string; 
  icon: React.ElementType;
  debugInfo?: Record<string, any>;
}) => {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-8 text-center text-card-foreground shadow-sm max-w-md">
                <Icon className="h-12 w-12 text-primary" />
                <h1 className="text-2xl font-semibold">{title}</h1>
                <p className="text-muted-foreground">{message}</p>
                {debugInfo && process.env.NODE_ENV === 'development' && (
                    <details className="w-full mt-4">
                        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                            🐛 Debug Info (dev only)
                        </summary>
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-48 text-left">
                            {JSON.stringify(debugInfo, null, 2)}
                        </pre>
                    </details>
                )}
            </div>
        </main>
    );
};

export default async function SharePage({ params }: SharePageProps) {
  const { payload } = params;

  if (!payload) {
    return (
      <MessageScreen 
        title="Invalid Link" 
        message="The share link is missing required information." 
        icon={AlertCircle}
      />
    );
  }

  // Decrypt the payload
  const decryptedPayload = decrypt(payload);

  if (!decryptedPayload) {
    return (
      <MessageScreen 
        title="Invalid or Expired Link" 
        message="This share link is either invalid, has been tampered with, or was created with a different server key." 
        icon={AlertCircle}
        debugInfo={{
            payloadReceived: payload.substring(0, 50) + '...',
            payloadLength: payload.length,
            note: "Decryption returned null."
        }}
      />
    );
  }

  // Parse the decrypted JSON
  let linkData: { path: string; expiresAt: number };
  try {
    linkData = JSON.parse(decryptedPayload);
    if (!linkData.path || !linkData.expiresAt) {
      throw new Error("Parsed data is missing required fields 'path' or 'expiresAt'.");
    }
  } catch (error) {
    return (
      <MessageScreen 
        title="Link Data Corrupted" 
        message="Could not process the information from the share link." 
        icon={AlertCircle}
        debugInfo={{
          decryptedPayload: decryptedPayload,
          parseError: error instanceof Error ? error.message : String(error)
        }}
      />
    );
  }

  // Check expiration
  const now = Date.now();
  if (now > linkData.expiresAt) {
    return (
      <MessageScreen 
        title="Link Expired" 
        message="This share link has expired and is no longer valid." 
        icon={Clock}
        debugInfo={{
          now: new Date(now).toISOString(),
          expiresAt: new Date(linkData.expiresAt).toISOString(),
        }}
      />
    );
  }

  // Generate presigned URL for actual file access
  try {
    const result = await getShareableLink(linkData.path, 300); // 5 minutes validity for the final S3 link

    if (result.success) {
      redirect(result.success.url);
    } else {
      return (
        <MessageScreen 
          title="File Not Found" 
          message={result.failure || "The requested file could not be found or accessed on the server."} 
          icon={AlertCircle}
          debugInfo={{
            requestedPath: linkData.path,
            error: result.failure,
          }}
        />
      );
    }
  } catch (error) {
    return (
      <MessageScreen 
        title="Server Error" 
        message="An unexpected error occurred while preparing the file for download." 
        icon={AlertCircle}
        debugInfo={{
          path: linkData.path,
          error: error instanceof Error ? error.message : String(error),
        }}
      />
    );
  }
}
