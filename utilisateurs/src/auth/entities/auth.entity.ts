import { Entity, Column, OneToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import * as crypto from 'crypto';

@Entity()
export class Auth {
  @PrimaryGeneratedColumn()  // Add this line
  id: crypto.UUID;  // or string if you prefer UUID

  @Column()
  password: string;

  @OneToOne(() => User, (user) => user.auth)
  @JoinColumn({ name: 'userId' })
  user: User;
}