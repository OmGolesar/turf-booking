import { IsOptional, IsString, MaxLength } from 'class-validator';

// Body for POST /admin/refunds/:id/actions/approve
export class ApproveRefundRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  admin_notes?: string;
}

// Body for POST /admin/refunds/:id/actions/reject
export class RejectRefundRequestDto {
  @IsString()
  @MaxLength(500)
  admin_notes!: string;
}
