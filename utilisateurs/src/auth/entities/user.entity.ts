import { Entity, Column, PrimaryGeneratedColumn, OneToOne } from 'typeorm';
import { Auth } from './auth.entity';
import { Role } from './role.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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