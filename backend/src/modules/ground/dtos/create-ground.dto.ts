import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { SurfaceType } from '@prisma/client';

const SURFACES = Object.values(SurfaceType);

export class CreateGroundDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsUUID() sport_id!: string;
  @IsIn(SURFACES) surface_type!: SurfaceType;
  @IsOptional() @IsBoolean() indoor?: boolean;
  @IsInt() @Min(1) @Max(100) max_players!: number;
  @IsOptional() @IsBoolean() lighting?: boolean;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
}
