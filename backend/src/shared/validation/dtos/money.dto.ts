import { Equals, IsInt, Min } from 'class-validator';

// Money on the wire: paise + 'INR' (Part 3.0 §14).
export class MoneyDto {
  @IsInt()
  @Min(1)
  amount_paise!: number;

  @Equals('INR')
  currency!: 'INR';
}
