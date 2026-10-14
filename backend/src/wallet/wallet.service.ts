import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { makeCosmoshubPath } from '@cosmjs/amino';
import { toBase64 } from '@cosmjs/encoding';
import { WalletResponseDto, BalanceResponseDto } from './dto/create-wallet.dto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly configService: ConfigService) {}

  async createWallet(derivationPath?: string): Promise<WalletResponseDto> {
    try {
      const wallet = await DirectSecp256k1HdWallet.generate(24, {
        prefix: 'cosmos',
        hdPaths: [makeCosmoshubPath(0)],
      });

      const [firstAccount] = await wallet.getAccounts();
      const mnemonic = wallet.mnemonic;
      const address = firstAccount.address;
      const publicKey = toBase64(firstAccount.pubkey);

      this.logger.log(`Created new wallet with address: ${address}`);

      return {
        address,
        publicKey,
        mnemonic,
      };
    } catch (error) {
      this.logger.error('Failed to create wallet', error);
      throw new BadRequestException('Failed to generate wallet');
    }
  }

  async getBalance(address: string): Promise<BalanceResponseDto> {
    const lcdUrl = this.configService.get<string>('CHAIN_LCD_URL');

    if (!lcdUrl) {
      throw new BadRequestException('Chain LCD URL not configured');
    }

    try {
      const response = await axios.get(
        `${lcdUrl}/cosmos/bank/v1beta1/balances/${address}`,
        { timeout: 10000 },
      );

      const balances = response.data?.balances || [];

      return {
        address,
        balances: balances.map((b: any) => ({
          denom: b.denom,
          amount: b.amount,
        })),
      };
    } catch (error: any) {
      if (error.response?.status === 400 || error.response?.status === 404) {
        return {
          address,
          balances: [],
        };
      }
      this.logger.error(`Failed to fetch balance for ${address}`, error.message);
      throw new BadRequestException(`Failed to fetch balance: ${error.message}`);
    }
  }

  async getTransactions(address: string): Promise<any> {
    const lcdUrl = this.configService.get<string>('CHAIN_LCD_URL');

    if (!lcdUrl) {
      throw new BadRequestException('Chain LCD URL not configured');
    }

    try {
      const [sentRes, receivedRes] = await Promise.allSettled([
        axios.get(
          `${lcdUrl}/cosmos/tx/v1beta1/txs?events=transfer.sender='${address}'&limit=50`,
          { timeout: 10000 },
        ),
        axios.get(
          `${lcdUrl}/cosmos/tx/v1beta1/txs?events=transfer.recipient='${address}'&limit=50`,
          { timeout: 10000 },
        ),
      ]);

      const sent = sentRes.status === 'fulfilled' ? sentRes.value.data?.txs || [] : [];
      const received = receivedRes.status === 'fulfilled' ? receivedRes.value.data?.txs || [] : [];

      const allTxs = [...sent, ...received];
      const uniqueTxs = allTxs.filter(
        (tx, index, self) =>
          index === self.findIndex((t) => t.txhash === tx.txhash),
      );

      return {
        address,
        transactions: uniqueTxs.map((tx: any) => ({
          hash: tx.txhash,
          height: tx.height,
          timestamp: tx.timestamp,
          code: tx.code,
          memo: tx.tx?.body?.memo,
          messages: tx.tx?.body?.messages || [],
        })),
        total: uniqueTxs.length,
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch transactions for ${address}`, error.message);
      throw new BadRequestException(`Failed to fetch transactions: ${error.message}`);
    }
  }
}
