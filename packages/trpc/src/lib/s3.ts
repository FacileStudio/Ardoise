import { S3Client } from 'bun';

export const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,
  accessKeyId: process.env.MINIO_ROOT_USER,
  secretAccessKey: process.env.MINIO_ROOT_PASSWORD,
  bucket: process.env.MINIO_BUCKET_NAME,
});
