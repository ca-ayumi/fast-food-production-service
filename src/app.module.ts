import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentModule } from '@application/module/payment.module';
import { Payment, PaymentSchema } from '@domain/entities/payment.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI),
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    PaymentModule,
  ],
})
export class AppModule {}
