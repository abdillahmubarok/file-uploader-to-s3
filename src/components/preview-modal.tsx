
"use client";

import { useState } from "react";
import type { S3Item } from "@/app/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Loader2, Trash2, FileText } from "lucide-react";
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

  const renderContent = () => {
    if (fileType === 'image') {
      return <img src={fileUrl} alt={file.name} className="max-w-full max-h-full object-contain" />;
    }
    if (fileType === 'video') {
      return <video controls autoPlay src={fileUrl} className="w-full max-h-full object-contain" />;
    }
    
    // Fallback for PDFs and other document types
    return (
      <div className="text-center p-6 flex flex-col items-center justify-center h-full bg-background sm:bg-muted sm:rounded-lg">
        <FileText className="w-20 h-20 text-muted-foreground mb-4" />
        <p className="text-xl font-semibold mb-2">No preview available</p>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs sm:max-w-sm truncate" title={file.name}>{file.name}</p>
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
      <DialogContent className="sm:max-w-6xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col p-0 sm:p-4 data-[state=open]:sm:animate-in data-[state=closed]:sm:animate-out sm:rounded-lg">
        <DialogHeader className="p-4 border-b sm:p-2 sm:border-0">
          <DialogTitle className="truncate pr-10 sm:pr-12">{file.name}</DialogTitle>
          <DialogDescription className="truncate">{file.path}</DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow flex items-center justify-center overflow-auto bg-background sm:bg-black/10 sm:dark:bg-black/40 sm:rounded-md">
            {renderContent()}
        </div>
        
        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between p-4 border-t gap-2 sm:p-2 sm:border-0">
            <div className="flex items-center gap-2">
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeleting} className="w-full justify-center sm:w-auto">
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
                <Button variant="ghost" asChild className="w-full justify-center sm:w-auto">
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    <span>New Tab</span>
                </a>
                </Button>
            </div>
            <Button asChild className="w-full justify-center sm:w-auto">
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
