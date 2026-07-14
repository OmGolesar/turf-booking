import { Matches } from 'class-validator';

// India-only E.164: +91 followed by a 10-digit number starting 6-9.
export const INDIA_E164_REGEX = /^\+91[6-9]\d{9}$/;

export class PhoneDto {
  @Matches(INDIA_E164_REGEX, {
    message: 'Phone must be a valid Indian mobile number in E.164 format (e.g. +919876543210).',
  })
  phone!: string;
}
