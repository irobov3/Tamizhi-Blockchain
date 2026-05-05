import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService) {}

  private get ipfsApiUrl(): string {
    return this.configService.get<string>('IPFS_API_URL') || 'http://localhost:5001';
  }

  private get ipfsGateway(): string {
    return this.configService.get<string>('IPFS_GATEWAY') || 'https://ipfs.io/ipfs';
  }

  async uploadFile(buffer: Buffer, filename: string): Promise<string> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Empty file buffer');
    }

    try {
      const formData = new FormData();
      formData.append('file', buffer, {
        filename,
        contentType: 'application/octet-stream',
      });

      const response = await axios.post(
        `${this.ipfsApiUrl}/api/v0/add?pin=true&wrap-with-directory=false`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 120000, // 2 minutes for large files
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        },
      );

      // IPFS add returns NDJSON; parse last line or the object
      let result: any;
      if (typeof response.data === 'string') {
        const lines = response.data.trim().split('\n');
        result = JSON.parse(lines[lines.length - 1]);
      } else {
        result = response.data;
      }

      const cid = result.Hash || result.cid || result.CID;
      if (!cid) {
        throw new BadRequestException('IPFS did not return a CID');
      }

      this.logger.log(`Uploaded file to IPFS: ${cid} (${buffer.length} bytes)`);
      return cid;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new ServiceUnavailableException('IPFS node is not available');
      }
      this.logger.error('IPFS upload failed', error.message);
      throw new BadRequestException(`IPFS upload failed: ${error.message}`);
    }
  }

  async getFile(cid: string): Promise<Buffer> {
    if (!cid) {
      throw new BadRequestException('CID is required');
    }

    try {
      const response = await axios.get(
        `${this.ipfsApiUrl}/api/v0/cat?arg=${cid}`,
        {
          responseType: 'arraybuffer',
          timeout: 60000,
        },
      );

      return Buffer.from(response.data);
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        // Fallback to public gateway
        try {
          const gatewayResponse = await axios.get(`${this.ipfsGateway}/${cid}`, {
            responseType: 'arraybuffer',
            timeout: 30000,
          });
          return Buffer.from(gatewayResponse.data);
        } catch (gatewayError: any) {
          throw new NotFoundException(`File not found: ${cid}`);
        }
      }
      this.logger.error(`Failed to get file ${cid}`, error.message);
      throw new NotFoundException(`Failed to retrieve file: ${cid}`);
    }
  }

  async pinFile(cid: string): Promise<{ success: boolean; cid: string }> {
    if (!cid) {
      throw new BadRequestException('CID is required');
    }

    try {
      await axios.post(
        `${this.ipfsApiUrl}/api/v0/pin/add?arg=${cid}`,
        null,
        { timeout: 60000 },
      );

      this.logger.log(`Pinned file: ${cid}`);
      return { success: true, cid };
    } catch (error: any) {
      this.logger.error(`Failed to pin ${cid}`, error.message);
      throw new BadRequestException(`Failed to pin file: ${error.message}`);
    }
  }

  async unpinFile(cid: string): Promise<{ success: boolean; cid: string }> {
    if (!cid) {
      throw new BadRequestException('CID is required');
    }

    try {
      await axios.post(
        `${this.ipfsApiUrl}/api/v0/pin/rm?arg=${cid}`,
        null,
        { timeout: 30000 },
      );

      this.logger.log(`Unpinned file: ${cid}`);
      return { success: true, cid };
    } catch (error: any) {
      this.logger.error(`Failed to unpin ${cid}`, error.message);
      throw new BadRequestException(`Failed to unpin file: ${error.message}`);
    }
  }

  getIPFSUrl(cid: string): string {
    if (!cid) return '';
    return `${this.ipfsGateway}/${cid}`;
  }

  async getNodeInfo(): Promise<any> {
    try {
      const response = await axios.post(
        `${this.ipfsApiUrl}/api/v0/id`,
        null,
        { timeout: 5000 },
      );
      return response.data;
    } catch (error: any) {
      throw new ServiceUnavailableException('IPFS node not available');
    }
  }

  async listPins(): Promise<any> {
    try {
      const response = await axios.post(
        `${this.ipfsApiUrl}/api/v0/pin/ls?type=recursive`,
        null,
        { timeout: 30000 },
      );
      return response.data;
    } catch (error: any) {
      throw new BadRequestException(`Failed to list pins: ${error.message}`);
    }
  }
}
