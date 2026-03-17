// role.entity.ts
import { Entity, Column, OneToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

export type RoleEnum = 'ADMINISTRATEUR' | 'USER';

@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ['ADMINISTRATEUR', 'USER'],
    default: 'USER'
  })
  role: RoleEnum;

  @Column()
  userId: string;

  @OneToOne(() => User, (user) => user.role)
  @JoinColumn({ name: 'userId' })
  user: User;
}