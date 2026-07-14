import type { Role, UserStatus } from '@prisma/client';

export interface AuthContext {
  identityId: string;
  firebaseUid: string;
  role: Role;
  status: UserStatus;
  partnerId?: string;
  isVerified: boolean;
}
