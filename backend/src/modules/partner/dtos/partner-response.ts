import type { Partner } from '@prisma/client';

export interface PartnerResource {
  id: string;
  reference_code: string;
  business_name: string;
  display_name: string;
  email: string | null;
  phone: string;
  address: string | null;
  city: string;
  state: string;
  status: Partner['status'];
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export function toPartnerResource(p: Partner): PartnerResource {
  return {
    id: p.id,
    reference_code: p.referenceCode,
    business_name: p.businessName,
    display_name: p.displayName,
    email: p.email,
    phone: p.phone,
    address: p.address,
    city: p.city,
    state: p.state,
    status: p.status,
    is_verified: p.isVerified,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}
