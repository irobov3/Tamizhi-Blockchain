import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateLiteratureDto, LiteraturePaginationDto } from './dto/create-literature.dto';
import * as crypto from 'crypto';

@Injectable()
export class LiteratureService {
  private readonly logger = new Logger(LiteratureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async createWork(dto: CreateLiteratureDto): Promise<any> {
    try {
      const work = await this.prisma.literaryWork.create({
        data: {
          title: dto.title,
          titleTransliterated: dto.titleTransliterated,
          authorName: dto.authorName,
          authorAddress: dto.authorAddress,
          ipfsCid: dto.ipfsCid,
          arweaveTx: dto.arweaveTx,
          sha256Hash: dto.sha256Hash,
          period: dto.period,
          genre: dto.genre,
          tags: dto.tags || [],
          license: dto.license || 'CC-BY-4.0',
          txHash: dto.txHash,
          blockHeight: dto.blockHeight,
          verified: false,
        },
      });

      this.logger.log(`Created literary work: ${work.id} - ${work.title}`);
      return work;
    } catch (error: any) {
      this.logger.error('Failed to create literary work', error.message);
      throw new BadRequestException(`Failed to create work: ${error.message}`);
    }
  }

  async uploadToIPFS(file: Express.Multer.File, dto: Partial<CreateLiteratureDto>): Promise<any> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Compute SHA256 hash
    const sha256Hash = crypto
      .createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    // Upload to IPFS
    const ipfsCid = await this.storageService.uploadFile(file.buffer, file.originalname);

    const ipfsUrl = this.storageService.getIPFSUrl(ipfsCid);

    this.logger.log(`Uploaded file to IPFS: ${ipfsCid}`);

    // Create the literary work record
    const fullDto: CreateLiteratureDto = {
      title: dto.title || file.originalname,
      authorName: dto.authorName || 'Unknown',
      authorAddress: dto.authorAddress || '',
      ipfsCid,
      sha256Hash: `sha256:${sha256Hash}`,
      titleTransliterated: dto.titleTransliterated,
      period: dto.period,
      genre: dto.genre,
      tags: dto.tags,
      license: dto.license || 'CC-BY-4.0',
    };

    const work = await this.createWork(fullDto);

    return {
      ...work,
      ipfsUrl,
    };
  }

  async getWork(id: string): Promise<any> {
    const work = await this.prisma.literaryWork.findUnique({
      where: { id },
    });

    if (!work) {
      throw new NotFoundException(`Literary work with id ${id} not found`);
    }

    return {
      ...work,
      ipfsUrl: work.ipfsCid ? this.storageService.getIPFSUrl(work.ipfsCid) : null,
    };
  }

  async listWorks(pagination: LiteraturePaginationDto): Promise<any> {
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(100, Math.max(1, pagination.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (pagination.genre) where.genre = pagination.genre;
    if (pagination.period) where.period = pagination.period;

    const [works, total] = await Promise.all([
      this.prisma.literaryWork.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.literaryWork.count({ where }),
    ]);

    return {
      data: works.map((w: any) => ({
        ...w,
        ipfsUrl: w.ipfsCid ? this.storageService.getIPFSUrl(w.ipfsCid) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  async searchWorks(query: string): Promise<any> {
    if (!query || query.trim().length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters');
    }

    const works = await this.prisma.literaryWork.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { titleTransliterated: { contains: query, mode: 'insensitive' } },
          { authorName: { contains: query, mode: 'insensitive' } },
          { genre: { contains: query, mode: 'insensitive' } },
          { period: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } },
        ],
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    return {
      query,
      results: works.map((w: any) => ({
        ...w,
        ipfsUrl: w.ipfsCid ? this.storageService.getIPFSUrl(w.ipfsCid) : null,
      })),
      count: works.length,
    };
  }

  async getWorksByAuthor(address: string): Promise<any> {
    const works = await this.prisma.literaryWork.findMany({
      where: { authorAddress: address },
      orderBy: { createdAt: 'desc' },
    });

    return {
      authorAddress: address,
      works: works.map((w: any) => ({
        ...w,
        ipfsUrl: w.ipfsCid ? this.storageService.getIPFSUrl(w.ipfsCid) : null,
      })),
      count: works.length,
    };
  }
}
