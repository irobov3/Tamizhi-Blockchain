import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  ParseUUIDPipe,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { LiteratureService } from './literature.service';
import { CreateLiteratureDto, LiteraturePaginationDto } from './dto/create-literature.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@ApiTags('literature')
@Controller('literature')
export class LiteratureController {
  private readonly logger = new Logger(LiteratureController.name);

  constructor(private readonly literatureService: LiteratureService) {}

  @Get()
  @ApiOperation({
    summary: 'List all literary works',
    description: 'Returns a paginated list of all Tamil literary works registered on the platform',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'genre', required: false, type: String, description: 'Filter by genre' })
  @ApiQuery({ name: 'period', required: false, type: String, description: 'Filter by period' })
  @ApiResponse({ status: 200, description: 'Paginated list of literary works' })
  async listWorks(@Query() pagination: LiteraturePaginationDto) {
    return this.literatureService.listWorks(pagination);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search literary works',
    description: 'Full-text search across title, author, genre, period, and tags',
  })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search results' })
  @ApiResponse({ status: 400, description: 'Query too short' })
  async searchWorks(@Query('q') query: string) {
    if (!query) {
      throw new BadRequestException('Search query parameter "q" is required');
    }
    return this.literatureService.searchWorks(query);
  }

  @Get('author/:address')
  @ApiOperation({
    summary: 'Get works by author address',
    description: 'Returns all literary works registered by a specific wallet address',
  })
  @ApiParam({ name: 'address', description: 'Author wallet address', example: 'cosmos1abc123...' })
  @ApiResponse({ status: 200, description: 'Works by the specified author' })
  async getWorksByAuthor(@Param('address') address: string) {
    return this.literatureService.getWorksByAuthor(address);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific literary work',
    description: 'Returns the full details of a literary work by its ID',
  })
  @ApiParam({ name: 'id', description: 'Literary work UUID' })
  @ApiResponse({ status: 200, description: 'Literary work details' })
  @ApiResponse({ status: 404, description: 'Work not found' })
  async getWork(@Param('id', ParseUUIDPipe) id: string) {
    return this.literatureService.getWork(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
      fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'text/plain', 'text/html', 'application/json', 'image/jpeg', 'image/png'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`File type ${file.mimetype} not allowed`), false);
        }
      },
    }),
  )
  @ApiOperation({
    summary: 'Upload a literary work',
    description: 'Upload a file and register a literary work on the platform with IPFS storage',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'The literary work file' },
        title: { type: 'string', description: 'Title in Tamil' },
        titleTransliterated: { type: 'string', description: 'Romanized title' },
        authorName: { type: 'string', description: 'Author name' },
        authorAddress: { type: 'string', description: 'Author wallet address' },
        period: { type: 'string', description: 'Historical period' },
        genre: { type: 'string', description: 'Genre' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags' },
        license: { type: 'string', description: 'License type', default: 'CC-BY-4.0' },
      },
      required: ['title', 'authorName', 'authorAddress'],
    },
  })
  @ApiResponse({ status: 201, description: 'Literary work created and uploaded to IPFS' })
  @ApiResponse({ status: 400, description: 'Invalid input or file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createWork(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDto: Partial<CreateLiteratureDto>,
  ) {
    this.logger.log(`Uploading literary work: ${createDto.title}`);

    if (file) {
      return this.literatureService.uploadToIPFS(file, createDto);
    }

    // No file — create a metadata-only record
    if (!createDto.title || !createDto.authorName || !createDto.authorAddress) {
      throw new BadRequestException('title, authorName, and authorAddress are required');
    }

    return this.literatureService.createWork(createDto as CreateLiteratureDto);
  }
}
