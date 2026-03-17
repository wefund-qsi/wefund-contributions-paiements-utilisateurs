import { IsNumber, IsPositive, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContributionDto {
    @ApiProperty({ example: 1, description: 'ID de la campagne à financer' })
    @IsInt()
    @IsPositive()
    campagneId: number;

    @ApiProperty({ example: 50, description: 'Montant de la contribution (> 0)' })
    @IsNumber()
    @IsPositive()
    montant: number;
}
