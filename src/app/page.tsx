"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploader } from "@/components/file-uploader";
import { AuthModal } from "@/components/auth-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { FileGallery } from "@/components/file-gallery";
import { listFiles, S3File } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const AUTH_KEY = "pakde-dosen-auth-v1";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [galleryFiles, setGalleryFiles] = useState<S3File[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const { toast } = useToast();

  const fetchFiles = useCallback(async () => {
    setIsLoadingFiles(true);
    const result = await listFiles();
    if (result.success) {
      setGalleryFiles(result.success);
    } else {
      toast({
        title: "Error fetching files",
        description: result.failure,
        variant: "destructive",
      });
      setGalleryFiles([]);
    }
    setIsLoadingFiles(false);
  }, [toast]);

  useEffect(() => {
    // Check for auth status in localStorage only on the client
    const authStatus = localStorage.getItem(AUTH_KEY);
    if (authStatus === "true") {
      setIsAuthenticated(true);
      fetchFiles();
    }
    setIsAuthChecked(true);
  }, [fetchFiles]);

  const handleAuthenticated = () => {
    localStorage.setItem(AUTH_KEY, "true");
    setIsAuthenticated(true);
    fetchFiles();
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
    <main className="flex min-h-screen w-full flex-col items-center bg-background p-4 md:p-8">
      <div className="w-full max-w-6xl">
        <Card className="shadow-lg border-2">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold font-headline text-primary">Pakde Dosen Uploader</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Upload your photos, videos, and documents with ease.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploader onUploadSuccess={fetchFiles} />
          </CardContent>
        </Card>
        
        <Separator className="my-8" />
        
        <FileGallery files={galleryFiles} isLoading={isLoadingFiles} />
        
        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>Built with love for all the lecturers out there.</p>
        </footer>
      </div>
    </main>
  );
}
