"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MoreHorizontal, Folder, File, FileImage, FileVideo, FileText, Link as LinkIcon, Trash2, Loader2 } from "lucide-react";
import type { S3Item } from "@/app/actions";
import { deleteItem, getShareableLink } from "@/app/actions";
import { format } from "date-fns";
import { PreviewModal } from "@/components/preview-modal";

interface FileDataTableProps {
  data: S3Item[];
  onActionSuccess: () => void;
}

const getFileIcon = (item: S3Item) => {
    if (item.isFolder) {
      return <Folder className="w-5 h-5 text-primary" />;
    }
    const type = item.type.split('/')[0];
    if (type === 'image') return <FileImage className="w-5 h-5 text-blue-500" />;
    if (type === 'video') return <FileVideo className="w-5 h-5 text-purple-500" />;
    if (item.type === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
};


export function FileDataTable({ data, onActionSuccess }: FileDataTableProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isLinking, setIsLinking] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<S3Item | null>(null);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<S3Item | null>(null);

    const handleDeleteClick = (item: S3Item) => {
        setItemToDelete(item);
        setDeleteAlertOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        
        setIsDeleting(itemToDelete.path);
        const result = await deleteItem(itemToDelete.path, itemToDelete.isFolder);
        if (result.success) {
            toast({ title: "Success", description: `"${itemToDelete.name}" was deleted.` });
            onActionSuccess();
        } else {
            toast({ title: "Error", description: result.failure, variant: "destructive" });
        }
        setIsDeleting(null);
        setItemToDelete(null);
        setDeleteAlertOpen(false);
    };

    const handleGetLink = async (item: S3Item) => {
        setIsLinking(item.path);
        if (item.isFolder) {
            toast({ title: "Not supported", description: "Cannot create a shareable link for a folder.", variant: "destructive" });
            setIsLinking(null);
            return;
        }

        const result = await getShareableLink(item.path);
        if (result.success) {
            await navigator.clipboard.writeText(result.success.url);
            toast({ title: "Link Copied", description: "Shareable link has been copied to your clipboard." });
        } else {
            toast({ title: "Error", description: result.failure, variant: "destructive" });
        }
        setIsLinking(null);
    };

    const handleRowClick = async (item: S3Item) => {
        if (item.isFolder) {
            const pathSegments = item.path.replace('pakde-dosen/', '').replace(/\/$/, '');
            router.push(`/files/${pathSegments}`);
        } else {
            const result = await getShareableLink(item.path);
            if (result.success) {
                setSelectedFile({ ...item, url: result.success.url });
            } else {
                toast({ title: "Error", description: "Could not load file preview.", variant: "destructive"});
            }
        }
    };

    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Last modified</TableHead>
              <TableHead className="hidden md:table-cell">File size</TableHead>
              <TableHead className="w-[50px]">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((item) => (
                <TableRow 
                    key={item.path} 
                    className="cursor-pointer"
                    onClick={() => handleRowClick(item)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                        {getFileIcon(item)}
                        <span className="font-medium truncate">{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {item.lastModified.getFullYear() > 1970 ? format(item.lastModified, "PPp") : "-"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{item.isFolder ? "-" : formatBytes(item.size)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        {!item.isFolder && (
                            <DropdownMenuItem onClick={() => handleGetLink(item)} disabled={isLinking === item.path}>
                                {isLinking === item.path ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                                Get link
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDeleteClick(item)} className="text-destructive focus:text-destructive">
                           {isDeleting === item.path ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  This folder is empty.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {selectedFile && (
          <PreviewModal
              file={selectedFile}
              open={!!selectedFile}
              onOpenChange={(isOpen) => {
                  if (!isOpen) setSelectedFile(null);
              }}
              onDelete={() => {
                setSelectedFile(null);
                onActionSuccess();
              }}
          />
      )}

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete "{itemToDelete?.name}"
                      {itemToDelete?.isFolder && " and all its contents"}.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmDelete} disabled={!!isDeleting}>
                      {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Continue
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
