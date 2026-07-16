import { IsOptional, IsString, Matches } from 'class-validator';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class PartnerCalendarDto {
  @IsOptional() @IsString() ground_id?: string;
  @Matches(DATE_RE) from!: string;
  @Matches(DATE_RE) to!: string;
}
