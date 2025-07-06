
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from 'next/navigation';
import { listFiles, S3Item, createFolder } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { AuthModal } from "@/components/auth-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FilePlus, FolderPlus } from "lucide-react";
import { FileDataTable } from "@/components/file-data-table";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CreateFolderDialog } from "@/components/create-folder-dialog";

export const runtime = 'nodejs';

const AUTH_KEY = "pakde-dosen-auth-v1";

export default function FilesPage() {
  const params = useParams<{ path?: string[] }>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [items, setItems] = useState<S3Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);

  const { toast } = useToast();
  const currentPath = params.path?.join("/") ?? "";

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    const result = await listFiles(currentPath);
    if (result.success) {
      setItems(result.success);
    } else {
      toast({
        title: "Error fetching files",
        description: result.failure,
        variant: "destructive",
      });
      setItems([]);
    }
    setIsLoading(false);
  }, [currentPath, toast]);

  useEffect(() => {
    const authStatus = localStorage.getItem(AUTH_KEY);
    if (authStatus === "true") {
      setIsAuthenticated(true);
      fetchItems();
    }
    setIsAuthChecked(true);
  }, [fetchItems]);

  const handleAuthenticated = () => {
    localStorage.setItem(AUTH_KEY, "true");
    setIsAuthenticated(true);
    fetchItems();
  };

  const handleCreateFolder = async (folderName: string) => {
    const newFolderPath = `pakde-dosen/${currentPath ? currentPath + "/" : ""}${folderName}/`;
    
    const result = await createFolder(newFolderPath);
    if (result.success) {
        toast({ title: "Folder created", description: `Folder "${folderName}" was created successfully.` });
        fetchItems(); // Refresh the list
    } else {
        toast({ title: "Error", description: result.failure, variant: "destructive" });
    }
    setIsCreateFolderOpen(false);
  };

  if (!isAuthChecked) {
    return (
        <main className="container mx-auto p-4 md:p-8">
            <Skeleton className="h-8 w-1/4 mb-4" />
            <Skeleton className="h-96 w-full" />
        </main>
    );
  }

  if (!isAuthenticated) {
    return <AuthModal open={!isAuthenticated} onAuthenticated={handleAuthenticated} />;
  }

  return (
    <main className="container mx-auto p-4 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <Breadcrumbs path={currentPath} />
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsCreateFolderOpen(true)}>
                    <FolderPlus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Create Folder</span>
                </Button>
                <Button asChild>
                    <Link href={`/?path=${currentPath}`}>
                        <FilePlus className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Upload Files</span>
                    </Link>
                </Button>
            </div>
        </div>

        {isLoading ? (
            <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        ) : (
            <FileDataTable data={items} onActionSuccess={fetchItems} />
        )}
        
        <CreateFolderDialog
            open={isCreateFolderOpen}
            onOpenChange={setIsCreateFolderOpen}
            onCreate={handleCreateFolder}
        />

        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>Made with &#x2665; by <Link href="https://github.com/abdillahmubarok" target="_blank">Muhammad Abdillah Mubarok</Link></p>
        </footer>
    </main>
  );
}
