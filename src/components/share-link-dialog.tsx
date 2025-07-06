"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createMaskedShareableLink, S3Item } from "@/app/actions";
import { Loader2, Copy, Check, AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ShareLinkDialogProps {
  item: S3Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const expirationOptions = [
    { label: "1 Hour", value: 3600 },
    { label: "3 Hours", value: 10800 },
    { label: "6 Hours", value: 21600 },
    { label: "12 Hours", value: 43200 },
    { label: "1 Day", value: 86400 },
    { label: "2 Days", value: 172800 },
    { label: "3 Days", value: 259200 },
    { label: "4 Days", value: 345600 },
    { label: "5 Days", value: 432000 },
    { label: "6 Days", value: 518400 },
    { label: "7 Days", value: 604800 },
];

export function ShareLinkDialog({ item, open, onOpenChange }: ShareLinkDialogProps) {
    const [expiration, setExpiration] = useState(expirationOptions[0].value);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        // Reset state when a new item is selected or dialog is closed
        if (!open || !item) {
            setTimeout(() => {
                setGeneratedUrl(null);
                setIsLoading(false);
                setExpiration(expirationOptions[0].value);
                setIsCopied(false);
                setError(null);
            }, 200);
        }
    }, [open, item]);

    const handleCreateLink = async () => {
        if (!item) return;

        setIsLoading(true);
        setGeneratedUrl(null);
        setIsCopied(false);
        setError(null);
        
        try {
            const result = await createMaskedShareableLink(item.path, expiration);
            
            if (result.success) {
                setGeneratedUrl(result.success.url);
                toast({ 
                    title: "Link Created", 
                    description: "Shareable link has been generated successfully." 
                });
            } else {
                setError(result.failure || "Unknown error occurred");
                toast({
                    title: "Error Creating Link",
                    description: result.failure,
                    variant: "destructive",
                });
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
            setError(errorMessage);
            toast({
                title: "Error Creating Link",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!generatedUrl) return;
        
        try {
            await navigator.clipboard.writeText(generatedUrl);
            setIsCopied(true);
            toast({ 
                title: "Link Copied", 
                description: "The shareable link has been copied to your clipboard." 
            });
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            toast({
                title: "Copy Failed",
                description: "Failed to copy link to clipboard. Please copy manually.",
                variant: "destructive",
            });
        }
    };

    const isConfigurationError = error && (
        error.includes('environment') || 
        error.includes('configuration') || 
        error.includes('NEXT_PUBLIC_APP_URL') ||
        error.includes('URL_ENCRYPTION_SECRET')
    );

    if (!item) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Shareable Link</DialogTitle>
                    <DialogDescription>
                        Generate a temporary link to share "<span className="font-semibold truncate">{item.name}</span>". This link will expire.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="expiration">Link Expiration</Label>
                        <Select
                            value={String(expiration)}
                            onValueChange={(value) => setExpiration(Number(value))}
                            disabled={!!generatedUrl || isLoading}
                        >
                            <SelectTrigger id="expiration">
                                <SelectValue placeholder="Select expiration time" />
                            </SelectTrigger>
                            <SelectContent>
                                {expirationOptions.map((option) => (
                                    <SelectItem key={option.value} value={String(option.value)}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {error && (
                        <Alert variant={isConfigurationError ? "destructive" : "default"}>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                                <div className="font-medium mb-1">Error:</div>
                                <div>{error}</div>
                                {isConfigurationError && (
                                    <div className="mt-2 text-xs opacity-90">
                                        This appears to be a server configuration issue. Please contact the administrator.
                                    </div>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}
                    
                    {generatedUrl && (
                        <div className="space-y-2">
                            <Label htmlFor="share-link">Shareable Link</Label>
                            <div className="flex items-center space-x-2">
                                <Input 
                                    id="share-link" 
                                    value={generatedUrl} 
                                    readOnly 
                                    className="text-xs font-mono" 
                                />
                                <Button 
                                    type="button" 
                                    size="icon" 
                                    onClick={handleCopy} 
                                    disabled={isCopied}
                                    variant={isCopied ? "default" : "outline"}
                                >
                                    {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    <span className="sr-only">Copy link</span>
                                </Button>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                This link will expire on {new Date(Date.now() + expiration * 1000).toLocaleString()}
                            </div>
                        </div>
                    )}
                </div>
                
                <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between items-center gap-2">
                    {!generatedUrl ? (
                        <>
                            <Button 
                                variant="outline" 
                                onClick={() => onOpenChange(false)} 
                                className="w-full sm:w-auto"
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleCreateLink} 
                                disabled={isLoading} 
                                className="w-full sm:w-auto"
                            >
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isLoading ? "Creating..." : "Create Link"}
                            </Button>
                        </>
                    ) : (
                        <Button onClick={() => onOpenChange(false)} className="w-full">
                            Done
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}