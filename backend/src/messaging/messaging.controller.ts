import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
  Logger,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { SendMessageDto, GetMessagesDto } from './dto/message.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@ApiTags('messaging')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MessagingController {
  private readonly logger = new Logger(MessagingController.name);

  constructor(private readonly messagingService: MessagingService) {}

  @Post()
  @ApiOperation({
    summary: 'Send an encrypted message',
    description: 'Send a NaCl box-encrypted message to a recipient wallet address',
  })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendMessage(@Body() sendMessageDto: SendMessageDto) {
    this.logger.log(`Sending message from ${sendMessageDto.senderId}`);
    return this.messagingService.sendMessage(sendMessageDto);
  }

  @Get(':address')
  @ApiOperation({
    summary: 'Get all conversations for an address',
    description: 'Returns all conversations where the given address is a participant',
  })
  @ApiParam({ name: 'address', description: 'Wallet address', example: 'cosmos1abc123...' })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  async getConversationsForAddress(@Param('address') address: string) {
    this.logger.log(`Fetching conversations for address: ${address}`);
    return this.messagingService.getConversationsForAddress(address);
  }

  @Get('conversation/:id')
  @ApiOperation({
    summary: 'Get messages in a conversation',
    description: 'Returns paginated messages for a specific conversation ID',
  })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Messages in conversation' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getMessages(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Query() pagination: GetMessagesDto,
  ) {
    return this.messagingService.getMessages(conversationId, pagination);
  }

  @Patch('conversation/:id/read')
  @ApiOperation({
    summary: 'Mark messages as read',
    description: 'Marks all unread messages in a conversation as read for the given address',
  })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiQuery({ name: 'address', required: true, type: String, description: 'Reader wallet address' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markRead(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Query('address') address: string,
  ) {
    await this.messagingService.markRead(conversationId, address);
    return { success: true, conversationId, address };
  }

  @Get('unread/:address')
  @ApiOperation({
    summary: 'Get unread message count',
    description: 'Returns the count of unread messages for an address',
  })
  @ApiParam({ name: 'address', description: 'Wallet address' })
  @ApiResponse({ status: 200, description: 'Unread message count' })
  async getUnreadCount(@Param('address') address: string) {
    return this.messagingService.getUnreadCount(address);
  }
}
