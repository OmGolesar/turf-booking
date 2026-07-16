import { IsObject } from 'class-validator';

// Free-form JSON — the service validates keys against known categories/channels.
// Silently ignores non-toggleable transactional entries.
export class UpdatePreferencesDto {
  @IsObject() preferences!: Record<string, Record<string, boolean>>;
}
