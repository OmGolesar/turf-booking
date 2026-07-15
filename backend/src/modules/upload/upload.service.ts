import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { DomainException } from '../../shared/errors/domain.exception';
import { AuditService } from '../../shared/audit/audit.service';
import type { AuthContext } from '../../shared/auth/auth-context';
import type { AppConfig } from '../../config/configuration';
import {
  ALLOWED_CONTENT_TYPES,
  MAX_UPLOAD_BYTES,
  SignUploadDto,
  UploadPurpose,
} from './dtos/sign-upload.dto';

export interface SignResult {
  upload_url: string;
  file_url: string;
  method: 'PUT';
  expires_at: string;
  content_type: string;
  max_size_bytes: number;
  storage_path: string;
}

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const SIGNED_URL_TTL_SECONDS = 300; // 5 min per Part 3.5 §6.

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private client: SupabaseClient | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly audit: AuditService,
  ) {}

  async sign(ctx: AuthContext, dto: SignUploadDto, meta: RequestMeta): Promise<SignResult> {
    // The DTO validator handles content_type + size, but re-guard here so
    // service is safe when called directly (tests, workers).
    if (!(ALLOWED_CONTENT_TYPES as readonly string[]).includes(dto.content_type)) {
      throw new DomainException('UPLOAD_UNSUPPORTED_CONTENT_TYPE');
    }
    if (dto.size_bytes > MAX_UPLOAD_BYTES) throw new DomainException('UPLOAD_SIZE_LIMIT_EXCEEDED');

    await this.assertAuthorisedForPurpose(ctx, dto.purpose, dto.target_id);

    const ext = EXTENSION_BY_CONTENT_TYPE[dto.content_type];
    const scope = dto.target_id ?? ctx.identityId;
    const objectPath = `${dto.purpose.toLowerCase()}/${scope}/${randomUUID()}.${ext}`;

    const bucket = this.config.get('SUPABASE_STORAGE_BUCKET', { infer: true });
    const client = this.getClient();

    let signed: { signedUrl: string; token: string; path: string };
    try {
      const { data, error } = await client.storage.from(bucket).createSignedUploadUrl(objectPath);
      if (error) throw error;
      signed = data;
    } catch (err) {
      this.logger.error({ err, path: objectPath }, 'supabase createSignedUploadUrl failed');
      throw new DomainException('UPLOAD_PROVIDER_ERROR');
    }

    // The public/CDN URL that partners send back on POST /venues/:id/media.
    const publicUrl = client.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;

    await this.prisma.$transaction((tx) =>
      this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'UploadSigned',
        resourceType: 'Upload',
        resourceId: signed.path ?? objectPath,
        changes: {
          purpose: { before: null, after: dto.purpose },
          content_type: { before: null, after: dto.content_type },
        },
        context: meta,
      }),
    );

    return {
      upload_url: signed.signedUrl,
      file_url: publicUrl,
      method: 'PUT',
      expires_at: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
      content_type: dto.content_type,
      max_size_bytes: MAX_UPLOAD_BYTES,
      storage_path: objectPath,
    };
  }

  private async assertAuthorisedForPurpose(
    ctx: AuthContext,
    purpose: UploadPurpose,
    targetId?: string,
  ): Promise<void> {
    if (purpose === 'AVATAR') return; // any authenticated identity may upload own avatar

    if (!targetId) throw new DomainException('UPLOAD_NOT_AUTHORISED', { message: 'target_id is required for this purpose.' });

    if (purpose === 'VENUE_COVER' || purpose === 'VENUE_GALLERY' || purpose === 'VENUE_LOGO') {
      const venue = await this.prisma.venue.findFirst({
        where: { id: targetId, deletedAt: null },
        select: { partnerId: true },
      });
      if (!venue) throw new DomainException('UPLOAD_NOT_AUTHORISED');
      await this.assertPartnerOwnership(ctx, venue.partnerId);
      return;
    }

    if (purpose === 'GROUND_MEDIA') {
      const ground = await this.prisma.ground.findFirst({
        where: { id: targetId, deletedAt: null },
        select: { venue: { select: { partnerId: true } } },
      });
      if (!ground) throw new DomainException('UPLOAD_NOT_AUTHORISED');
      await this.assertPartnerOwnership(ctx, ground.venue.partnerId);
    }
  }

  private async assertPartnerOwnership(ctx: AuthContext, ownerPartnerId: string): Promise<void> {
    if (ctx.role === 'ADMIN') return;
    const partnerId =
      ctx.partnerId ??
      (await this.prisma.partner.findFirst({ where: { identityId: ctx.identityId, deletedAt: null } }))?.id;
    if (!partnerId || partnerId !== ownerPartnerId) throw new DomainException('UPLOAD_NOT_AUTHORISED');
  }

  // Lazy init so boot never depends on real Supabase creds.
  private getClient(): SupabaseClient {
    if (this.client) return this.client;
    const url = this.config.get('SUPABASE_URL', { infer: true });
    const serviceKey = this.config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true });
    this.client = createClient(url, serviceKey, { auth: { persistSession: false } });
    return this.client;
  }
}

interface RequestMeta { requestId?: string; route?: string; sourceIp?: string; userAgent?: string }
