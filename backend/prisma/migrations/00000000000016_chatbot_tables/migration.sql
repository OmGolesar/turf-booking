-- Chatbot tables: conversations + messages.
-- Guests allowed → identity_id is nullable.
-- content JSONB matches Anthropic Messages API block shape (text | tool_use | tool_result)
-- so a conversation replay always reproduces the same LLM state.

CREATE TYPE "ChatMessageRole" AS ENUM ('USER', 'ASSISTANT', 'TOOL', 'SYSTEM');

CREATE TABLE "chat_conversations" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "identity_id"     UUID REFERENCES "identities"("id"),
  "title"           VARCHAR(120),
  "last_message_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "created_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_chat_conv_identity_last"
  ON "chat_conversations" ("identity_id", "last_message_at" DESC);
CREATE INDEX "idx_chat_conv_last"
  ON "chat_conversations" ("last_message_at" DESC);

CREATE TABLE "chat_messages" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" UUID NOT NULL REFERENCES "chat_conversations"("id") ON DELETE CASCADE,
  "sequence_no"     INTEGER NOT NULL,
  "role"            "ChatMessageRole" NOT NULL,
  "content"         JSONB NOT NULL,
  "latency_ms"      INTEGER,
  "input_tokens"    INTEGER,
  "output_tokens"   INTEGER,
  "created_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX "uq_chat_msg_seq"
  ON "chat_messages" ("conversation_id", "sequence_no");
CREATE INDEX "idx_chat_msg_conv_seq"
  ON "chat_messages" ("conversation_id", "sequence_no");
