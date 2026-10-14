import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateLiteratureDto {
  @ApiProperty({ description: 'Title of the literary work in Tamil', example: 'திருக்குறள்' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title!: string;

  @ApiPropertyOptional({ description: 'Romanized/transliterated title', example: 'Thirukkural' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  titleTransliterated?: string;

  @ApiProperty({ description: 'Author name', example: 'திருவள்ளுவர்' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  authorName!: string;

  @ApiProperty({ description: 'Author wallet address', example: 'cosmos1abc123...' })
  @IsString()
  @IsNotEmpty()
  authorAddress!: string;

  @ApiPropertyOptional({ description: 'Historical period of the work', example: 'Sangam Period' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  period?: string;

  @ApiPropertyOptional({ description: 'Genre of the work', example: 'Poetry' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  genre?: string;

  @ApiPropertyOptional({
    description: 'Tags for categorization',
    type: [String],
    example: ['ethics', 'philosophy', 'classical'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  tags?: string[];

  @ApiPropertyOptional({
    description: 'License type',
    example: 'CC-BY-4.0',
    default: 'CC-BY-4.0',
  })
  @IsOptional()
  @IsString()
  license?: string;

  @ApiPropertyOptional({ description: 'IPFS CID if already uploaded', example: 'QmX...' })
  @IsOptional()
  @IsString()
  ipfsCid?: string;

  @ApiPropertyOptional({ description: 'Arweave transaction ID', example: 'abc123...' })
  @IsOptional()
  @IsString()
  arweaveTx?: string;

  @ApiPropertyOptional({ description: 'SHA256 hash of the content', example: 'sha256:abc123...' })
  @IsOptional()
  @IsString()
  sha256Hash?: string;

  @ApiPropertyOptional({ description: 'Blockchain transaction hash', example: '0xabc123...' })
  @IsOptional()
  @IsString()
  txHash?: string;

  @ApiPropertyOptional({ description: 'Block height when registered', example: 12345 })
  @IsOptional()
  blockHeight?: number;
}

export class LiteraturePaginationDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 20, default: 20 })
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by genre', example: 'Poetry' })
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional({ description: 'Filter by period', example: 'Sangam Period' })
  @IsOptional()
  @IsString()
  period?: string;
}
