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
import { TransactionService } from './transaction.service';
import { CreateTransactionDto, BroadcastTxDto } from './dto/transaction.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionController {
  private readonly logger = new Logger(TransactionController.name);

  constructor(private readonly transactionService: TransactionService) {}

  @Get(':hash')
  @ApiOperation({
    summary: 'Get transaction by hash',
    description: 'Retrieves a transaction by its hash from local DB and the chain',
  })
  @ApiParam({ name: 'hash', description: 'Transaction hash', example: 'ABC123DEF...' })
  @ApiResponse({ status: 200, description: 'Transaction details' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransaction(@Param('hash') hash: string) {
    this.logger.log(`Fetching transaction: ${hash}`);
    return this.transactionService.getTransaction(hash);
  }

  @Get('address/:address')
  @ApiOperation({
    summary: 'Get transactions by address',
    description: 'Retrieves all transactions involving a specific wallet address',
  })
  @ApiParam({ name: 'address', description: 'Wallet address', example: 'cosmos1abc123...' })
  @ApiResponse({ status: 200, description: 'List of transactions for the address' })
  async getTransactionsByAddress(@Param('address') address: string) {
    this.logger.log(`Fetching transactions for address: ${address}`);
    return this.transactionService.getTransactionsByAddress(address);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Record a new transaction',
    description: 'Creates a transaction record in the database',
  })
  @ApiResponse({ status: 201, description: 'Transaction record created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createTransaction(@Body() createTransactionDto: CreateTransactionDto) {
    return this.transactionService.createTransaction(createTransactionDto);
  }

  @Post('broadcast')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Broadcast a signed transaction',
    description: 'Broadcasts a client-signed transaction to the blockchain network',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction broadcast result',
    schema: {
      type: 'object',
      properties: {
        txHash: { type: 'string' },
        code: { type: 'number' },
        rawLog: { type: 'string' },
        height: { type: 'string' },
        gasUsed: { type: 'string' },
        success: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Broadcast failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async broadcastTx(@Body() broadcastTxDto: BroadcastTxDto) {
    this.logger.log('Broadcasting signed transaction');
    return this.transactionService.broadcastTx(broadcastTxDto);
  }
}
