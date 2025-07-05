"use client";

import { useState } from 'react';
import type { S3File } from '@/app/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PreviewModal } from '@/components/preview-modal';
import { FileIcon, FileImage, FileVideo, FileText, Folder } from 'lucide-react';

interface FileGalleryProps {
  files: S3File[];
  isLoading: boolean;
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


export function FileGallery({ files, isLoading }: FileGalleryProps) {
  const [selectedFile, setSelectedFile] = useState<S3File | null>(null);

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
        <h2 className="text-2xl font-bold mb-4 text-center sm:text-left">Uploaded Files</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {files.map((file) => (
                <Card
                    key={file.path}
                    className="overflow-hidden cursor-pointer hover:border-primary transition-colors group"
                    onClick={() => setSelectedFile(file)}
                >
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
            />
        )}
    </div>
  );
}
