import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { SendMessageDto, GetMessagesDto } from './dto/message.dto';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(private readonly prisma: PrismaService) {}

  private getConversationParticipants(
    address1: string,
    address2: string,
  ): { participant1: string; participant2: string } {
    // Ensure deterministic ordering
    const [participant1, participant2] = [address1, address2].sort();
    return { participant1, participant2 };
  }

  async sendMessage(dto: SendMessageDto): Promise<any> {
    // Verify sender exists
    const sender = await this.prisma.user.findUnique({
      where: { id: dto.senderId },
    });

    if (!sender) {
      throw new NotFoundException(`Sender with id ${dto.senderId} not found`);
    }

    const { participant1, participant2 } = this.getConversationParticipants(
      sender.address,
      dto.recipientAddress,
    );

    // Upsert conversation
    const conversation = await this.prisma.conversation.upsert({
      where: {
        participant1_participant2: { participant1, participant2 },
      },
      create: { participant1, participant2 },
      update: {},
    });

    // Create message
    const message = await this.prisma.message.create({
      data: {
        senderId: dto.senderId,
        recipientAddress: dto.recipientAddress,
        encryptedContent: dto.encryptedContent,
        nonce: dto.nonce,
        conversationId: conversation.id,
      },
    });

    // Update conversation last message timestamp
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: dto.encryptedContent.substring(0, 50),
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `Message sent from ${sender.address} to ${dto.recipientAddress}`,
    );

    return {
      ...message,
      conversationId: conversation.id,
    };
  }

  async getConversation(conversationId: string): Promise<any> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
          take: 50,
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    return conversation;
  }

  async getConversationByAddresses(address1: string, address2: string): Promise<any> {
    const { participant1, participant2 } = this.getConversationParticipants(address1, address2);

    const conversation = await this.prisma.conversation.findUnique({
      where: {
        participant1_participant2: { participant1, participant2 },
      },
    });

    if (!conversation) {
      return null;
    }

    return conversation;
  }

  async getMessages(conversationId: string, pagination: GetMessagesDto): Promise<any> {
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(200, Math.max(1, pagination.limit || 50));
    const skip = (page - 1) * limit;

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    return {
      conversationId,
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getConversationsForAddress(address: string): Promise<any> {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ participant1: address }, { participant2: address }],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    return {
      address,
      conversations: conversations.map((c: any) => ({
        id: c.id,
        participant1: c.participant1,
        participant2: c.participant2,
        otherParticipant: c.participant1 === address ? c.participant2 : c.participant1,
        lastMessage: c.lastMessage,
        updatedAt: c.updatedAt,
        latestMessage: c.messages[0] || null,
      })),
      count: conversations.length,
    };
  }

  async markRead(conversationId: string, readerAddress: string): Promise<void> {
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        recipientAddress: readerAddress,
        read: false,
      },
      data: { read: true },
    });

    this.logger.log(
      `Marked messages as read in conversation ${conversationId} for ${readerAddress}`,
    );
  }

  async getUnreadCount(address: string): Promise<{ address: string; unreadCount: number }> {
    const count = await this.prisma.message.count({
      where: {
        recipientAddress: address,
        read: false,
      },
    });

    return { address, unreadCount: count };
  }
}
