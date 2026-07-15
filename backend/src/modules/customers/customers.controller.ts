import { Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../shared/auth/auth.guard';
import { Auth } from '../../shared/auth/auth-context.decorator';
import type { AuthContext } from '../../shared/auth/auth-context';
import { CustomersService } from './customers.service';
import { ListCustomerBookingsDto } from './dtos/list-customer-bookings.dto';

@Controller('customers/me')
@UseGuards(FirebaseAuthGuard)
export class CustomersController {
  constructor(private readonly svc: CustomersService) {}

  @Post('favourites/venues/:venue_id')
  @HttpCode(200)
  addFavourite(@Auth() ctx: AuthContext, @Param('venue_id') venueId: string) {
    return this.svc.addFavourite(ctx, venueId);
  }

  @Delete('favourites/venues/:venue_id')
  @HttpCode(200)
  removeFavourite(@Auth() ctx: AuthContext, @Param('venue_id') venueId: string) {
    return this.svc.removeFavourite(ctx, venueId);
  }

  @Get('favourites')
  listFavourites(
    @Auth() ctx: AuthContext,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.svc.listFavourites(ctx, limit ? Number(limit) : undefined, cursor);
  }

  @Get('bookings')
  listBookings(@Auth() ctx: AuthContext, @Query() dto: ListCustomerBookingsDto) {
    return this.svc.listMyBookings(ctx, dto);
  }
}
