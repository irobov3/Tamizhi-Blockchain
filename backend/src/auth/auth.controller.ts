import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { NonceDto, VerifySignatureDto } from './dto/nonce.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('nonce')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request authentication nonce',
    description: 'Generates a unique nonce for a wallet address to sign for authentication',
  })
  @ApiBody({ type: NonceDto })
  @ApiResponse({
    status: 200,
    description: 'Nonce generated successfully',
    schema: {
      type: 'object',
      properties: {
        nonce: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
        message: { type: 'string', example: 'Sign this message to authenticate with Tamizhi.Ai\nNonce: 550e8400...' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid address' })
  async getNonce(@Body() nonceDto: NonceDto): Promise<{ nonce: string; message: string }> {
    this.logger.log(`Nonce requested for address: ${nonceDto.address}`);
    return this.authService.generateNonce(nonceDto.address);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify signature and get JWT',
    description: 'Verifies the signed nonce and returns a JWT token for authenticated requests',
  })
  @ApiBody({ type: VerifySignatureDto })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            address: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid signature or expired nonce' })
  async verifySignature(
    @Body() verifyDto: VerifySignatureDto,
  ): Promise<{ token: string; user: any }> {
    this.logger.log(`Verifying signature for address: ${verifyDto.address}`);
    return this.authService.verifySignature(verifyDto.address, verifyDto.signature);
  }
}
