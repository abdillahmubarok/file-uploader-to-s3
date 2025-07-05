"use server";

import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

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
        // Fallback for development if .env.local is not set.
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
