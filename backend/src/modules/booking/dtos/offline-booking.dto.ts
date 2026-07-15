import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { BookingSource, PaymentMethod } from '@prisma/client';
import { INDIA_E164_REGEX } from '../../../shared/validation/dtos/phone.dto';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SOURCES = [BookingSource.WALK_IN, BookingSource.PHONE, BookingSource.WHATSAPP];
const METHODS = [PaymentMethod.CASH, PaymentMethod.UPI, PaymentMethod.CARD];

class OfflineCustomerDto {
  @Matches(INDIA_E164_REGEX, { message: 'phone must be an E.164 Indian mobile number.' })
  phone!: string;
  @IsString() @MaxLength(120) name!: string;
  @IsOptional() @IsEmail() email?: string;
}

class OfflinePaymentDto {
  @IsIn(METHODS) method!: PaymentMethod;
  @IsInt() @Min(1) amount_paise!: number;
  @IsOptional() @IsString() @MaxLength(120) external_reference?: string;
}

export class CreateOfflineBookingDto {
  @IsUUID() ground_id!: string;
  @Matches(DATE_RE) booking_date!: string;
  @Matches(TIME_RE) start_time!: string;
  @IsInt() @Min(15) duration_minutes!: number;

  @IsIn(SOURCES) booking_source!: (typeof SOURCES)[number];

  @ValidateNested() @Type(() => OfflineCustomerDto) customer!: OfflineCustomerDto;
  @ValidateNested() @Type(() => OfflinePaymentDto) payment!: OfflinePaymentDto;

  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
