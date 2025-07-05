import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploader } from "@/components/file-uploader";

export default function Home() {
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
