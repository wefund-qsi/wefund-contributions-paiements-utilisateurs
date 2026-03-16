import { Entity, Column, PrimaryGeneratedColumn, OneToOne, OneToMany } from 'typeorm';
import { Auth } from './auth.entity';
import { Role } from './role.entity';
import { Contribution } from '../../contribution/entities/contribution.entity';
import { Projet } from '../../contribution/entities/projet.entity';

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

  @OneToMany(() => Contribution, (contribution) => contribution.contributeur)
  contributions: Contribution[];

  @OneToMany(() => Projet, (projet) => projet.porteurProjet)
  projets: Projet[];
}