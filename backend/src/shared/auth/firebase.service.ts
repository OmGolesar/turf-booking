import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import type { AppConfig } from '../../config/configuration';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private app: App | null = null;

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  // Lazy init — boot must not depend on valid Firebase credentials being present
  // (dev machines run against a placeholder .env). First verifyIdToken() call
  // triggers the SDK. If credentials are malformed the error surfaces there.
  private ensureApp(): App {
    if (this.app) return this.app;
    const existing = getApps();
    if (existing.length > 0) {
      this.app = existing[0];
      return this.app;
    }
    const projectId = this.config.get('FIREBASE_PROJECT_ID', { infer: true });
    const clientEmail = this.config.get('FIREBASE_CLIENT_EMAIL', { infer: true });
    const privateKey = this.config.get('FIREBASE_PRIVATE_KEY', { infer: true }).replace(/\\n/g, '\n');
    this.app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
    this.logger.log(`Firebase Admin initialised for project ${projectId}`);
    return this.app;
  }

  verifyIdToken(token: string): Promise<DecodedIdToken> {
    return getAuth(this.ensureApp()).verifyIdToken(token, true);
  }
}
