"use server";

import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { S3Client, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

export interface S3File {
    name: string;
    url: string;
    type: string;
    path: string;
}

export async function getSignedURL(file: { name: string; type: string; size: number }) {
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

  const now = new Date();
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(now).replace(/-/g, '');
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour12: false }).format(now).replace(/:/g, '');
  const uniqueChars = randomUUID().substring(0, 3);
  const extension = file.name.split('.').pop() || 'bin';
  
  const newFileName = `musringudin-record-${date}-${time}-${uniqueChars}.${extension}`;
  const key = `pakde-dosen/${newFileName}`;

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

export async function listFiles(): Promise<{ success?: S3File[], failure?: string }> {
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
  
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET,
      Prefix: "pakde-dosen/",
    });
  
    try {
      const { Contents } = await client.send(command);
      if (!Contents || Contents.length <= 1) { 
        return { success: [] };
      }
  
      const files = await Promise.all(
        Contents
          .filter(item => item.Size && item.Size > 0)
          .map(async (item): Promise<S3File> => {
            const getObjectCommand = new GetObjectCommand({
              Bucket: process.env.AWS_BUCKET,
              Key: item.Key,
            });
            const url = await getSignedUrl(client, getObjectCommand, { expiresIn: 3600 });
            
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
              name: item.Key!.replace("pakde-dosen/", ""),
              url,
              type,
              path: item.Key!,
            };
        })
      );
  
      files.sort((a, b) => b.name.localeCompare(a.name));
  
      return { success: files };
    } catch (error) {
      console.error("Error listing files:", error);
      return { failure: "Could not list files from S3." };
    }
}

export async function deleteFile(path: string): Promise<{ success?: boolean; failure?: string }> {
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
  
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key: path,
    });
  
    try {
      await client.send(command);
      return { success: true };
    } catch (error) {
      console.error("Error deleting file:", error);
      return { failure: "Could not delete file from S3." };
    }
}
