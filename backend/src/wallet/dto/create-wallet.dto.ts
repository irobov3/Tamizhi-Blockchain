import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWalletDto {
  @ApiPropertyOptional({
    description: 'Optional HD derivation path (defaults to cosmos standard)',
    example: "m/44'/118'/0'/0/0",
  })
  @IsOptional()
  @IsString()
  derivationPath?: string;
}

export class WalletResponseDto {
  address!: string;
  publicKey!: string;
  mnemonic!: string;
}

export class BalanceResponseDto {
  address!: string;
  balances!: Array<{
    denom: string;
    amount: string;
  }>;
}
