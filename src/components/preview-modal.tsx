"use client";

import type { S3File } from "@/app/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";

interface PreviewModalProps {
  file: S3File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PreviewModal({ file, open, onOpenChange }: PreviewModalProps) {
  if (!file) {
    return null;
  }

  const fileType = file.type.split('/')[0];
  const isPdf = file.type === 'application/pdf';

  const renderContent = () => {
    if (fileType === 'image') {
      return <img src={file.url} alt={file.name} className="max-w-full max-h-[75vh] object-contain mx-auto" />;
    }
    if (fileType === 'video') {
      return <video controls autoPlay src={file.url} className="w-full max-h-[75vh]" />;
    }
    if (isPdf) {
      return <iframe src={file.url} className="w-full h-[75vh] border-0" title={file.name} />;
    }
    return (
      <div className="text-center py-10 bg-muted rounded-lg">
        <p className="text-lg font-semibold">No preview available for this file type.</p>
        <p className="text-muted-foreground mb-4">{file.name}</p>
        <Button asChild>
          <a href={file.url} download={file.name}>
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
        <DialogFooter className="!justify-between flex-row pt-4 border-t">
          <Button variant="ghost" asChild>
            <a href={file.url} target="_blank" rel="noopener noreferrer">
              Open in New Tab
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button asChild>
            <a href={file.url} download={file.name}>
                <Download className="mr-2 h-4 w-4" />
                Download
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
