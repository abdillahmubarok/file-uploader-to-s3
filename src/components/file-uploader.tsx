"use client";

import { useState, useRef, type DragEvent, type ChangeEvent, useEffect, useCallback } from "react";
import {
  UploadCloud,
  File as FileIcon,
  X,
  CheckCircle2,
  FileImage,
  FileVideo,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { getSignedURL } from "@/app/actions";
import { cn } from "@/lib/utils";

type UploadedFile = {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  source?: XMLHttpRequest;
};

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith("image/")) {
    return <FileImage className="w-8 h-8 text-primary" />;
  }
  if (fileType.startsWith("video/")) {
    return <FileVideo className="w-8 h-8 text-primary" />;
  }
  if (fileType.startsWith("text/") || fileType === 'application/pdf') {
    return <FileText className="w-8 h-8 text-primary" />;
  }
  return <FileIcon className="w-8 h-8 text-primary" />;
};

export function FileUploader({ onUploadSuccess, uploadPath = "" }: { onUploadSuccess?: () => void, uploadPath?: string }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    
    const newFiles = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: "pending" as const,
    }));
    
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  }, []);

  const onFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    if(e.target) e.target.value = '';
  };
  
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };
  
  const uploadFile = async (uploadedFile: UploadedFile) => {
    const { file } = uploadedFile;
    setFiles((prev) =>
      prev.map((f) => (f.id === uploadedFile.id ? { ...f, status: "uploading" } : f))
    );

    const signedURLResult = await getSignedURL({
      name: file.name,
      type: file.type,
      size: file.size,
    }, uploadPath);

    if (signedURLResult.failure) {
      toast({
        title: "Upload Failed",
        description: signedURLResult.failure,
        variant: "destructive",
      });
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id ? { ...f, status: "error" } : f
        )
      );
      return;
    }

    const { url, fields } = signedURLResult.success;
    
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, value as string);
    });
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    
    setFiles(prev => {
        const newFiles = [...prev];
        const currentFile = newFiles.find(f => f.id === uploadedFile.id);
        if (currentFile) {
            currentFile.source = xhr;
        }
        return newFiles;
    });

    xhr.open("POST", url, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        setFiles((prev) =>
          prev.map((f) => (f.id === uploadedFile.id ? { ...f, progress } : f))
        );
      }
    };

    const handleUploadError = () => {
        setFiles((prev) =>
          prev.map((f) => (f.id === uploadedFile.id ? { ...f, status: "error" } : f))
        );
        toast({
          title: "Upload Failed",
          description: `There was an error uploading ${file.name}.`,
          variant: "destructive",
        });
      };
      
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setFiles((prev) =>
          prev.map((f) => (f.id === uploadedFile.id ? { ...f, status: "success", progress: 100 } : f))
        );
        onUploadSuccess?.();
      } else {
        handleUploadError();
      }
    };

    xhr.onerror = () => {
      handleUploadError();
    };

    xhr.send(formData);
  };
  
  const handleUploadAll = () => {
    files.forEach(f => {
      if (f.status === 'pending') {
        uploadFile(f);
      }
    });
  };

  const removeFile = (fileToRemove: UploadedFile) => {
    fileToRemove.source?.abort();
    setFiles((prevFiles) =>
      prevFiles.filter((f) => f.id !== fileToRemove.id)
    );
  };

  const clearAllFiles = () => {
    files.forEach(f => f.source?.abort());
    setFiles([]);
  };

  useEffect(() => {
    const isUploading = files.some((f) => f.status === "uploading");

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    if (isUploading) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    } else {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [files]);
  
  const hasPendingFiles = files.some(f => f.status === 'pending');
  const isUploading = files.some(f => f.status === 'uploading');

  return (
    <div className="w-full">
      <div
        className={cn(
          "border-2 border-dashed border-muted-foreground/50 rounded-lg p-8 w-full text-center cursor-pointer transition-colors duration-300",
          isDragging ? "bg-accent/20 border-primary" : "hover:bg-accent/10"
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} onChange={onFileSelect} type="file" multiple className="hidden"/>
        <div className="flex flex-col items-center gap-4 text-muted-foreground pointer-events-none">
          <UploadCloud className="w-16 h-16 text-primary" />
          <p className="font-semibold text-foreground text-lg">
            Drag & drop files here, or click to select files
          </p>
          <p className="text-sm">
            Any file type is accepted, up to 10GB.
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center gap-4">
                <h3 className="text-lg font-medium text-foreground">Upload Queue ({files.length})</h3>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={clearAllFiles}>Clear All</Button>
                    <Button size="sm" onClick={handleUploadAll} disabled={!hasPendingFiles || isUploading}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                        {isUploading ? "Uploading..." : "Upload All"}
                    </Button>
                </div>
            </div>
          {files.map((uploadedFile) => (
            <div
              key={uploadedFile.id}
              className="bg-background/50 border rounded-lg p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 overflow-hidden">
                {getFileIcon(uploadedFile.file.type)}
                <div className="flex flex-col overflow-hidden">
                    <p className="font-medium text-foreground truncate" title={uploadedFile.file.name}>{uploadedFile.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                        {(uploadedFile.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-grow mx-4">
                {uploadedFile.status === "pending" && (
                  <p className="text-sm text-muted-foreground">Pending upload</p>
                )}
                {(uploadedFile.status === "uploading" || uploadedFile.status === 'success') && <Progress value={uploadedFile.progress} className="flex-1" />}
                {uploadedFile.status === "error" && (
                    <p className="text-sm text-destructive">Upload failed</p>
                )}
              </div>

              <div className="shrink-0 w-10 h-10 flex items-center justify-center">
                {uploadedFile.status !== "success" && (
                  <Button variant="ghost" size="icon" onClick={() => removeFile(uploadedFile)}>
                    <X className="h-5 w-5" />
                    <span className="sr-only">Remove file</span>
                  </Button>
                )}
                {uploadedFile.status === "success" && <CheckCircle2 className="h-6 w-6 text-green-600" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
