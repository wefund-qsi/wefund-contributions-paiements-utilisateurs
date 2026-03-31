import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../auth/entities/user.entity';

@Entity('contributions')
export class Contribution {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'UUID de la contribution' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 50.0, description: 'Montant de la contribution en euros' })
  @Column('decimal', { precision: 10, scale: 2 })
  montant: number;

  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901', description: 'UUID de la campagne cible' })
  @Column({ nullable: true })
  campagneId: string;

  @ManyToOne(() => User, (user) => user.contributions, { nullable: false, onDelete: 'CASCADE' })
  contributeur: User;

  @ApiProperty({ example: '2026-03-31T12:00:00.000Z', description: 'Date de création' })
  @CreateDateColumn()
  createdAt: Date;
}
