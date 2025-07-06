
"use server";

import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { S3Client, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand, PutObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { encrypt } from "@/lib/crypto";

export interface S3Item {
    name: string;
    url?: string; // Optional: only present for file previews
    type: string;
    path: string;
    isFolder: boolean;
    size: number;
    lastModified: Date;
}

export async function getSignedURL(file: { name: string; type: string; size: number }, path: string = "") {
  if (!process.env.AWS_BUCKET) {
    return { failure: "AWS_BUCKET environment variable not set." };
  }
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return { failure: "AWS credentials not set in environment variables." };
  }

  const client = new S3Client({
    region: process.env.AWS_DEFAULT_REGION ?? "ap-southeast-3",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const key = `pakde-dosen/${path ? path + '/' : ''}${file.name}`;

  try {
    const { url, fields } = await createPresignedPost(client, {
      Bucket: process.env.AWS_BUCKET,
      Key: key,
      Conditions: [
        ["content-length-range", 0, 10737418240], // 10 GB max
      ],
      Fields: {
        "Content-Type": file.type,
      },
      Expires: 600, // 10 minutes
    });
    return { success: { url, fields, key } };
  } catch (error) {
    console.error("Error creating signed URL:", error);
    return { failure: "Could not get signed URL." };
  }
}

export async function verifyKeyword(keyword: string): Promise<{ success: boolean; error?: string }> {
    if (!process.env.ACCESS_KEYWORD) {
        if (process.env.NODE_ENV === 'development' && keyword === 'UHAMKA1945') {
            return { success: true };
        }
        return { success: false, error: "Access keyword is not configured on the server." };
    }
    if (keyword === process.env.ACCESS_KEYWORD) {
        return { success: true };
    } else {
        return { success: false, error: "Invalid keyword." };
    }
}

export async function listFiles(path: string = ""): Promise<{ success?: S3Item[], failure?: string }> {
    if (!process.env.AWS_BUCKET) {
      return { failure: "AWS_BUCKET environment variable not set." };
    }
    const client = new S3Client({
      region: process.env.AWS_DEFAULT_REGION ?? "ap-southeast-3",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  
    const prefix = `pakde-dosen/${path ? path + '/' : ''}`;

    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET,
      Prefix: prefix,
      Delimiter: "/",
    });
  
    try {
        const { Contents, CommonPrefixes } = await client.send(command);
        
        const folders: S3Item[] = (CommonPrefixes || []).map(commonPrefix => {
            const folderPath = commonPrefix.Prefix!;
            const name = folderPath.replace(prefix, '').replace(/\/$/, '');
            return {
                name,
                path: folderPath,
                isFolder: true,
                size: 0,
                lastModified: new Date(0),
                type: 'folder'
            };
        });

        const files: S3Item[] = (Contents || [])
            .filter(item => item.Key !== prefix && (item.Size && item.Size > 0))
            .map(item => {
                const extension = item.Key?.split('.').pop()?.toLowerCase() || '';
                let type = 'application/octet-stream';
                const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
                const videoExtensions = ['mp4', 'webm', 'mov', 'ogg', 'qt'];
                
                if (imageExtensions.includes(extension)) {
                    type = `image/${extension === 'svg' ? 'svg+xml' : extension}`;
                } else if (videoExtensions.includes(extension)) {
                    type = `video/${extension}`;
                } else if (extension === 'pdf') {
                    type = 'application/pdf';
                }

                return {
                    name: item.Key!.replace(prefix, ''),
                    path: item.Key!,
                    isFolder: false,
                    size: item.Size!,
                    lastModified: item.LastModified!,
                    type: type,
                };
            });
      
      const allItems = [...folders, ...files].sort((a, b) => {
          if (a.isFolder && !b.isFolder) return -1;
          if (!a.isFolder && b.isFolder) return 1;
          return a.name.localeCompare(b.name);
      });
  
      return { success: allItems };
    } catch (error) {
      console.error("Error listing files:", error);
      return { failure: "Could not list files from S3." };
    }
}

export async function createFolder(path: string): Promise<{ success?: boolean; failure?: string }> {
    if (!process.env.AWS_BUCKET) {
      return { failure: "AWS_BUCKET environment variable not set." };
    }
    const client = new S3Client({
        region: process.env.AWS_DEFAULT_REGION ?? "ap-southeast-3",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });

    const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: path,
    });

    try {
        await client.send(command);
        return { success: true };
    } catch (error) {
        console.error("Error creating folder:", error);
        return { failure: "Could not create folder." };
    }
}

export async function deleteItem(path: string, isFolder: boolean): Promise<{ success?: boolean; failure?: string }> {
    if (!process.env.AWS_BUCKET) {
        return { failure: "AWS_BUCKET environment variable not set." };
    }
    const client = new S3Client({
        region: process.env.AWS_DEFAULT_REGION ?? "ap-southeast-3",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
    });

    try {
        if (isFolder) {
            const listCommand = new ListObjectsV2Command({
                Bucket: process.env.AWS_BUCKET,
                Prefix: path,
            });
            const { Contents } = await client.send(listCommand);

            if (Contents && Contents.length > 0) {
                const deleteCommand = new DeleteObjectsCommand({
                    Bucket: process.env.AWS_BUCKET,
                    Delete: {
                        Objects: Contents.map(obj => ({ Key: obj.Key })),
                        Quiet: false,
                    },
                });
                await client.send(deleteCommand);
            }
        } else {
            const deleteCommand = new DeleteObjectCommand({
                Bucket: process.env.AWS_BUCKET,
                Key: path,
            });
            await client.send(deleteCommand);
        }
        return { success: true };
    } catch (error) {
        console.error("Error deleting item:", error);
        return { failure: "Could not delete item(s) from S3." };
    }
}

export async function getShareableLink(path: string, expiresIn: number = 3600): Promise<{ success?: { url: string }, failure?: string }> {
    if (!process.env.AWS_BUCKET) {
      return { failure: "AWS_BUCKET environment variable not set." };
    }

    if (expiresIn <= 0 || expiresIn > 604800) { // Max 7 days
        expiresIn = 3600; // Default to 1 hour if invalid
    }

    const client = new S3Client({
        region: process.env.AWS_DEFAULT_REGION ?? "ap-southeast-3",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
    });

    const command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: path,
    });

    try {
        const url = await getSignedUrl(client, command, { expiresIn });
        return { success: { url } };
    } catch (error) {
        console.error("Error getting shareable link:", error);
        return { failure: "Could not create shareable link." };
    }
}

export async function createMaskedShareableLink(path: string, expiresIn: number): Promise<{ success?: { url: string }; failure?: string }> {
    if (!process.env.URL_ENCRYPTION_SECRET && process.env.NODE_ENV !== 'development') {
        return { failure: "URL encryption is not configured on the server." };
    }
    let appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
        return { failure: "NEXT_PUBLIC_APP_URL environment variable is not set." };
    }

    // Sanitize the URL to remove any trailing slashes
    if (appUrl.endsWith('/')) {
        appUrl = appUrl.slice(0, -1);
    }

    try {
        const expiresAt = Date.now() + expiresIn * 1000;
        const payload = JSON.stringify({ path, expiresAt });
        const encryptedPayload = encrypt(payload);
        
        const url = `${appUrl}/share/${encryptedPayload}`;
        
        return { success: { url } };
    } catch (error) {
        console.error("Error creating masked shareable link:", error);
        return { failure: "Could not create masked shareable link." };
    }
}
