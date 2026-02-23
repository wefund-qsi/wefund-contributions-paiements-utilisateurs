import * as crypto from 'crypto';
import { Entity, Column, PrimaryGeneratedColumn, OneToOne } from 'typeorm';
import { Auth } from './auth.entity';
import { Role } from './role.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: crypto.UUID;

  @Column()
  nom: string;

  @Column()
  prenom: string;

  @Column()
  username: string;

  @OneToOne(() => Auth, (auth) => auth.user)
  auth: Auth;

  @OneToOne(() => Role, (role) => role.user)
  role: Role;
}