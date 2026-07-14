import { Matches } from 'class-validator';
import { INDIA_E164_REGEX } from '../../../shared/validation/dtos/phone.dto';

export class RequestPhoneVerificationDto {
  @Matches(INDIA_E164_REGEX, { message: 'phone must be an E.164 Indian mobile number (e.g. +919876543210).' })
  phone!: string;
}
