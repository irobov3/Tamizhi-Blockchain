import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class NonceDto {
  @ApiProperty({
    description: 'Cosmos wallet address',
    example: 'cosmos1abc123...',
  })
  @IsString()
  @IsNotEmpty()
  address!: string;
}

export class VerifySignatureDto {
  @ApiProperty({
    description: 'Cosmos wallet address',
    example: 'cosmos1abc123...',
  })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({
    description: 'Signed nonce (base64 encoded signature)',
    example: 'base64encodedSignature==',
  })
  @IsString()
  @IsNotEmpty()
  signature!: string;
}
