import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Res,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@ApiTags('storage')
@Controller('storage')
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    }),
  )
  @ApiOperation({
    summary: 'Upload file to IPFS',
    description: 'Uploads a file to IPFS and returns the CID',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'File to upload' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        cid: { type: 'string', example: 'QmX...' },
        url: { type: 'string', example: 'https://ipfs.io/ipfs/QmX...' },
        filename: { type: 'string' },
        size: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'No file or upload failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    this.logger.log(`Uploading file: ${file.originalname} (${file.size} bytes)`);
    const cid = await this.storageService.uploadFile(file.buffer, file.originalname);

    return {
      cid,
      url: this.storageService.getIPFSUrl(cid),
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Get(':cid')
  @ApiOperation({
    summary: 'Get file by CID',
    description: 'Retrieves a file from IPFS by its CID and streams it in the response',
  })
  @ApiParam({ name: 'cid', description: 'IPFS CID', example: 'QmX...' })
  @ApiResponse({ status: 200, description: 'File content streamed in response' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(@Param('cid') cid: string, @Res() res: Response) {
    this.logger.log(`Fetching file from IPFS: ${cid}`);
    const buffer = await this.storageService.getFile(cid);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${cid}"`);
    res.setHeader('X-IPFS-CID', cid);
    res.send(buffer);
  }

  @Post(':cid/pin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Pin a file by CID',
    description: 'Pins a file on the local IPFS node to ensure persistence',
  })
  @ApiParam({ name: 'cid', description: 'IPFS CID to pin', example: 'QmX...' })
  @ApiResponse({ status: 200, description: 'File pinned successfully' })
  @ApiResponse({ status: 400, description: 'Pin failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async pinFile(@Param('cid') cid: string) {
    return this.storageService.pinFile(cid);
  }

  @Delete(':cid/pin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Unpin a file by CID',
    description: 'Removes the pin for a file on the local IPFS node',
  })
  @ApiParam({ name: 'cid', description: 'IPFS CID to unpin', example: 'QmX...' })
  @ApiResponse({ status: 200, description: 'File unpinned successfully' })
  @ApiResponse({ status: 400, description: 'Unpin failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async unpinFile(@Param('cid') cid: string) {
    return this.storageService.unpinFile(cid);
  }

  @Get('info/node')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get IPFS node info',
    description: 'Returns information about the connected IPFS node',
  })
  @ApiResponse({ status: 200, description: 'Node info' })
  @ApiResponse({ status: 503, description: 'IPFS node not available' })
  async getNodeInfo() {
    return this.storageService.getNodeInfo();
  }
}
