import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../config/prisma.service';
import { CreateTransactionDto, BroadcastTxDto } from './dto/transaction.dto';
import axios from 'axios';
import { fromBase64 } from '@cosmjs/encoding';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createTransaction(dto: CreateTransactionDto): Promise<any> {
    try {
      const transaction = await this.prisma.transaction.create({
        data: {
          fromAddress: dto.fromAddress,
          toAddress: dto.toAddress,
          amount: dto.amount,
          denom: dto.denom,
          txHash: dto.txHash || `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          status: dto.txHash ? 'submitted' : 'pending',
        },
      });

      this.logger.log(`Created transaction record: ${transaction.id}`);
      return transaction;
    } catch (error: any) {
      this.logger.error('Failed to create transaction', error.message);
      throw new BadRequestException(`Failed to create transaction: ${error.message}`);
    }
  }

  async getTransaction(hash: string): Promise<any> {
    // First check local DB
    const localTx = await this.prisma.transaction.findUnique({
      where: { txHash: hash },
    });

    // Also fetch from chain for live status
    const lcdUrl = this.configService.get<string>('CHAIN_LCD_URL');
    let chainTx: any = null;

    if (lcdUrl) {
      try {
        const response = await axios.get(
          `${lcdUrl}/cosmos/tx/v1beta1/txs/${hash}`,
          { timeout: 10000 },
        );
        chainTx = response.data?.tx_response || null;

        // Update local record if found on chain
        if (chainTx && localTx) {
          await this.prisma.transaction.update({
            where: { txHash: hash },
            data: {
              status: chainTx.code === 0 ? 'success' : 'failed',
              blockHeight: parseInt(chainTx.height, 10) || null,
              gasUsed: parseInt(chainTx.gas_used, 10) || null,
            },
          });
        }
      } catch (error: any) {
        this.logger.warn(`Chain lookup failed for tx ${hash}: ${error.message}`);
      }
    }

    if (!localTx && !chainTx) {
      throw new NotFoundException(`Transaction ${hash} not found`);
    }

    return {
      local: localTx,
      chain: chainTx,
    };
  }

  async getTransactionsByAddress(address: string): Promise<any> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        OR: [
          { fromAddress: address },
          { toAddress: address },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return {
      address,
      transactions,
      count: transactions.length,
    };
  }

  async broadcastTx(dto: BroadcastTxDto): Promise<any> {
    const rpcUrl = this.configService.get<string>('CHAIN_RPC_URL');
    const lcdUrl = this.configService.get<string>('CHAIN_LCD_URL');

    if (!rpcUrl && !lcdUrl) {
      throw new BadRequestException('Chain RPC/LCD URL not configured');
    }

    try {
      // Decode signed tx bytes
      const txBytes = fromBase64(dto.signedTxBytes);
      const txBytesBase64 = Buffer.from(txBytes).toString('base64');

      // Broadcast via LCD REST API
      const broadcastUrl = `${lcdUrl}/cosmos/tx/v1beta1/txs`;
      const response = await axios.post(
        broadcastUrl,
        {
          tx_bytes: txBytesBase64,
          mode: 'BROADCAST_MODE_SYNC',
        },
        {
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' },
        },
      );

      const txResponse = response.data?.tx_response;

      if (!txResponse) {
        throw new BadRequestException('Invalid response from chain');
      }

      // Save to DB
      if (txResponse.txhash) {
        try {
          await this.prisma.transaction.upsert({
            where: { txHash: txResponse.txhash },
            create: {
              fromAddress: 'unknown', // Will be filled from tx parsing
              toAddress: 'unknown',
              amount: '0',
              denom: 'utamizhi',
              txHash: txResponse.txhash,
              status: txResponse.code === 0 ? 'success' : 'failed',
              blockHeight: txResponse.height ? parseInt(txResponse.height, 10) : null,
              gasUsed: txResponse.gas_used ? parseInt(txResponse.gas_used, 10) : null,
            },
            update: {
              status: txResponse.code === 0 ? 'success' : 'failed',
            },
          });
        } catch (dbError: any) {
          this.logger.warn('Failed to save broadcast tx to DB', dbError.message);
        }
      }

      this.logger.log(`Transaction broadcast: ${txResponse.txhash} code=${txResponse.code}`);

      return {
        txHash: txResponse.txhash,
        code: txResponse.code,
        rawLog: txResponse.raw_log,
        height: txResponse.height,
        gasUsed: txResponse.gas_used,
        gasWanted: txResponse.gas_wanted,
        success: txResponse.code === 0,
      };
    } catch (error: any) {
      if (error.response?.data) {
        this.logger.error('Broadcast failed', JSON.stringify(error.response.data));
        throw new BadRequestException(
          error.response.data?.message || 'Transaction broadcast failed',
        );
      }
      this.logger.error('Broadcast error', error.message);
      throw new BadRequestException(`Broadcast failed: ${error.message}`);
    }
  }
}
