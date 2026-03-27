import { IsUUID, IsNumber, IsPositive, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContributionDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'UUID de la campagne à financer (Projet 1)' })
  @IsUUID('4')
  @IsNotEmpty()
  campagneId: string;

  @ApiProperty({ example: 50, description: 'Montant de la contribution en euros (> 0)' })
  @IsNumber()
  @IsPositive()
  montant: number;
}
