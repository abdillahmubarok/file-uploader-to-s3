"use client";

import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import {
  UploadCloud,
  File as FileIcon,
  X,
  CheckCircle2,
  FileImage,
  FileVideo,
  FileText,
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
  if (fileType.startsWith("text/")) {
    return <FileText className="w-8 h-8 text-primary" />;
  }
  return <FileIcon className="w-8 h-8 text-primary" />;
};

export function FileUploader() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    
    const newFiles = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: "pending" as const,
    }));
    
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    newFiles.forEach(uploadFile);
  };

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
    });

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
    const newFiles = [...files];
    const currentFile = newFiles.find(f => f.id === uploadedFile.id);
    if (currentFile) {
        currentFile.source = xhr;
    }
    setFiles(newFiles);

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
        toast({
            title: "Upload Successful",
            description: `${file.name} has been uploaded.`,
          });
      } else {
        handleUploadError();
      }
    };

    xhr.onerror = () => {
      handleUploadError();
    };

    xhr.send(formData);
  };

  const cancelUpload = (fileToCancel: UploadedFile) => {
    fileToCancel.source?.abort();
    setFiles((prevFiles) =>
      prevFiles.filter((f) => f.id !== fileToCancel.id)
    );
  };

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
          <p className="font-semibold text-foreground">
            Drag & drop files here, or click to select files
          </p>
          <p className="text-sm">
            Any file type is accepted, up to 10GB.
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-foreground">Uploads</h3>
                <Button variant="link" size="sm" onClick={() => {
                  files.forEach(f => f.source?.abort());
                  setFiles([]);
                }}>Clear All</Button>
            </div>
          {files.map((uploadedFile) => (
            <div
              key={uploadedFile.id}
              className="bg-card border rounded-lg p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 overflow-hidden">
                {getFileIcon(uploadedFile.file.type)}
                <div className="flex flex-col overflow-hidden">
                    <p className="font-medium text-foreground truncate">{uploadedFile.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                        {(uploadedFile.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-grow mx-4">
                {(uploadedFile.status === "uploading" || uploadedFile.status === 'success') && <Progress value={uploadedFile.progress} className="flex-1" />}
              </div>

              <div className="shrink-0 w-10 h-10 flex items-center justify-center">
                {uploadedFile.status === "uploading" && (
                  <Button variant="ghost" size="icon" onClick={() => cancelUpload(uploadedFile)}>
                    <X className="h-5 w-5" />
                  </Button>
                )}
                {uploadedFile.status === "success" && <CheckCircle2 className="h-6 w-6 text-green-600" />}
                {uploadedFile.status === "error" && (
                   <Button variant="ghost" size="icon" onClick={() => cancelUpload(uploadedFile)}>
                      <X className="h-5 w-5 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
