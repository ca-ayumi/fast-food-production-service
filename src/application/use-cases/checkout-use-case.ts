// import { Injectable, BadRequestException, Logger } from '@nestjs/common';
// import { PaymentService } from '@domain/service/payment.service';
// import { firstValueFrom } from 'rxjs';
// import { HttpService } from '@nestjs/axios';
// import { CheckoutDto } from '@application/dto/checkout.dto';
//
// @Injectable()
// export class CheckoutUseCase {
//   private readonly logger = new Logger(CheckoutUseCase.name);
//   private readonly ORDER_API_URL = 'http://localhost:3000/orders';
//
//   constructor(
//     private readonly httpService: HttpService, // Usa HTTP para chamar a API de Orders
//     private readonly paymentService: PaymentService,
//   ) {}
//
//   async execute(
//     checkoutDto: CheckoutDto,
//     userId: string,
//     externalPosId: string,
//   ): Promise<any> {
//     this.logger.debug(
//       `Starting checkout process for orderId: ${checkoutDto.orderId}`,
//     );
//
//     // 🔽 Certifique-se de que apenas pegamos a ordem, sem criar outra
//     let order;
//     try {
//       const response = await firstValueFrom(
//         this.httpService.get(
//           `${process.env.ORDER_SERVICE_URL}/orders/${checkoutDto.orderId}`,
//         ),
//       );
//       order = response.data;
//     } catch (error) {
//       this.logger.error(`Failed to fetch order details: ${error.message}`);
//       throw new BadRequestException('Failed to fetch order details');
//     }
//
//     try {
//       this.logger.debug(
//         `Generating QR code for order: ${order.id}, userId: ${userId}, externalPosId: ${externalPosId}`,
//       );
//       const qrCode = await this.paymentService.createDynamicQR(
//         userId,
//         externalPosId,
//         order,
//       );
//       this.logger.debug(
//         `QR code generated successfully for order: ${order.id}`,
//       );
//
//       return {
//         orderId: order.id,
//         qrCode: qrCode,
//       };
//     } catch (error) {
//       this.logger.error(
//         `Failed to generate QR code for order: ${order.id}`,
//         error.stack,
//       );
//       throw new BadRequestException('Failed to generate QR code');
//     }
//   }
// }
