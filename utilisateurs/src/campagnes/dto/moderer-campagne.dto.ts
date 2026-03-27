import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class ModererCampagneDto {
  @ApiProperty({
    description: 'Décision de modération',
    enum: ['ACCEPTEE', 'REFUSEE'],
    example: 'ACCEPTEE',
  })
  @IsIn(['ACCEPTEE', 'REFUSEE'])
  decision: 'ACCEPTEE' | 'REFUSEE';
}
