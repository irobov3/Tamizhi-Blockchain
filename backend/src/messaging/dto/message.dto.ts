import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'Sender user ID', example: 'uuid-of-sender' })
  @IsString()
  @IsNotEmpty()
  senderId!: string;

  @ApiProperty({ description: 'Recipient wallet address', example: 'cosmos1xyz...' })
  @IsString()
  @IsNotEmpty()
  recipientAddress!: string;

  @ApiProperty({
    description: 'NaCl box encrypted message content (base64)',
    example: 'base64encodedEncryptedData==',
  })
  @IsString()
  @IsNotEmpty()
  encryptedContent!: string;

  @ApiProperty({
    description: 'NaCl box nonce (base64)',
    example: 'base64encodedNonce==',
  })
  @IsString()
  @IsNotEmpty()
  nonce!: string;
}

export class GetMessagesDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 50, default: 50 })
  @IsOptional()
  limit?: number = 50;
}
