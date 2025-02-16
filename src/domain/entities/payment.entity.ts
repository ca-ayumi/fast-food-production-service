import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum PaymentStatus {
  PENDING = 'Pending',
  SUCCESS = 'Success',
  FAILED = 'Failed',
}

@Schema({ timestamps: true })
export class Payment extends Document {
  @Prop({ required: true })
  orderId: string;

  @Prop({ required: true, type: Number })
  amount: number;

  @Prop({ required: true })
  clientId: string;

  @Prop({ required: true })
  products: { id: string; name: string; unitPrice: number }[];

  @Prop({ required: true, enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Prop({ required: true })
  qrCode: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
