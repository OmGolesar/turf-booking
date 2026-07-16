import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type { AppConfig } from '../../config/configuration';
import type { VersionCheckDto } from './dtos/version-check.dto';

// Public app settings are stored flat (`platform.support_phone`, `features.reviews`, …).
// This service composes them into the nested response shape the client expects.
@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async config_(): Promise<PlatformConfigResponse> {
    // Never emit is_secret rows. Filter at the DB, not in JS — belt AND braces.
    const rows = await this.prisma.appSetting.findMany({
      where: { partnerId: null, isSecret: false },
      select: { key: true, value: true },
    });
    const flat = new Map(rows.map((r) => [r.key, r.value as unknown]));
    const s = (k: string, d = ''): string => (typeof flat.get(k) === 'string' ? (flat.get(k) as string) : d);
    const b = (k: string, d = false): boolean => (typeof flat.get(k) === 'boolean' ? (flat.get(k) as boolean) : d);

    return {
      support: {
        phone: s('platform.support_phone'),
        email: s('platform.support_email'),
        whatsapp: s('platform.support_whatsapp'),
      },
      currency: s('platform.currency', this.config.get('PLATFORM_CURRENCY', { infer: true })),
      timezone: s('platform.timezone', this.config.get('PLATFORM_TIMEZONE', { infer: true })),
      city: s('platform.city_scope', this.config.get('PLATFORM_CITY', { infer: true })),
      features: {
        whatsapp_bookings: b('features.whatsapp_bookings'),
        walk_in_offline_payments: b('features.walk_in_offline_payments', true),
        reviews: b('features.reviews', true),
        favourites: b('features.favourites', true),
      },
      urls: {
        terms_of_service: s('platform.url_terms', 'https://turfx.in/legal/terms'),
        privacy_policy: s('platform.url_privacy', 'https://turfx.in/legal/privacy'),
        help_centre: s('platform.url_help', 'https://help.turfx.in'),
      },
      // key_id is public-safe per Razorpay spec (client SDK uses it). Read from env,
      // not the SECRET-marked app_settings row.
      razorpay: { key_id: this.config.get('RAZORPAY_KEY_ID', { infer: true }) },
    };
  }

  async versionCheck(dto: VersionCheckDto): Promise<VersionCheckResponse> {
    const base = `platform.${dto.variant.toLowerCase()}.${dto.platform.toLowerCase()}`;
    const rows = await this.prisma.appSetting.findMany({
      where: {
        partnerId: null,
        key: { in: [`${base}.min_version`, `${base}.recommended_version`, `${base}.release_notes`, `${base}.store_url`] },
      },
      select: { key: true, value: true },
    });
    const flat = new Map(rows.map((r) => [r.key, r.value as unknown]));
    const str = (k: string, d: string): string => (typeof flat.get(k) === 'string' ? (flat.get(k) as string) : d);

    const minimum_version = str(`${base}.min_version`, '1.0.0');
    const recommended_version = str(`${base}.recommended_version`, minimum_version);
    const status: VersionStatus =
      cmp(dto.version, minimum_version) < 0
        ? 'UPDATE_REQUIRED'
        : cmp(dto.version, recommended_version) < 0
          ? 'UPDATE_AVAILABLE'
          : 'UP_TO_DATE';

    return {
      minimum_version,
      recommended_version,
      current_status: status,
      release_notes: str(`${base}.release_notes`, ''),
      store_url: str(`${base}.store_url`, ''),
    };
  }
}

type VersionStatus = 'UP_TO_DATE' | 'UPDATE_AVAILABLE' | 'UPDATE_REQUIRED';

export interface PlatformConfigResponse {
  support: { phone: string; email: string; whatsapp: string };
  currency: string;
  timezone: string;
  city: string;
  features: { whatsapp_bookings: boolean; walk_in_offline_payments: boolean; reviews: boolean; favourites: boolean };
  urls: { terms_of_service: string; privacy_policy: string; help_centre: string };
  razorpay: { key_id: string };
}

export interface VersionCheckResponse {
  minimum_version: string;
  recommended_version: string;
  current_status: VersionStatus;
  release_notes: string;
  store_url: string;
}

// Semver compare: returns negative / 0 / positive. Strips pre/build metadata
// (treat as equal for update-check purposes; a 1.2.3-beta is still "1.2.3" to the store).
export function cmp(a: string, b: string): number {
  const parse = (v: string) => v.replace(/[-+].*$/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const [aM, an, ap] = parse(a);
  const [bM, bn, bp] = parse(b);
  if (aM !== bM) return aM - bM;
  if (an !== bn) return an - bn;
  return ap - bp;
}

export const __internals = { cmp };
