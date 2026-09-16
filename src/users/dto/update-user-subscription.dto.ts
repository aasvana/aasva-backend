import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';

export class UpdateUserSubscriptionDto {
  @IsIn(['active', 'inactive', 'trial'])
  status: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsISO8601()
  paidUntil?: string;
}
