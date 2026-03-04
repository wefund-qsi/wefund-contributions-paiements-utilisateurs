import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Campagne } from "./campagne.entity";
import { User } from "../../auth/entities/user.entity";


@Entity()
export class Contribution {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    montant: number;

    @ManyToOne(() => Campagne, (campagne) => campagne.contributions)
    campagne: Campagne;

    @ManyToOne(() => User, (user) => user.contributions)
    contributeur: User;

    @Column()
    timestamp: Date;

}