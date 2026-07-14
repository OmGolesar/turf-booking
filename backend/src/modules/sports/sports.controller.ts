import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { OptionalAuth } from '../../shared/auth/optional-auth.decorator';

// Reference data — anonymous/guest access allowed (Part 3.2 §25).
@Controller('sports')
export class SportsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @OptionalAuth()
  async list() {
    const rows = await this.prisma.sport.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
    return rows.map((s) => ({
      id: s.id,
      code: s.code,
      display_name: s.displayName,
      icon_url: s.iconUrl,
      default_duration_minutes: s.defaultDurationMinutes,
      default_max_players: s.defaultMaxPlayers,
      display_order: s.displayOrder,
    }));
  }
}
