import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMaintenanceBlockDto {
  @IsString() @MaxLength(200) title!: string;
  @IsDateString() start_datetime!: string; // ISO-8601
  @IsDateString() end_datetime!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
}
