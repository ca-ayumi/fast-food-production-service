import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentService } from '@domain/service/payment.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Processa um pagamento e gera QR Code' })
  @ApiResponse({ status: 201, description: 'QR Code gerado com sucesso' })
  async processPayment(
    @Body()
    body: {
      orderId: string;
      clientId: string;
      products: { id: string; name: string; unitPrice: number }[];
      totalAmount: number;
    },
  ) {
    console.log('Recebido no PaymentController:', body);

    return this.paymentService.processOrderPayment(
      body.orderId,
      body.clientId,
      body.products,
    );
  }
}
