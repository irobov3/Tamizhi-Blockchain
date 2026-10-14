import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WsResponse,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { MessagingService } from './messaging.service';
import { SendMessageDto } from './dto/message.dto';

interface JoinRoomPayload {
  conversationId: string;
  address: string;
}

interface SendMessagePayload extends SendMessageDto {
  conversationId?: string;
}

interface TypingPayload {
  conversationId: string;
  address: string;
  isTyping: boolean;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/messaging',
})
export class MessagingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  private connectedClients: Map<string, string> = new Map(); // socketId -> address

  constructor(private readonly messagingService: MessagingService) {}

  afterInit(server: Server): void {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connected', { socketId: client.id, timestamp: new Date() });
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
    const address = this.connectedClients.get(client.id);
    if (address) {
      this.connectedClients.delete(client.id);
      this.logger.log(`Removed address mapping for socket ${client.id} (${address})`);
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ): Promise<WsResponse<any>> {
    try {
      const { conversationId, address } = payload;

      if (!conversationId || !address) {
        return { event: 'error', data: { message: 'conversationId and address are required' } };
      }

      // Register address<->socket mapping
      this.connectedClients.set(client.id, address);

      // Join the Socket.IO room for this conversation
      await client.join(conversationId);

      this.logger.log(`Socket ${client.id} (${address}) joined room: ${conversationId}`);

      return {
        event: 'joined_room',
        data: {
          conversationId,
          address,
          timestamp: new Date(),
        },
      };
    } catch (error: any) {
      this.logger.error('Error joining room', error.message);
      return { event: 'error', data: { message: error.message } };
    }
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ): Promise<WsResponse<any>> {
    await client.leave(payload.conversationId);
    this.logger.log(`Socket ${client.id} left room: ${payload.conversationId}`);
    return {
      event: 'left_room',
      data: { conversationId: payload.conversationId },
    };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessagePayload,
  ): Promise<WsResponse<any>> {
    try {
      const { conversationId, ...messageDto } = payload;

      if (!messageDto.senderId || !messageDto.recipientAddress || !messageDto.encryptedContent || !messageDto.nonce) {
        return {
          event: 'error',
          data: { message: 'senderId, recipientAddress, encryptedContent, and nonce are required' },
        };
      }

      const savedMessage = await this.messagingService.sendMessage(messageDto);

      // Emit to all participants in the conversation room
      const roomId = savedMessage.conversationId;
      this.server.to(roomId).emit('message_received', {
        ...savedMessage,
        timestamp: new Date(),
      });

      this.logger.log(
        `Message relayed in room ${roomId} from socket ${client.id}`,
      );

      return {
        event: 'message_sent',
        data: {
          messageId: savedMessage.id,
          conversationId: roomId,
          timestamp: savedMessage.timestamp,
        },
      };
    } catch (error: any) {
      this.logger.error('Error sending message via WebSocket', error.message);
      return { event: 'error', data: { message: error.message } };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TypingPayload,
  ): void {
    const { conversationId, address, isTyping } = payload;

    if (!conversationId || !address) return;

    // Broadcast to others in the room (excluding sender)
    client.to(conversationId).emit('typing', {
      conversationId,
      address,
      isTyping,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; address: string },
  ): Promise<WsResponse<any>> {
    try {
      await this.messagingService.markRead(payload.conversationId, payload.address);
      return {
        event: 'messages_marked_read',
        data: { conversationId: payload.conversationId },
      };
    } catch (error: any) {
      return { event: 'error', data: { message: error.message } };
    }
  }

  // Utility: broadcast message to a specific address's connected sockets
  async notifyAddress(address: string, event: string, data: any): Promise<void> {
    const socketIds = Array.from(this.connectedClients.entries())
      .filter(([, addr]) => addr === address)
      .map(([sid]) => sid);

    for (const socketId of socketIds) {
      this.server.to(socketId).emit(event, data);
    }
  }
}
