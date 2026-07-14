import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { INDIA_E164_REGEX } from '../../../shared/validation/dtos/phone.dto';

export class UpdatePartnerDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) business_name?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) display_name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @Matches(INDIA_E164_REGEX) phone?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
}
