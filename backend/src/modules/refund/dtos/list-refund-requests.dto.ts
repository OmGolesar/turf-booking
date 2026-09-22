import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RefundRequestStatus } from '@prisma/client';

export class ListRefundRequestsDto {
  @IsOptional()
  @IsEnum(RefundRequestStatus)
  status?: RefundRequestStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
