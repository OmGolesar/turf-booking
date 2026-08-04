import { ChatAgentService } from './chat-agent.service';

// The agent loop is the trickiest part. We fake Anthropic with a scripted
// sequence of responses and verify:
//   1. tool_use response → tools.execute() called → tool_result appended → next call sent
//   2. end_turn response → loop exits with concatenated text
//   3. Iteration cap → forces a final non-tool call

function fakeClient(responses: any[]) {
  const create = jest.fn();
  for (const r of responses) create.mockResolvedValueOnce(r);
  return { messages: { create } } as any;
}

function makeConfig(maxIter = 4) {
  return {
    get: jest.fn((key: string) => {
      if (key === 'ANTHROPIC_MODEL') return 'claude-sonnet-4-5-20250929';
      if (key === 'CHAT_MAX_TOOL_ITERATIONS') return maxIter;
      return undefined;
    }),
  } as any;
}

const usage = { input_tokens: 10, output_tokens: 5 };

describe('ChatAgentService', () => {
  it('runs a single-turn end_turn response with no tools', async () => {
    const client = fakeClient([
      {
        content: [{ type: 'text', text: 'Hi there!' }],
        stop_reason: 'end_turn',
        usage,
      },
    ]);
    const tools = { execute: jest.fn() } as any;
    const svc = new ChatAgentService(client, tools, makeConfig());
    const out = await svc.run({
      history: [],
      userMessage: 'hi',
      ctx: { now_iso: '2026-08-04T18:00:00+05:30', is_authenticated: false },
    });
    expect(out.reply).toBe('Hi there!');
    expect(out.toolTrace).toEqual([]);
    expect(tools.execute).not.toHaveBeenCalled();
    // turns = [user, assistant]
    expect(out.turns).toHaveLength(2);
    expect(out.turns[0].role).toBe('user');
    expect(out.turns[1].role).toBe('assistant');
  });

  it('handles a tool_use → tool_result → final text roundtrip', async () => {
    const client = fakeClient([
      {
        content: [
          { type: 'tool_use', id: 'tu_1', name: 'find_nearby_venues', input: { lat: 20, lng: 73 } },
        ],
        stop_reason: 'tool_use',
        usage,
      },
      {
        content: [{ type: 'text', text: '2 turfs found: V1, V2.' }],
        stop_reason: 'end_turn',
        usage,
      },
    ]);
    const tools = {
      execute: jest.fn().mockResolvedValue({ ok: true, data: { venues: [{ id: 'v1' }, { id: 'v2' }] } }),
    } as any;
    const svc = new ChatAgentService(client, tools, makeConfig());
    const out = await svc.run({
      history: [],
      userMessage: 'near me',
      ctx: { lat: 20, lng: 73, now_iso: '2026-08-04T18:00:00+05:30', is_authenticated: false },
    });
    expect(tools.execute).toHaveBeenCalledWith('find_nearby_venues', { lat: 20, lng: 73 });
    expect(out.reply).toContain('2 turfs found');
    expect(out.toolTrace).toEqual([{ name: 'find_nearby_venues', input: { lat: 20, lng: 73 }, ok: true, error_code: undefined }]);
    // turns = [user, assistant(tool_use), user(tool_result), assistant(text)]
    expect(out.turns).toHaveLength(4);
  });

  it('records tool errors in the trace but keeps the loop running', async () => {
    const client = fakeClient([
      {
        content: [{ type: 'tool_use', id: 'tu_1', name: 'get_venue_details', input: { venue_id_or_slug: 'ghost' } }],
        stop_reason: 'tool_use',
        usage,
      },
      {
        content: [{ type: 'text', text: 'Sorry — that venue does not exist.' }],
        stop_reason: 'end_turn',
        usage,
      },
    ]);
    const tools = {
      execute: jest.fn().mockResolvedValue({ ok: false, error: { code: 'VENUE_NOT_FOUND', message: '...' } }),
    } as any;
    const svc = new ChatAgentService(client, tools, makeConfig());
    const out = await svc.run({
      history: [],
      userMessage: 'tell me about ghost',
      ctx: { now_iso: '2026-08-04T18:00:00+05:30', is_authenticated: false },
    });
    expect(out.toolTrace[0]).toMatchObject({ name: 'get_venue_details', ok: false, error_code: 'VENUE_NOT_FOUND' });
    expect(out.reply).toMatch(/does not exist/);
  });

  it('caps at maxIterations and forces a final answer', async () => {
    // 3 tool-use responses in a row, then the forced final call answers plainly.
    const client = fakeClient([
      { content: [{ type: 'tool_use', id: 'tu_1', name: 'search_venues', input: {} }], stop_reason: 'tool_use', usage },
      { content: [{ type: 'tool_use', id: 'tu_2', name: 'search_venues', input: {} }], stop_reason: 'tool_use', usage },
      { content: [{ type: 'tool_use', id: 'tu_3', name: 'search_venues', input: {} }], stop_reason: 'tool_use', usage },
      { content: [{ type: 'text', text: 'Cap hit — final answer.' }], stop_reason: 'end_turn', usage },
    ]);
    const tools = { execute: jest.fn().mockResolvedValue({ ok: true, data: {} }) } as any;
    const svc = new ChatAgentService(client, tools, makeConfig(3));
    const out = await svc.run({
      history: [],
      userMessage: '?',
      ctx: { now_iso: '2026-08-04T18:00:00+05:30', is_authenticated: false },
    });
    expect(client.messages.create).toHaveBeenCalledTimes(4); // 3 loop + 1 forced
    expect(out.reply).toBe('Cap hit — final answer.');
  });
});
