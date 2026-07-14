import type { Venue, VenueMedia, Ground, Sport, Partner } from '@prisma/client';

export interface VenueMediaResource {
  id: string;
  file_url: string;
  media_type: VenueMedia['mediaType'];
  display_order: number;
}

export interface VenueResource {
  id: string;
  reference_code: string;
  partner_id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string;
  area: string | null;
  city: string;
  state: string;
  postal_code: string | null;
  latitude: string;
  longitude: string;
  google_maps_url: string | null;
  amenities: unknown;
  status: Venue['status'];
  average_rating: number;
  total_reviews: number;
  media: VenueMediaResource[];
  grounds_count: number;
  created_at: string;
  updated_at: string;
}

export interface VenueDetailResource extends VenueResource {
  partner: { id: string; reference_code: string; display_name: string };
  grounds: Array<{
    id: string;
    reference_code: string;
    name: string;
    sport: { id: string; code: string; display_name: string; icon_url: string | null };
    surface_type: Ground['surfaceType'];
    max_players: number;
    status: Ground['status'];
  }>;
}

export function toVenueMediaResource(m: VenueMedia): VenueMediaResource {
  return { id: m.id, file_url: m.fileUrl, media_type: m.mediaType, display_order: m.displayOrder };
}

export function toVenueResource(v: Venue & { media?: VenueMedia[]; grounds?: Ground[] }): VenueResource {
  return {
    id: v.id,
    reference_code: v.referenceCode,
    partner_id: v.partnerId,
    name: v.name,
    slug: v.slug,
    description: v.description,
    phone: v.phone,
    email: v.email,
    address: v.address,
    area: v.area,
    city: v.city,
    state: v.state,
    postal_code: v.postalCode,
    latitude: v.latitude.toString(),
    longitude: v.longitude.toString(),
    google_maps_url: v.googleMapsUrl,
    amenities: v.amenities,
    status: v.status,
    average_rating: v.averageRating,
    total_reviews: v.totalReviews,
    media: (v.media ?? [])
      .filter((m) => m.deletedAt == null)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(toVenueMediaResource),
    grounds_count: v.grounds?.length ?? 0,
    created_at: v.createdAt.toISOString(),
    updated_at: v.updatedAt.toISOString(),
  };
}

export function toVenueDetailResource(
  v: Venue & { media: VenueMedia[]; partner: Partner; grounds: Array<Ground & { sport: Sport }> },
): VenueDetailResource {
  return {
    ...toVenueResource(v),
    partner: { id: v.partner.id, reference_code: v.partner.referenceCode, display_name: v.partner.displayName },
    grounds: v.grounds
      .filter((g) => g.deletedAt == null)
      .map((g) => ({
        id: g.id,
        reference_code: g.referenceCode,
        name: g.name,
        sport: { id: g.sport.id, code: g.sport.code, display_name: g.sport.displayName, icon_url: g.sport.iconUrl },
        surface_type: g.surfaceType,
        max_players: g.maxPlayers,
        status: g.status,
      })),
  };
}
