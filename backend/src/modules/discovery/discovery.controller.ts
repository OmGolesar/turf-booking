import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../shared/auth/auth.guard';
import { OptionalAuth } from '../../shared/auth/optional-auth.decorator';
import { Auth } from '../../shared/auth/auth-context.decorator';
import type { AuthContext } from '../../shared/auth/auth-context';
import { DiscoveryService } from './discovery.service';
import { AvailabilityQueryDto, ListReviewsDto, ListVenuesDto, NearMeDto } from './dtos/list-venues.dto';

// Discovery is guest-friendly; @OptionalAuth() lets the FirebaseAuthGuard
// accept anonymous requests and attach req.auth = null for personalisation
// (is_favourited).

@Controller('discovery')
@UseGuards(FirebaseAuthGuard)
@OptionalAuth()
export class DiscoveryController {
  constructor(private readonly svc: DiscoveryService) {}

  @Get('venues')
  listVenues(@Query() dto: ListVenuesDto) {
    return this.svc.listVenues(dto);
  }

  @Get('venues/:idOrSlug')
  venueDetail(@Param('idOrSlug') idOrSlug: string, @Auth() ctx: AuthContext | null) {
    return this.svc.venueDetail(idOrSlug, ctx);
  }

  @Get('venues/:id/grounds')
  listVenueGrounds(@Param('id') id: string, @Query('sport') sport?: string) {
    return this.svc.listVenueGrounds(id, sport);
  }

  @Get('grounds/:id')
  groundDetail(@Param('id') id: string) {
    return this.svc.groundDetail(id);
  }

  @Get('grounds/:id/availability')
  groundAvailability(@Param('id') id: string, @Query() dto: AvailabilityQueryDto) {
    return this.svc.getAvailability(id, dto.date, dto.duration);
  }

  @Get('grounds/:id/reviews')
  groundReviews(@Param('id') id: string, @Query() dto: ListReviewsDto) {
    return this.svc.reviewsForGround(id, Math.min(100, Math.max(1, dto.limit ?? 20)), dto.cursor);
  }

  @Get('near-me')
  nearMe(@Query() dto: NearMeDto) {
    return this.svc.nearMe(dto);
  }

  @Get('featured')
  featured() {
    return this.svc.featured();
  }
}
