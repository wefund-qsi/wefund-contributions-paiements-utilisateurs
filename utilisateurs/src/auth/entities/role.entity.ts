// role.entity.ts
import { Entity, Column, OneToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

export type RoleEnum = 'PORTEUR DE PROJET' | 'CONTRIBUTEUR' | 'ADMINISTRATEUR' | 'VISITEUR';

@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ['PORTEUR DE PROJET', 'CONTRIBUTEUR', 'ADMINISTRATEUR', 'VISITEUR'],
    default: 'VISITEUR'
  })
  role: RoleEnum;

  @Column()
  userId: string;

  @OneToOne(() => User, (user) => user.role)
  @JoinColumn({ name: 'userId' })
  user: User;
}