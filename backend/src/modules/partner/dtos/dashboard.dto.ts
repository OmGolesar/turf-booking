import { IsIn, IsOptional } from 'class-validator';

export const DASHBOARD_RANGES = ['today', 'this_week', 'this_month', 'last_30_days'] as const;
export type DashboardRange = (typeof DASHBOARD_RANGES)[number];

export class DashboardQueryDto {
  @IsOptional() @IsIn(DASHBOARD_RANGES) range?: DashboardRange;
}
