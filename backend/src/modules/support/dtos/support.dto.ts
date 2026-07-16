import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class SupportLookupDto {
  @IsString() @MaxLength(32) code!: string;
}

const CATEGORIES = ['BOOKING_ISSUE', 'PAYMENT_ISSUE', 'REFUND_QUERY', 'OTHER'] as const;

export class CreateSupportTicketDto {
  @IsIn(CATEGORIES) category!: (typeof CATEGORIES)[number];
  @IsOptional() @IsString() @MaxLength(32) reference_code?: string;
  @IsString() @MaxLength(2000) description!: string;
  @IsOptional() attachments?: string[];
}
