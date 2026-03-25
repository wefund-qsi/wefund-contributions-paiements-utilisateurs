import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
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
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  paymentIntentId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  montant: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'authorized', 'captured', 'refunded', 'failed'],
    default: 'pending',
  })
  statut: TransactionStatus;

  @ManyToOne(() => Contribution, { nullable: true, onDelete: 'SET NULL' })
  contribution: Contribution;

  @Column({ nullable: true })
  contributionId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  contributeur: User;

  @Column({ nullable: true })
  contributeurId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
