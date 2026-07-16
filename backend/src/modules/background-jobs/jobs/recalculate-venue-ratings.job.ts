import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { JobRegistry } from '../job.registry';
import type { JobHandler } from '../job.types';

const JOB_NAME = 'RecalculateVenueRatings';

// Hourly recomputation of venues.average_rating + total_reviews. We touch
// only venues that received a review in the last 2 hours (some slack for
// the cron cadence) — a full-table scan every hour is wasteful even for
// Nashik-scale, and this scales down to zero when nobody's reviewing.
@Injectable()
export class RecalculateVenueRatingsJob implements JobHandler, OnModuleInit {
  private readonly logger = new Logger(RecalculateVenueRatingsJob.name);

  constructor(private readonly prisma: PrismaService, private readonly registry: JobRegistry) {}

  onModuleInit(): void {
    this.registry.register(JOB_NAME, this);
  }

  async run(): Promise<void> {
    const rows = await this.prisma.$queryRaw<Array<{ venue_id: string; avg: number | null; n: bigint }>>(Prisma.sql`
      WITH recent AS (
        SELECT DISTINCT venue_id
          FROM reviews
         WHERE created_at >= NOW() - INTERVAL '2 hours'
      )
      SELECT r.venue_id,
             AVG(rev.rating)::float AS avg,
             COUNT(*)::bigint AS n
        FROM recent r
        JOIN reviews rev ON rev.venue_id = r.venue_id
    GROUP BY r.venue_id
    `);

    if (rows.length === 0) {
      this.logger.debug('[RecalculateVenueRatings] no venues touched in the last 2h');
      return;
    }

    for (const r of rows) {
      await this.prisma.venue.update({
        where: { id: r.venue_id },
        data: {
          averageRating: Number(r.avg ?? 0),
          totalReviews: Number(r.n),
        },
      });
    }
    this.logger.log(`[RecalculateVenueRatings] venues_recalculated=${rows.length}`);
  }
}
