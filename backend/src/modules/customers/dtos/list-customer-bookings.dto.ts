import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { BookingStatus } from '@prisma/client';

const STATUSES = Object.values(BookingStatus);
const TIMEFRAMES = ['UPCOMING', 'PAST', 'ALL'] as const;

const toList = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.split(',').map((s) => s.trim()).filter(Boolean) : value;

export class ListCustomerBookingsDto {
  @IsOptional() @Transform(toList) @IsIn(STATUSES, { each: true }) status?: BookingStatus[];
  @IsOptional() @IsIn(TIMEFRAMES) timeframe?: (typeof TIMEFRAMES)[number];
  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsString() cursor?: string;
}
