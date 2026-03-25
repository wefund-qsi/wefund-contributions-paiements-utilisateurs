import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CampagneEntity } from '@projet1/campagnes/domain/campagne.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('contributions')
export class Contribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  montant: number;

  @Column({ nullable: true })
  campagneId: string;

  @ManyToOne(() => CampagneEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campagneId' })
  campagne: CampagneEntity;

  @ManyToOne(() => User, (user) => user.contributions, { nullable: false, onDelete: 'CASCADE' })
  contributeur: User;

  @CreateDateColumn()
  createdAt: Date;
}
