"use client";

import { useState } from 'react';
import type { S3File } from '@/app/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PreviewModal } from '@/components/preview-modal';
import { FileIcon, FileImage, FileVideo, FileText, Folder, Trash2, Loader2, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { deleteFile } from '@/app/actions';


interface FileGalleryProps {
  files: S3File[];
  isLoading: boolean;
  onRefresh: () => void;
}

const getFileIcon = (fileType: string) => {
    const type = fileType.split('/')[0];
    const extension = fileType.split('/')[1];

    if (type === 'image') {
      return <FileImage className="w-12 h-12 text-primary" />;
    }
    if (type === 'video') {
      return <FileVideo className="w-12 h-12 text-primary" />;
    }
    if (extension === 'pdf' || type === 'text') {
      return <FileText className="w-12 h-12 text-primary" />;
    }
    return <FileIcon className="w-12 h-12 text-primary" />;
};


export function FileGallery({ files, isLoading, onRefresh }: FileGalleryProps) {
  const [selectedFile, setSelectedFile] = useState<S3File | null>(null);
  const [selectedForDelete, setSelectedForDelete] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const isSelectionMode = selectedForDelete.length > 0;

  const handleToggleSelection = (path: string) => {
    setSelectedForDelete(prev => 
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    const results = await Promise.all(
      selectedForDelete.map(path => deleteFile(path))
    );
    
    const failedDeletions = results.filter(r => r.failure);

    if (failedDeletions.length > 0) {
      toast({
        title: "Error deleting files",
        description: `Could not delete ${failedDeletions.length} file(s). Please try again.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Files Deleted",
        description: `Successfully deleted ${selectedForDelete.length} file(s).`,
      });
    }

    setIsDeleting(false);
    setSelectedForDelete([]);
    onRefresh();
  };

  const handleCardClick = (file: S3File) => {
    if (isSelectionMode) {
      handleToggleSelection(file.path);
    } else {
      setSelectedFile(file);
    }
  };

  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4 text-center sm:text-left">Uploaded Files</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex flex-col items-center justify-center aspect-square">
                <Skeleton className="w-12 h-12 rounded-lg" />
              </CardContent>
              <div className="p-3 pt-0 space-y-2">
                <Skeleton className="w-full h-4" />
                <Skeleton className="w-3/4 h-3" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12 rounded-lg border-2 border-dashed">
        <h2 className="text-2xl font-bold mb-4">Uploaded Files</h2>
        <p className="text-muted-foreground">No files uploaded yet. Upload a file to see it here.</p>
      </div>
    );
  }

  return (
    <div>
      <div className={cn(
        "flex items-center justify-between p-3 mb-4 rounded-lg bg-card border sticky top-4 z-20 shadow-md",
        "transition-all duration-300 ease-in-out",
        isSelectionMode ? 'h-auto opacity-100' : 'h-0 opacity-0 overflow-hidden p-0 border-0 mb-0 shadow-none'
      )}>
        <Button variant="ghost" size="icon" onClick={() => setSelectedForDelete([])}>
          <X className="h-5 w-5" />
          <span className="sr-only">Cancel selection</span>
        </Button>
        <div className="font-medium">{selectedForDelete.length} selected</div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the {selectedForDelete.length} selected file(s).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSelected} disabled={isDeleting}>
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <h2 className="text-2xl font-bold mb-4 text-center sm:text-left">Uploaded Files</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {files.map((file) => (
          <Card
              key={file.path}
              className={cn(
                "relative overflow-hidden cursor-pointer hover:border-primary transition-colors group",
                selectedForDelete.includes(file.path) && "border-primary border-2"
              )}
              onClick={() => handleCardClick(file)}
          >
              <div className={cn(
                  "absolute top-2 right-2 z-10 transition-opacity",
                  !isSelectionMode && "opacity-0 group-hover:opacity-100"
              )}>
                  <Checkbox
                      checked={selectedForDelete.includes(file.path)}
                      onCheckedChange={() => handleToggleSelection(file.path)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-5 h-5 bg-background"
                      aria-label={`Select file ${file.name}`}
                  />
              </div>
              <CardContent className="p-0 flex flex-col items-center justify-center aspect-square bg-muted/30">
                  {getFileIcon(file.type)}
              </CardContent>
              <div className="p-3">
                  <p className="text-sm font-medium truncate group-hover:text-primary" title={file.name}>{file.name}</p>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <Folder className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate" title={file.path.substring(0, file.path.lastIndexOf('/'))}>{file.path.substring(0, file.path.lastIndexOf('/'))}</span>
                  </div>
              </div>
          </Card>
        ))}
      </div>
      {selectedFile && (
          <PreviewModal
              file={selectedFile}
              open={!!selectedFile}
              onOpenChange={(isOpen) => {
                  if (!isOpen) {
                      setSelectedFile(null);
                  }
              }}
              onDelete={() => {
                setSelectedFile(null);
                onRefresh();
              }}
          />
      )}
    </div>
  );
}
