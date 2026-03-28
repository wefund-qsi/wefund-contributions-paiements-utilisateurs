import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('contributions')
export class Contribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  montant: number;

  @Column({ nullable: true })
  campagneId: string;

  @ManyToOne(() => User, (user) => user.contributions, { nullable: false, onDelete: 'CASCADE' })
  contributeur: User;

  @CreateDateColumn()
  createdAt: Date;
}
