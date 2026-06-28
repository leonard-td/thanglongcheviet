import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';

export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
}

export class GeneratePresignedUrlDto {
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsEnum(FileType)
  fileType!: FileType;

  @IsString()
  @IsNotEmpty()
  contentType!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(104857600) // 100MB max
  fileSize?: number;
}

export class PresignedUrlResponseDto {
  uploadUrl!: string;
  fileKey!: string;
  publicUrl!: string;
  expiresIn!: number;
}
