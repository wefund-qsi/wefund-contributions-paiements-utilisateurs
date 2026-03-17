import { IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateContributionDto {
    @ApiProperty({ example: 100, description: 'Nouveau montant de la contribution (> 0)' })
    @IsNumber()
    @IsPositive()
    montant: number;
}
