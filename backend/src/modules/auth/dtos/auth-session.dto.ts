import { IsIn, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';

const ALLOWED_INTENDED: Role[] = [Role.CUSTOMER, Role.PARTNER];

export class AuthSessionDto {
  // ADMIN provisioning is manual (Part 3.1 §3); intended_role from clients is
  // clamped to CUSTOMER/PARTNER — the service further gates PARTNER on
  // X-App-Variant + email/phone verification.
  @IsOptional()
  @IsIn(ALLOWED_INTENDED)
  intended_role?: Role;
}
