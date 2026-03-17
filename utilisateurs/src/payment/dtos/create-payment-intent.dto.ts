import { IsNumber, IsPositive, IsInt } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsInt()
  contributionId: number;

  @IsNumber()
  @IsPositive()
  montant: number;

  @IsInt()
  campagneId: number;
}
