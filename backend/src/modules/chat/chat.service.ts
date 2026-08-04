import { Injectable } from '@nestjs/common';
import { ChatMessageRole, Prisma } from '@prisma/client';
import type Anthropic from '@anthropic-ai/sdk';
import { ulid } from 'ulid';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { DomainException } from '../../shared/errors/domain.exception';
import type { AuthContext } from '../../shared/auth/auth-context';
import { ChatAgentService, type UserContext } from './chat-agent.service';
import type { ChatHandoff } from './chat-tools.service';
import type { SendMessageDto } from './dtos/send-message.dto';

// A conversation is a persistent stream of turns. The client always POSTs the
// next user message to /v1/chat/messages, optionally with a conversation_id;
// omit it and we open a new conversation for them.
//
// Every message row stores the canonical Anthropic block shape in `content`.
// That way replaying the DB against Anthropic is lossless.

export interface SendMessageResult {
  conversation_id: string;
  message_id: string;
  reply: string;
  tools_used: Array<{ name: string; ok: boolean; error_code?: string }>;
  latency_ms: number;
  // Non-null when a tool this turn produced state the CLIENT must consume —
  // e.g. after `hold_slot` succeeds, the app opens Razorpay Checkout with
  // the returned order + amount, then posts the signature to POST /v1/bookings.
  handoff: ChatHandoff | null;
}

interface StoredMessageRow {
  role: ChatMessageRole;
  content: Prisma.JsonValue;
  sequenceNo: number;
}

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService, private readonly agent: ChatAgentService) {}

  async sendMessage(dto: SendMessageDto, auth: AuthContext | null): Promise<SendMessageResult> {
    const conversation = await this.resolveConversation(dto.conversation_id, auth);
    const history = await this.loadHistory(conversation.id);
    const nextSeq = history.length;
    const requestId = ulid();

    // Phone-verification status is enforced deep in BookingSessionService and
    // surfaced back as IDENTITY_PHONE_NOT_VERIFIED via the tool error path — no
    // need to preflight it here on every message.
    const ctx: UserContext = {
      lat: dto.lat,
      lng: dto.lng,
      now_iso: dto.client_now_iso ?? new Date().toISOString(),
      is_authenticated: auth != null,
    };

    const result = await this.agent.run({
      history: this.hydrateForAgent(history),
      userMessage: dto.message,
      ctx,
      toolCtx: { auth, requestId },
    });

    // Persist every produced turn atomically so a mid-run crash doesn't leave
    // orphan messages the next replay would fail on. `result.turns` already
    // includes the user's own message as turn[0].
    const created = await this.prisma.$transaction(async (tx) => {
      let finalMessageId: string | null = null;
      for (let i = 0; i < result.turns.length; i++) {
        const turn = result.turns[i];
        const isFinal = i === result.turns.length - 1;
        const row = await tx.chatMessage.create({
          data: {
            conversationId: conversation.id,
            sequenceNo: nextSeq + i,
            role: mapRole(turn.role),
            content: turn.content as unknown as Prisma.InputJsonValue,
            ...(isFinal
              ? {
                  latencyMs: result.latency_ms,
                  inputTokens: result.usage.input_tokens,
                  outputTokens: result.usage.output_tokens,
                }
              : {}),
          },
        });
        if (isFinal) finalMessageId = row.id;
      }
      await tx.chatConversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date(), title: conversation.title ?? deriveTitle(dto.message) },
      });
      return { finalMessageId };
    });

    if (!created.finalMessageId) {
      throw new DomainException('SYSTEM_INTERNAL_ERROR', { message: 'Chat message persistence returned no id.' });
    }

    return {
      conversation_id: conversation.id,
      message_id: created.finalMessageId,
      reply: result.reply,
      tools_used: result.toolTrace.map((t) => ({ name: t.name, ok: t.ok, error_code: t.error_code })),
      latency_ms: result.latency_ms,
      handoff: result.handoff,
    };
  }

  async getConversation(id: string, auth: AuthContext | null) {
    const conv = await this.prisma.chatConversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { sequenceNo: 'asc' } } },
    });
    if (!conv) throw new DomainException('RESOURCE_NOT_FOUND', { message: 'Conversation not found.' });
    // Guest conversations are anyone's to read (they can't guess a UUID).
    // Owned conversations require matching identity.
    if (conv.identityId && conv.identityId !== auth?.identityId) {
      throw new DomainException('AUTH_INSUFFICIENT_PERMISSIONS');
    }
    return {
      id: conv.id,
      title: conv.title,
      created_at: conv.createdAt.toISOString(),
      last_message_at: conv.lastMessageAt.toISOString(),
      messages: conv.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        created_at: m.createdAt.toISOString(),
      })),
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private async resolveConversation(id: string | undefined, auth: AuthContext | null) {
    if (id) {
      const existing = await this.prisma.chatConversation.findUnique({ where: { id } });
      if (!existing) throw new DomainException('RESOURCE_NOT_FOUND', { message: 'Conversation not found.' });
      if (existing.identityId && existing.identityId !== auth?.identityId) {
        throw new DomainException('AUTH_INSUFFICIENT_PERMISSIONS');
      }
      return existing;
    }
    return this.prisma.chatConversation.create({
      data: { identityId: auth?.identityId ?? null },
    });
  }

  private async loadHistory(conversationId: string): Promise<StoredMessageRow[]> {
    return this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { sequenceNo: 'asc' },
      select: { role: true, content: true, sequenceNo: true },
    });
  }

  private hydrateForAgent(rows: StoredMessageRow[]): Anthropic.MessageParam[] {
    // Roles in the DB use our enum (USER/ASSISTANT/TOOL/SYSTEM). Anthropic only
    // sees 'user' / 'assistant'. Tool results are stored under role=USER because
    // that is where Anthropic expects them (as tool_result blocks in a user turn).
    return rows.map((r) => ({
      role: r.role === ChatMessageRole.ASSISTANT ? 'assistant' : 'user',
      content: r.content as Anthropic.MessageParam['content'],
    }));
  }
}

function mapRole(anthropicRole: 'user' | 'assistant'): ChatMessageRole {
  return anthropicRole === 'assistant' ? ChatMessageRole.ASSISTANT : ChatMessageRole.USER;
}

function deriveTitle(userMessage: string): string {
  const trimmed = userMessage.trim().replace(/\s+/g, ' ');
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed;
}
