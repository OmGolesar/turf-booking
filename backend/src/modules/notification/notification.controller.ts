import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../shared/auth/auth.guard';
import { Auth } from '../../shared/auth/auth-context.decorator';
import type { AuthContext } from '../../shared/auth/auth-context';
import { NotificationService } from './notification.service';
import { UpdatePreferencesDto } from './dtos/update-preferences.dto';

@Controller('notifications')
@UseGuards(FirebaseAuthGuard)
export class NotificationController {
  constructor(private readonly svc: NotificationService) {}

  @Get('preferences')
  getPreferences(@Auth() ctx: AuthContext) {
    return this.svc.getPreferences(ctx);
  }

  @Patch('preferences')
  updatePreferences(@Auth() ctx: AuthContext, @Body() dto: UpdatePreferencesDto) {
    return this.svc.updatePreferences(ctx, dto.preferences ?? {});
  }

  @Get('unread-count')
  unreadCount(@Auth() ctx: AuthContext) {
    return this.svc.unreadCount(ctx);
  }
}
