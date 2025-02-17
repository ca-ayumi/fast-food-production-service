import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from "typeorm";

export enum ProductionStatus {
    PREPARING = 'Em Preparação',
    READY = 'Pronto',
    FINALIZED = 'Finalizado',
}

@Entity('production_order')
export class ProductionOrder {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    orderId: string;

    @Column({ type: 'enum', enum: ProductionStatus, default: ProductionStatus.PREPARING })
    status: ProductionStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
