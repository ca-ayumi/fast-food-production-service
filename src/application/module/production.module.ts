import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionController } from '../interfaces/controllers/production.controller';
import { ConfigModule } from '@nestjs/config';
import { ProductionOrder } from '../../domain/entities/production-order.entity';
import { HttpModule } from '@nestjs/axios';
import { ProductionService } from '../../domain/service/production.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductionOrder]),
    ConfigModule,
    HttpModule,
  ],
  controllers: [ProductionController],
  providers: [ProductionService],
  exports: [ProductionService],
})
export class ProductionModule {}