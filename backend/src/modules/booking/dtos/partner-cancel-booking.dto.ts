import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class PartnerCancelBookingDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
  // Optional; defaults to full refund of the booking total.
  @IsOptional() @IsInt() @Min(0) refund_amount_paise?: number;
}
