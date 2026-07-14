import type { Identity, IdentityProfile, Partner } from '@prisma/client';

// Wire shape returned by POST /auth/session and GET /auth/me (Part 3.1 §3–§4).

export interface IdentityResource {
  id: string;
  reference_code: string | null;
  firebase_uid: string;
  email: string | null;
  phone: string | null;
  phone_verified: boolean;
  email_verified: boolean;
  role: Identity['role'];
  status: Identity['status'];
  created_at: string;
  last_login_at: string | null;
}

export interface ProfileResource {
  first_name: string;
  last_name: string | null;
  avatar_url: string | null;
  city: string | null;
  language: string | null;
}

export interface PartnerResource {
  id: string;
  reference_code: string;
  business_name: string;
  display_name: string;
  status: Partner['status'];
  is_verified: boolean;
}

export interface SessionResource {
  identity: IdentityResource;
  profile: ProfileResource | null;
  partner: PartnerResource | null;
  is_first_session?: boolean;
}

export function toIdentityResource(identity: Identity): IdentityResource {
  return {
    id: identity.id,
    reference_code: identity.referenceCode,
    firebase_uid: identity.firebaseUid,
    email: identity.email,
    phone: identity.phone,
    phone_verified: Boolean(identity.phoneVerifiedAt),
    email_verified: Boolean(identity.emailVerifiedAt),
    role: identity.role,
    status: identity.status,
    created_at: identity.createdAt.toISOString(),
    last_login_at: identity.lastLoginAt ? identity.lastLoginAt.toISOString() : null,
  };
}

export function toProfileResource(profile: IdentityProfile | null): ProfileResource | null {
  if (!profile) return null;
  return {
    first_name: profile.firstName,
    last_name: profile.lastName,
    avatar_url: profile.avatarUrl,
    city: profile.city,
    language: profile.language,
  };
}

export function toPartnerResource(partner: Partner | null): PartnerResource | null {
  if (!partner) return null;
  return {
    id: partner.id,
    reference_code: partner.referenceCode,
    business_name: partner.businessName,
    display_name: partner.displayName,
    status: partner.status,
    is_verified: partner.isVerified,
  };
}
