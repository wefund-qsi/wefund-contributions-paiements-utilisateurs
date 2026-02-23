// role.entity.ts
import { Entity, Column, OneToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import * as crypto from 'crypto';

export type RoleEnum = 'PORTEUR DE PROJET' | 'CONTRIBUTEUR' | 'ADMINISTRATEUR' | 'VISITEUR';

@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  id: crypto.UUID;

  @Column({
    type: 'enum',
    enum: ['PORTEUR DE PROJET', 'CONTRIBUTEUR', 'ADMINISTRATEUR', 'VISITEUR'],
    default: 'VISITEUR'
  })
  role: RoleEnum;

  @OneToOne(() => User, (user) => user.role)  // Fix the relation
  @JoinColumn({ name: 'userId' })
  user: User;
}