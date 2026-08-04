import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiscoveryModule } from '../discovery/discovery.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatAgentService, ANTHROPIC_CLIENT, anthropicClientFactory } from './chat-agent.service';
import { ChatToolsService } from './chat-tools.service';
import { ChatRecommenderService } from './chat-recommender.service';

// AvailabilityModule is @Global(), so we don't import it here — the availability
// service is already in scope. Discovery is not global, so we import it to reuse
// its listVenues / venueDetail logic instead of duplicating query code.

@Module({
  imports: [DiscoveryModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatAgentService,
    ChatToolsService,
    ChatRecommenderService,
    {
      provide: ANTHROPIC_CLIENT,
      useFactory: anthropicClientFactory,
      inject: [ConfigService],
    },
  ],
  exports: [ChatService],
})
export class ChatModule {}
