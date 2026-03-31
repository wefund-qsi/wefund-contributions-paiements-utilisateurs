import { Entity, Column, PrimaryGeneratedColumn, OneToOne, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Auth } from './auth.entity';
import { Role } from './role.entity';
import { Contribution } from '../../contribution/entities/contribution.entity';

@Entity()
export class User {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'UUID de l\'utilisateur' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Dupont', description: 'Nom de famille' })
  @Column()
  nom: string;

  @ApiProperty({ example: 'Jean', description: 'Prénom' })
  @Column()
  prenom: string;

  @ApiProperty({ example: 'jdupont', description: 'Nom d\'utilisateur unique' })
  @Column()
  username: string;

  @OneToOne(() => Auth, (auth) => auth.user)
  auth: Auth;

  @OneToOne(() => Role, (role) => role.user)
  role: Role;

  @OneToMany(() => Contribution, (contribution) => contribution.contributeur)
  contributions: Contribution[];
}
