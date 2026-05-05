import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({ description: 'Sender wallet address', example: 'cosmos1abc123...' })
  @IsString()
  @IsNotEmpty()
  fromAddress!: string;

  @ApiProperty({ description: 'Recipient wallet address', example: 'cosmos1xyz456...' })
  @IsString()
  @IsNotEmpty()
  toAddress!: string;

  @ApiProperty({ description: 'Amount to send (as string to handle big numbers)', example: '1000000' })
  @IsString()
  @IsNotEmpty()
  amount!: string;

  @ApiProperty({ description: 'Token denomination', example: 'utamizhi', default: 'utamizhi' })
  @IsString()
  @IsNotEmpty()
  denom!: string;

  @ApiPropertyOptional({ description: 'Transaction hash (after broadcast)', example: 'ABC123DEF...' })
  @IsOptional()
  @IsString()
  txHash?: string;

  @ApiPropertyOptional({ description: 'Transaction memo', example: 'Payment for literary work' })
  @IsOptional()
  @IsString()
  memo?: string;
}

export class BroadcastTxDto {
  @ApiProperty({
    description: 'Signed transaction bytes in base64',
    example: 'CpABCo0BChwvY29zbW9zLmJhbmsudjFiZXRhMS5Nc2dTZW5k...',
  })
  @IsString()
  @IsNotEmpty()
  signedTxBytes!: string;
}
