import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Projet } from "./projet.entity";
import { Contribution } from "./contribution.entity";


@Entity()
export class Campagne {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    nom: string;

    @Column()
    statut: string;

    @Column()
    dateEcheance: Date;

    @ManyToOne(() => Projet, (projet) => projet.campagnes)
    projet: Projet;

    @OneToMany(() => Contribution, (contribution) => contribution.campagne)
    contributions: Contribution[];

}