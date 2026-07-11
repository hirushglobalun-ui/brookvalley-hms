import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function getS3Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const BUCKET = process.env.R2_BUCKET_NAME || "brookvalley-hms";
    const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

    // Read file into a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate a unique filename
    const ext = file.name.split(".").pop() || "png";
    const fileName = `payments/proof_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}.${ext}`;

    // Upload to R2
    const s3 = getS3Client();
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: fileName,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
        CacheControl: "public, max-age=31536000",
      })
    );

    // Construct the public URL
    const publicUrl = `${PUBLIC_URL}/${fileName}`;

    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    console.error("R2 upload error:", err);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}
