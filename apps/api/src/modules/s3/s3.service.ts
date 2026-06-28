import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import {
  GeneratePresignedUrlDto,
  PresignedUrlResponseDto,
  FileType,
} from './dto/presigned-url.dto';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly presignedUrlExpiration: number;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('s3.endpoint');
    const forcePathStyle = this.configService.get<boolean>('s3.forcePathStyle');

    this.bucket = this.configService.get<string>('s3.bucket') || '';
    this.region = this.configService.get<string>('s3.region') || 'ap-southeast-1';
    this.presignedUrlExpiration =
      this.configService.get<number>('s3.presignedUrlExpiration') || 3600;

    const s3Config: any = {
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('s3.accessKeyId') || '',
        secretAccessKey: this.configService.get<string>('s3.secretAccessKey') || '',
      },
    };

    // For LocalStack or S3-compatible services
    if (endpoint) {
      s3Config.endpoint = endpoint;
      s3Config.forcePathStyle = forcePathStyle;
    }

    this.s3Client = new S3Client(s3Config);
    this.logger.log(
      `S3 Service initialized with bucket: ${this.bucket}, region: ${this.region}`,
    );
  }

  /**
   * Generate a presigned URL for file upload
   */
  async generatePresignedUrl(
    dto: GeneratePresignedUrlDto,
  ): Promise<PresignedUrlResponseDto> {
    try {
      // Generate unique file key
      const fileKey = this.generateFileKey(dto.fileName, dto.fileType);

      // Create PutObject command
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        ContentType: dto.contentType,
      });

      // Generate presigned URL
      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: this.presignedUrlExpiration,
      });

      // Generate public URL (will be accessible after upload)
      const publicUrl = this.getPublicUrl(fileKey);

      this.logger.log(`Generated presigned URL for file: ${fileKey}`);

      return {
        uploadUrl,
        fileKey,
        publicUrl,
        expiresIn: this.presignedUrlExpiration,
      };
    } catch (error) {
      this.logger.error('Failed to generate presigned URL', error);
      throw error;
    }
  }

  /**
   * Generate unique file key with folder structure
   * Format: {fileType}/{year}/{month}/{uuid}-{filename}
   */
  private generateFileKey(fileName: string, fileType: FileType): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const uuid = randomUUID();

    // Sanitize filename (remove special characters, keep extension)
    const sanitizedFileName = fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .toLowerCase();

    return `${fileType}/${year}/${month}/${uuid}-${sanitizedFileName}`;
  }

  /**
   * Get public URL for a file key
   */
  private getPublicUrl(fileKey: string): string {
    const endpoint = this.configService.get<string>('s3.endpoint');

    if (endpoint) {
      // LocalStack or custom S3-compatible endpoint
      return `${endpoint}/${this.bucket}/${fileKey}`;
    }

    // Standard AWS S3 URL
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fileKey}`;
  }

  /**
   * Delete a file from S3 (for future use)
   */
  async deleteFile(fileKey: string): Promise<void> {
    // Implementation will be added when needed
    this.logger.log(`Delete file requested: ${fileKey}`);
  }
}