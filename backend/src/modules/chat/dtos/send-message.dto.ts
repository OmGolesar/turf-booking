import { IsISO8601, IsLatitude, IsLongitude, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

const toNumber = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

export class SendMessageDto {
  @IsString()
  @MaxLength(2000)
  message!: string;

  @IsOptional() @IsUUID() conversation_id?: string;

  @IsOptional() @Transform(toNumber) @IsLatitude() lat?: number;
  @IsOptional() @Transform(toNumber) @IsLongitude() lng?: number;

  // Client-supplied timestamp so the LLM interprets "tonight" against the user's clock,
  // not the server's. Optional — falls back to server clock.
  @IsOptional() @IsISO8601() client_now_iso?: string;
}
