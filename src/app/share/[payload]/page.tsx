
import { redirect } from 'next/navigation';
import { decrypt } from '@/lib/crypto';
import { getShareableLink } from '@/app/actions';
import { AlertCircle, Clock } from 'lucide-react';

export const runtime = 'nodejs'; // Force Node.js runtime for crypto module compatibility

interface SharePageProps {
  params: {
    payload: string;
  };
}

const MessageScreen = ({ title, message, icon: Icon }: { title: string, message: string, icon: React.ElementType }) => {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-8 text-center text-card-foreground shadow-sm">
                <Icon className="h-12 w-12 text-primary" />
                <h1 className="text-2xl font-semibold">{title}</h1>
                <p className="text-muted-foreground">{message}</p>
            </div>
        </main>
    );
};


export default async function SharePage({ params }: SharePageProps) {
  const { payload } = params;

  if (!payload) {
    return <MessageScreen title="Invalid Link" message="The share link is missing required information." icon={AlertCircle} />;
  }
  
  const decryptedPayload = decrypt(payload);

  if (!decryptedPayload) {
    return <MessageScreen title="Invalid Link" message="This share link is either invalid or has been tampered with." icon={AlertCircle} />;
  }

  try {
    const { path, expiresAt } = JSON.parse(decryptedPayload);

    if (Date.now() > expiresAt) {
        return <MessageScreen title="Link Expired" message="This share link has expired and is no longer valid." icon={Clock} />;
    }

    // Generate a short-lived presigned URL for the actual redirect (5 minutes).
    const result = await getShareableLink(path, 300);

    if (result.success) {
      redirect(result.success.url);
    } else {
        return <MessageScreen title="File Not Found" message={result.failure || "The requested file could not be found."} icon={AlertCircle} />;
    }
  } catch (error) {
    return <MessageScreen title="Invalid Link" message="Could not process the share link." icon={AlertCircle} />;
  }
}
