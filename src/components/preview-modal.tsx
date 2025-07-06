"use client";

import { useState } from "react";
import type { S3Item } from "@/app/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Loader2, Trash2 } from "lucide-react";
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
import { deleteItem } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";


interface PreviewModalProps {
  file: S3Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}

export function PreviewModal({ file, open, onOpenChange, onDelete }: PreviewModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  if (!file) {
    return null;
  }

  const handleDelete = async () => {
    if (!file) return;
    setIsDeleting(true);
    const result = await deleteItem(file.path, file.isFolder);
    if (result.success) {
      toast({
        title: "File Deleted",
        description: `Successfully deleted ${file.name}.`,
      });
      onDelete();
    } else {
      toast({
        title: "Error Deleting File",
        description: result.failure || "An unknown error occurred.",
        variant: "destructive",
      });
    }
    setIsDeleting(false);
  };

  const fileUrl = file.url!;
  const fileType = file.type.split('/')[0];
  const isPdf = file.type === 'application/pdf';

  const renderContent = () => {
    if (fileType === 'image') {
      return <img src={fileUrl} alt={file.name} className="max-w-full max-h-[75vh] object-contain mx-auto" />;
    }
    if (fileType === 'video') {
      return <video controls autoPlay src={fileUrl} className="w-full max-h-[75vh]" />;
    }
    if (isPdf) {
      return <iframe src={fileUrl} className="w-full h-[75vh] border-0" title={file.name} />;
    }
    return (
      <div className="text-center py-10 bg-muted rounded-lg">
        <p className="text-lg font-semibold">No preview available for this file type.</p>
        <p className="text-muted-foreground mb-4">{file.name}</p>
        <Button asChild>
          <a href={fileUrl} download={file.name}>
            <Download className="mr-2 h-4 w-4" />
            Download File
          </a>
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-full h-auto max-h-[90vh] flex flex-col p-2 sm:p-6">
        <DialogHeader>
          <DialogTitle className="truncate pr-12">{file.name}</DialogTitle>
          <DialogDescription className="truncate">{file.path}</DialogDescription>
        </DialogHeader>
        <div className="flex-grow flex items-center justify-center overflow-auto my-4 bg-black/10 dark:bg-black/40 rounded-md">
            {renderContent()}
        </div>
        <DialogFooter className="flex-col sm:flex-row sm:justify-between pt-4 border-t gap-2">
            <div className="flex items-center gap-2">
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeleting} className="w-full sm:w-auto">
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Delete
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the file <span className="font-semibold">{file.name}</span> from the server.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Continue
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
                <Button variant="ghost" asChild>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">New Tab</span>
                </a>
                </Button>
            </div>
            <Button asChild className="w-full sm:w-auto">
                <a href={fileUrl} download={file.name}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                </a>
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
