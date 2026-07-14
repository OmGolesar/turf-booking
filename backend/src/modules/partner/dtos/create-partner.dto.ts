import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { INDIA_E164_REGEX } from '../../../shared/validation/dtos/phone.dto';

export class CreatePartnerDto {
  @IsString() @MinLength(2) @MaxLength(120) business_name!: string;
  @IsString() @MinLength(2) @MaxLength(120) display_name!: string;
  @IsOptional() @IsEmail() email?: string;
  @Matches(INDIA_E164_REGEX, { message: 'phone must be an E.164 Indian mobile number.' }) phone!: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsIn(['Nashik']) city!: string;
  @IsIn(['Maharashtra']) state!: string;
}
