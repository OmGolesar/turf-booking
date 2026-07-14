import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class SetMaintenanceDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
  @IsOptional() @IsDateString() estimated_resume_at?: string;
}
