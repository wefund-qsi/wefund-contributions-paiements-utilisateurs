import { IsUUID, IsNumber, IsPositive, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'UUID de la contribution' })
  @IsUUID('4')
  @IsNotEmpty()
  contributionId: string;

  @ApiProperty({ example: 50.0, description: 'Montant en euros (> 0)' })
  @IsNumber()
  @IsPositive()
  montant: number;

  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901', description: 'UUID de la campagne (Projet 1)' })
  @IsUUID('4')
  @IsNotEmpty()
  campagneId: string;
}
