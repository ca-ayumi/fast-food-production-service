import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentService } from '@domain/service/payment.service';
import { Payment, PaymentSchema } from '@domain/entities/payment.entity';
import { MercadoPagoWebhookController } from '@application/interfaces/controllers/mercadopago-webhook.controller';
import { PaymentController } from '@application/interfaces/controllers/payment.controller';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    HttpModule,
    ConfigModule,
  ],
  controllers: [PaymentController, MercadoPagoWebhookController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
