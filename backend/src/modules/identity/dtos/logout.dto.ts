import { IsString, MaxLength } from 'class-validator';

export class LogoutDto {
  @IsString()
  @MaxLength(128)
  device_id!: string;
}
