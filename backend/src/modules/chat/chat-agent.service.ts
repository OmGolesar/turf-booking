import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { ChatToolsService } from './chat-tools.service';
import { TOOL_DEFINITIONS } from './tools/tool-definitions';
import { DomainException } from '../../shared/errors/domain.exception';
import type { AppConfig } from '../../config/configuration';

// Anthropic API surface we care about — kept narrow to what the loop actually reads.
type ContentBlock = Anthropic.ContentBlock;
type MessageParam = Anthropic.MessageParam;

export interface UserContext {
  lat?: number;
  lng?: number;
  now_iso: string;         // client-supplied to keep the LLM deterministic across sessions
  is_authenticated: boolean;
}

export interface AgentRunInput {
  history: MessageParam[];  // prior conversation (already validated)
  userMessage: string;
  ctx: UserContext;
}

export interface AgentRunOutput {
  assistantBlocks: ContentBlock[];  // Anthropic's final assistant turn (text + any residual tool_use we didn't run)
  reply: string;                    // concatenated text — for the client
  toolTrace: Array<{ name: string; input: unknown; ok: boolean; error_code?: string }>;
  turns: MessageParam[];            // full turns to persist (user + tool_use rounds + final assistant)
  usage: { input_tokens: number; output_tokens: number };
  latency_ms: number;
}

export const ANTHROPIC_CLIENT = Symbol('ANTHROPIC_CLIENT');

@Injectable()
export class ChatAgentService {
  private readonly logger = new Logger(ChatAgentService.name);
  private readonly model: string;
  private readonly maxIterations: number;

  constructor(
    @Inject(ANTHROPIC_CLIENT) private readonly client: Anthropic,
    private readonly tools: ChatToolsService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {
    this.model = config.get('ANTHROPIC_MODEL', { infer: true });
    this.maxIterations = config.get('CHAT_MAX_TOOL_ITERATIONS', { infer: true });
  }

  async run(input: AgentRunInput): Promise<AgentRunOutput> {
    const started = Date.now();
    const messages: MessageParam[] = [
      ...input.history,
      { role: 'user', content: input.userMessage },
    ];
    const toolTrace: AgentRunOutput['toolTrace'] = [];
    const usage = { input_tokens: 0, output_tokens: 0 };

    for (let iter = 0; iter < this.maxIterations; iter++) {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: this.systemPrompt(input.ctx),
        tools: TOOL_DEFINITIONS,
        messages,
      });
      usage.input_tokens += response.usage.input_tokens;
      usage.output_tokens += response.usage.output_tokens;

      // Persist assistant turn immediately so we can hand tool_results back next iteration.
      messages.push({ role: 'assistant', content: response.content });

      if (response.stop_reason !== 'tool_use') {
        return {
          assistantBlocks: response.content,
          reply: extractText(response.content),
          toolTrace,
          turns: messages.slice(input.history.length),
          usage,
          latency_ms: Date.now() - started,
        };
      }

      // Execute each tool_use block in parallel; append tool_result blocks in one user turn.
      const toolUses = response.content.filter(
        (b): b is Extract<ContentBlock, { type: 'tool_use' }> => b.type === 'tool_use',
      );
      const toolResults = await Promise.all(
        toolUses.map(async (u) => {
          const result = await this.tools.execute(u.name, u.input as Record<string, unknown>);
          toolTrace.push({
            name: u.name,
            input: u.input,
            ok: result.ok,
            error_code: result.error?.code,
          });
          return {
            type: 'tool_result' as const,
            tool_use_id: u.id,
            content: JSON.stringify(result.ok ? result.data : result.error),
            is_error: !result.ok,
          };
        }),
      );
      messages.push({ role: 'user', content: toolResults });
    }

    // Hit the iteration cap. Ask the model for a final answer without tools so we always land on text.
    this.logger.warn(`Chat agent hit ${this.maxIterations}-iteration cap; forcing final answer.`);
    const finalResponse = await this.client.messages.create({
      model: this.model,
      max_tokens: 512,
      system:
        this.systemPrompt(input.ctx) +
        '\n\nYou have exhausted your tool budget. Answer with whatever you have — do not call more tools.',
      messages,
    });
    usage.input_tokens += finalResponse.usage.input_tokens;
    usage.output_tokens += finalResponse.usage.output_tokens;
    messages.push({ role: 'assistant', content: finalResponse.content });

    return {
      assistantBlocks: finalResponse.content,
      reply: extractText(finalResponse.content),
      toolTrace,
      turns: messages.slice(input.history.length),
      usage,
      latency_ms: Date.now() - started,
    };
  }

  private systemPrompt(ctx: UserContext): string {
    const location = ctx.lat != null && ctx.lng != null
      ? `The user is at latitude ${ctx.lat}, longitude ${ctx.lng} (Nashik area).`
      : 'The user has not shared their GPS location.';
    const auth = ctx.is_authenticated
      ? 'The user is signed in.'
      : 'The user is a guest (not signed in).';

    return [
      'You are TurfX Concierge, an assistant for booking turfs in Nashik, India.',
      `The current IST time is ${ctx.now_iso}. Convert relative times ("tonight", "tomorrow 8pm") into concrete YYYY-MM-DD and HH:MM values before calling tools.`,
      location,
      auth,
      '',
      'Rules:',
      '- Only answer using data returned by your tools. Never invent turf names, prices, addresses, ratings, or slot times.',
      '- Prices are in paise. When talking to the user, always convert to ₹ (divide by 100) and round to whole rupees.',
      '- When the user asks for a recommendation ("best turf", "which one should I pick"), call `recommend_best` — do NOT just search and eyeball.',
      '- Prefer `find_nearby_venues` over `search_venues` when the user says "near me" or omits a location.',
      '- Keep replies short: 3-6 sentences. Lead with the top pick, then 1-2 alternatives if useful. End with a single actionable question.',
      '- If a tool returns an error, tell the user what went wrong in plain language and offer the next best step. Do not surface error codes.',
      '- Never book anything. If the user asks to book, tell them the booking flow is coming soon and to tap the "Book" button on the venue.',
    ].join('\n');
  }
}

function extractText(blocks: ContentBlock[]): string {
  return blocks
    .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

export function anthropicClientFactory(config: ConfigService<AppConfig, true>): Anthropic {
  const apiKey = config.get('ANTHROPIC_API_KEY', { infer: true });
  if (!apiKey) {
    // Config schema already rejects empty, but belt-and-braces.
    throw new DomainException('SYSTEM_DEPENDENCY_UNAVAILABLE', { message: 'ANTHROPIC_API_KEY is not configured.' });
  }
  return new Anthropic({ apiKey });
}
