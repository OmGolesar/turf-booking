import type { Ground, GroundConfiguration, GroundMedia, Sport } from '@prisma/client';

export interface GroundResource {
  id: string;
  reference_code: string;
  venue_id: string;
  name: string;
  sport: { id: string; code: string; display_name: string; icon_url: string | null } | null;
  surface_type: Ground['surfaceType'];
  indoor: boolean;
  max_players: number;
  lighting: boolean;
  description: string | null;
  status: Ground['status'];
  configuration: GroundConfigurationResource | null;
  media: GroundMediaResource[];
  created_at: string;
  updated_at: string;
}

export interface GroundConfigurationResource {
  booking_duration: number;
  booking_interval: number;
  buffer_time: number;
  cleaning_time: number;
  max_advance_booking_days: number;
  min_notice_minutes: number;
  cancellation_window_hours: number;
}

export interface GroundMediaResource {
  id: string;
  file_url: string;
  display_order: number;
}

export function toGroundConfigurationResource(c: GroundConfiguration | null): GroundConfigurationResource | null {
  if (!c) return null;
  return {
    booking_duration: c.bookingDuration,
    booking_interval: c.bookingInterval,
    buffer_time: c.bufferTime,
    cleaning_time: c.cleaningTime,
    max_advance_booking_days: c.maxAdvanceBookingDays,
    min_notice_minutes: c.minNoticeMinutes,
    cancellation_window_hours: c.cancellationWindowHours,
  };
}

export function toGroundMediaResource(m: GroundMedia): GroundMediaResource {
  return { id: m.id, file_url: m.fileUrl, display_order: m.displayOrder };
}

export function toGroundResource(
  g: Ground & { sport?: Sport | null; configuration?: GroundConfiguration | null; media?: GroundMedia[] },
): GroundResource {
  return {
    id: g.id,
    reference_code: g.referenceCode,
    venue_id: g.venueId,
    name: g.name,
    sport: g.sport
      ? { id: g.sport.id, code: g.sport.code, display_name: g.sport.displayName, icon_url: g.sport.iconUrl }
      : null,
    surface_type: g.surfaceType,
    indoor: g.indoor,
    max_players: g.maxPlayers,
    lighting: g.lighting,
    description: g.description,
    status: g.status,
    configuration: toGroundConfigurationResource(g.configuration ?? null),
    media: (g.media ?? [])
      .filter((m) => m.deletedAt == null)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(toGroundMediaResource),
    created_at: g.createdAt.toISOString(),
    updated_at: g.updatedAt.toISOString(),
  };
}
