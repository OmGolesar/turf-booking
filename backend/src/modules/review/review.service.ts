import { Injectable } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { OutboxService } from '../../shared/outbox/outbox.service';
import { AuditService } from '../../shared/audit/audit.service';
import { DomainException } from '../../shared/errors/domain.exception';
import type { AuthContext } from '../../shared/auth/auth-context';
import type { CreateReviewDto } from './dtos/create-review.dto';

interface RequestMeta { requestId?: string; route?: string; sourceIp?: string; userAgent?: string }

@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  // POST /bookings/:id/review — one review per booking, only after COMPLETED.
  async create(ctx: AuthContext, bookingId: string, dto: CreateReviewDto, meta: RequestMeta) {
    // Class-validator already caught out-of-range, but the spec code exists so callers
    // that bypass validation still hit a domain error rather than a generic 400.
    if (!Number.isInteger(dto.rating) || dto.rating < 1 || dto.rating > 5) {
      throw new DomainException('REVIEW_RATING_OUT_OF_RANGE');
    }

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      select: { id: true, referenceCode: true, identityId: true, venueId: true, bookingStatus: true, review: { select: { id: true } } },
    });
    if (!booking) throw new DomainException('BOOKING_NOT_FOUND');
    if (booking.identityId !== ctx.identityId) throw new DomainException('BOOKING_NOT_FOUND');
    if (booking.bookingStatus !== BookingStatus.COMPLETED) throw new DomainException('REVIEW_BOOKING_NOT_COMPLETED');
    if (booking.review) throw new DomainException('REVIEW_ALREADY_EXISTS');

    const review = await this.prisma.$transaction(async (tx) => {
      let created;
      try {
        created = await tx.review.create({
          data: {
            bookingId: booking.id,
            venueId: booking.venueId,
            identityId: ctx.identityId,
            rating: dto.rating,
            reviewText: dto.review_text ?? null,
          },
        });
      } catch (err) {
        // Race: two concurrent POSTs. The @unique on booking_id catches it.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new DomainException('REVIEW_ALREADY_EXISTS');
        }
        throw err;
      }
      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'ReviewSubmitted',
        resourceType: 'Review',
        resourceId: created.id,
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Review',
        aggregateId: created.id,
        eventType: 'ReviewSubmitted',
        payload: {
          review_id: created.id,
          booking_id: booking.id,
          booking_reference: booking.referenceCode,
          venue_id: booking.venueId,
          identity_id: ctx.identityId,
          rating: created.rating,
        },
        correlationId: meta.requestId,
      });
      return created;
    });

    return {
      id: review.id,
      rating: review.rating,
      review_text: review.reviewText,
      created_at: review.createdAt.toISOString(),
    };
  }
}
