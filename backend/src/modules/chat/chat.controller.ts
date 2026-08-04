import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../shared/auth/auth.guard';
import { OptionalAuth } from '../../shared/auth/optional-auth.decorator';
import { Auth } from '../../shared/auth/auth-context.decorator';
import type { AuthContext } from '../../shared/auth/auth-context';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dtos/send-message.dto';

// The chatbot is guest-friendly: @OptionalAuth() lets anonymous users chat
// (they see venues, prices, availability), and identified users get their
// conversations bound to their identity for cross-device continuity.

@Controller('chat')
@UseGuards(FirebaseAuthGuard)
@OptionalAuth()
export class ChatController {
  constructor(private readonly svc: ChatService) {}

  @Post('messages')
  send(@Body() dto: SendMessageDto, @Auth() auth: AuthContext | null) {
    return this.svc.sendMessage(dto, auth);
  }

  @Get('conversations/:id')
  get(@Param('id', new ParseUUIDPipe()) id: string, @Auth() auth: AuthContext | null) {
    return this.svc.getConversation(id, auth);
  }
}
