"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileUploader } from "@/components/file-uploader";
import { AuthModal } from "@/components/auth-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Folder } from "lucide-react";

const AUTH_KEY = "pakde-dosen-auth-v1";

function UploaderPageContent() {
  const searchParams = useSearchParams();
  const uploadPath = searchParams.get('path') || '';

  const PathDisplay = () => {
    const segments = uploadPath ? uploadPath.split('/') : [];
    return (
      <div className="flex items-center gap-2 text-muted-foreground mb-6 text-lg flex-wrap">
        <Folder className="h-6 w-6 text-primary" />
        <span className="font-semibold text-foreground">Home</span>
        {segments.length > 0 && <span className="text-muted-foreground/50">/</span>}
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="truncate max-w-[150px] sm:max-w-none">{decodeURIComponent(segment)}</span>
            {index < segments.length - 1 && <span className="text-muted-foreground/50">/</span>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <main className="container mx-auto flex min-h-[calc(100vh-4rem)] w-full flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl flex flex-col items-center">
        <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold font-headline text-primary tracking-tight">File Uploader</h1>
            <p className="text-lg sm:text-xl text-muted-foreground mt-2">
                Drag and drop your files to upload them securely.
            </p>
        </div>
        
        <div className="w-full bg-card p-4 rounded-lg border-2 border-dashed">
            <PathDisplay />
            <FileUploader uploadPath={uploadPath} onUploadSuccess={() => {}} />
        </div>
        
        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>Made with &#x2665; by <Link href="https://github.com/abdillahmubarok" target="_blank">Muhammad Abdillah Mubarok</Link></p>
        </footer>
      </div>
    </main>
  );
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    const authStatus = localStorage.getItem(AUTH_KEY);
    if (authStatus === "true") {
      setIsAuthenticated(true);
    }
    setIsAuthChecked(true);
  }, []);

  const handleAuthenticated = () => {
    localStorage.setItem(AUTH_KEY, "true");
    setIsAuthenticated(true);
  };

  if (!isAuthChecked) {
    return (
        <main className="container mx-auto flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4">
            <div className="w-full max-w-4xl space-y-4">
              <Skeleton className="h-10 w-1/3 mx-auto" />
              <Skeleton className="h-6 w-1/2 mx-auto" />
              <Skeleton className="h-64 w-full mt-8" />
            </div>
        </main>
    )
  }

  if (!isAuthenticated) {
    return <AuthModal open={!isAuthenticated} onAuthenticated={handleAuthenticated} />;
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UploaderPageContent />
    </Suspense>
  );
}
