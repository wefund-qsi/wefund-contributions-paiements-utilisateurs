// auth.entity.ts
import { Entity, Column, OneToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Auth {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  password: string;

  @Column()
  userId: string;

  @OneToOne(() => User, (user) => user.auth)
  @JoinColumn({ name: 'userId' })
  user: User;
}