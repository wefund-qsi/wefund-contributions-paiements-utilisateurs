import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Contribution } from '../../contribution/entities/contribution.entity';
import { User } from '../../auth/entities/user.entity';

export type TransactionStatus =
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'refunded'
  | 'failed';

@Entity('transactions')
export class Transaction {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'UUID de la transaction' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'pi_3OqX2Y2eZvKYlo2C1234567', description: 'ID du PaymentIntent Stripe' })
  @Column({ unique: true })
  paymentIntentId: string;

  @ApiProperty({ example: 50.0, description: 'Montant en euros' })
  @Column('decimal', { precision: 10, scale: 2 })
  montant: number;

  @ApiProperty({ example: 'pending', enum: ['pending', 'authorized', 'captured', 'refunded', 'failed'], description: 'Statut de la transaction' })
  @Column({
    type: 'enum',
    enum: ['pending', 'authorized', 'captured', 'refunded', 'failed'],
    default: 'pending',
  })
  statut: TransactionStatus;

  @ManyToOne(() => Contribution, { nullable: true, onDelete: 'SET NULL' })
  contribution: Contribution;

  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901', description: 'UUID de la contribution liée' })
  @Column({ nullable: true })
  contributionId: string;

  @ApiProperty({ example: 'c3d4e5f6-a7b8-9012-cdef-123456789012', description: 'UUID de la campagne' })
  @Column({ nullable: true })
  campagneId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  contributeur: User;

  @ApiProperty({ example: 'd4e5f6a7-b8c9-0123-defa-234567890123', description: 'UUID du contributeur' })
  @Column({ nullable: true })
  contributeurId: string;

  @ApiProperty({ example: '2026-03-31T12:00:00.000Z', description: 'Date de création' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ example: '2026-03-31T13:00:00.000Z', description: 'Date de dernière mise à jour' })
  @UpdateDateColumn()
  updatedAt: Date;
}
