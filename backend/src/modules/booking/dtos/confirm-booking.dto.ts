import { IsString, IsUUID, MaxLength } from 'class-validator';

export class ConfirmBookingDto {
  @IsUUID() booking_session_id!: string;
  @IsString() @MaxLength(200) razorpay_payment_id!: string;
  @IsString() @MaxLength(200) razorpay_order_id!: string;
  @IsString() @MaxLength(200) razorpay_signature!: string;
}
