import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../../auth/entities/user.entity";
import { Campagne } from "./campagne.entity";


@Entity()
export class Projet {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    nom: string;

    @ManyToOne(() => User, (user) => user.id)
    porteurProjet: User;
    
    @OneToMany(() => Campagne, (campagne) => campagne.projet)
    campagnes: Campagne[];
}