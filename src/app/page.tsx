"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploader } from "@/components/file-uploader";
import { AuthModal } from "@/components/auth-modal";
import { Skeleton } from "@/components/ui/skeleton";

const AUTH_KEY = "pakde-dosen-auth-v1";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    // Check for auth status in localStorage only on the client
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
    // Show a loading/skeleton state while checking auth
    return (
        <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-2xl">
              <Card className="shadow-lg border-2">
                <CardHeader className="text-center">
                  <Skeleton className="h-8 w-3/4 mx-auto" />
                  <Skeleton className="h-6 w-1/2 mx-auto mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-48 w-full" />
                </CardContent>
              </Card>
            </div>
        </main>
    )
  }

  if (!isAuthenticated) {
    return <AuthModal open={!isAuthenticated} onAuthenticated={handleAuthenticated} />;
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-lg border-2">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold font-headline text-primary">Pakde Dosen Uploader</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Upload your photos, videos, and documents with ease.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploader />
          </CardContent>
        </Card>
        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>Built with love for all the lecturers out there.</p>
        </footer>
      </div>
    </main>
  );
}
