import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { NotificationCategory } from '@prisma/client';
import { IsIn } from 'class-validator';

const toBool = ({ value }: { value: unknown }): boolean | unknown => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
};

export class ListNotificationsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  unread_only?: boolean;

  @IsOptional()
  @IsIn(Object.values(NotificationCategory))
  category?: NotificationCategory;
}
