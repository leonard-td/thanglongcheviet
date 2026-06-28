import { registerAs } from '@nestjs/config';

export default registerAs('s3', () => ({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  bucket: process.env.AWS_S3_BUCKET || 'thanglongcheviet',
  // For LocalStack development
  endpoint: process.env.AWS_S3_ENDPOINT || undefined,
  forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true' || false,
  // Presigned URL expiration (in seconds)
  presignedUrlExpiration: parseInt(
    process.env.AWS_S3_PRESIGNED_URL_EXPIRATION || '3600',
    10,
  ), // 1 hour default
}));