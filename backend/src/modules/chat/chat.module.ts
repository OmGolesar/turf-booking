import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiscoveryModule } from '../discovery/discovery.module';
import { BookingModule } from '../booking/booking.module';
import { CustomersModule } from '../customers/customers.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatAgentService, ANTHROPIC_CLIENT, anthropicClientFactory } from './chat-agent.service';
import { ChatToolsService } from './chat-tools.service';
import { ChatRecommenderService } from './chat-recommender.service';

// AvailabilityModule is @Global(), so we don't import it here — the availability
// service is already in scope. Discovery/Booking/Customers are not global, so
// we import them to reuse their services instead of duplicating query code.

@Module({
  imports: [DiscoveryModule, BookingModule, CustomersModule],
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
