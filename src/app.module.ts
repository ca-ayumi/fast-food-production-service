import { Module } from '@nestjs/common';
import { ProductionController } from '@application/interfaces/controllers/production.controller';
import { ProductionService } from '@domain/service/production.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [ProductionController],
  providers: [ProductionService],
})
export class AppModule {}