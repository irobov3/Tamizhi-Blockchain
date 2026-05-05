import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@ApiTags('wallet')
@Controller('wallet')
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(private readonly walletService: WalletService) {}

  @Post('create')
  @ApiOperation({
    summary: 'Create a new wallet',
    description: 'Generates a new HD wallet with mnemonic, address, and public key',
  })
  @ApiResponse({
    status: 201,
    description: 'Wallet created successfully',
    schema: {
      type: 'object',
      properties: {
        address: { type: 'string', example: 'cosmos1abc123...' },
        publicKey: { type: 'string', example: 'A1B2C3...' },
        mnemonic: { type: 'string', example: 'word1 word2 word3...' },
      },
    },
  })
  async createWallet(@Body() createWalletDto: CreateWalletDto) {
    this.logger.log('Creating new wallet');
    return this.walletService.createWallet(createWalletDto.derivationPath);
  }

  @Get('balance/:address')
  @ApiOperation({
    summary: 'Get wallet balance',
    description: 'Retrieves all token balances for a given wallet address from the chain',
  })
  @ApiParam({ name: 'address', description: 'Cosmos wallet address', example: 'cosmos1abc123...' })
  @ApiResponse({
    status: 200,
    description: 'Balance retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        address: { type: 'string' },
        balances: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              denom: { type: 'string', example: 'utamizhi' },
              amount: { type: 'string', example: '1000000' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid address or chain error' })
  async getBalance(@Param('address') address: string) {
    this.logger.log(`Fetching balance for: ${address}`);
    return this.walletService.getBalance(address);
  }

  @Get('transactions/:address')
  @ApiOperation({
    summary: 'Get wallet transactions',
    description: 'Retrieves transaction history for a given wallet address',
  })
  @ApiParam({ name: 'address', description: 'Cosmos wallet address', example: 'cosmos1abc123...' })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid address or chain error' })
  async getTransactions(@Param('address') address: string) {
    this.logger.log(`Fetching transactions for: ${address}`);
    return this.walletService.getTransactions(address);
  }
}
