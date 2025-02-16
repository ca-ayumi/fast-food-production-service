import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { InjectModel } from '@nestjs/mongoose';
import { Payment, PaymentStatus } from '@domain/entities/payment.entity';
import { Model, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly notificationUrl: string;
  private readonly orderServiceUrl: string;

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<Payment>,
    @InjectConnection() private readonly connection: Connection, // 🔹 Injeção da conexão do MongoDB
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('MERCADOPAGO_BASE_URL');
    this.accessToken = this.configService.get<string>(
      'MERCADOPAGO_ACCESS_TOKEN',
    );
    this.notificationUrl = this.configService.get<string>(
      'MERCADOPAGO_NOTIFICATION_URL',
    );
    this.orderServiceUrl =
      this.configService.get<string>('ORDER_SERVICE_URL') ||
      'http://localhost:3000';
  }

  /**
   * Recebe um pedido da Order API, gera um QR Code no Mercado Pago e retorna a resposta.
   */
  async processOrderPayment(
    orderId: string,
    clientId: string,
    products: { id: string; name: string; unitPrice: number }[],
    // 🔹 Agora recebemos a lista de produtos com preços
  ): Promise<{ orderId: string; qrCode: string }> {
    this.logger.debug(`Processing payment for order ${orderId}`);

    const calculatedTotalAmount = products.reduce(
      (sum, product) => sum + product.unitPrice,
      0,
    );

    this.logger.debug(`MongoDB Database: ${this.connection.name}`);
    this.logger.debug(
      `MongoDB Collection: ${this.paymentModel.collection.name}`,
    );

    const payload = {
      external_reference: orderId,
      title: 'Product order',
      description: 'Purchase description.',
      notification_url: this.notificationUrl,
      total_amount: calculatedTotalAmount,
      items: products.map((product) => ({
        id: product.id,
        category_id: 'Lanches',
        currency_id: 'BRL',
        description: `Product: ${product.name}`,
        picture_url: null,
        title: product.name,
        quantity: 1,
        unit_measure: 'unit',
        unit_price: product.unitPrice, // 🔹 Agora usamos o preço correto do banco
        total_amount: product.unitPrice,
      })),
      cash_out: { amount: 0 },
    };

    this.logger.debug(
      `Sending request to Mercado Pago: ${JSON.stringify(payload)}`,
    );

    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/instore/orders/qr/seller/collectors/2023202558/pos/FIAP2POS001/qrs`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.debug(
        `Received response from Mercado Pago: ${JSON.stringify(response.data)}`,
      );

      const paymentData = {
        orderId,
        clientId,
        products,
        amount: calculatedTotalAmount,
        status: PaymentStatus.PENDING,
        qrCode: response.data.qr_data,
      };

      this.logger.debug(
        `Saving payment in MongoDB: ${JSON.stringify(paymentData)}`,
      );

      const payment = new this.paymentModel(paymentData);
      const savedPayment = await payment.save();

      this.logger.debug(
        `Payment saved successfully: ${JSON.stringify(savedPayment)}`,
      );

      return { orderId, qrCode: response.data.qr_data };
    } catch (error) {
      this.logger.error(`Failed to create QR Code: ${error.message}`);
      throw new HttpException(
        'Failed to create QR Code',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Processa o webhook do Mercado Pago e atualiza o status do pedido na Order API.
   */
  async processMerchantOrderNotification(
    merchantOrderId: string,
  ): Promise<void> {
    this.logger.debug(
      `Processing merchant order notification for ID: ${merchantOrderId}`,
    );

    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/merchant_orders/${merchantOrderId}`,
          {
            headers: { Authorization: `Bearer ${this.accessToken}` },
          },
        ),
      );

      const merchantOrder = response.data;
      this.logger.debug(
        `Merchant order details: ${JSON.stringify(merchantOrder)}`,
      );

      // 🔹 Verifica se o pagamento foi aprovado
      const isPaid =
        merchantOrder.status === 'closed' &&
        merchantOrder.payments?.some(
          (payment) => payment.status === 'approved',
        );

      // 🔹 Define o novo status da ordem
      const orderStatus = isPaid ? 'Em Preparação' : 'Recebido';

      this.logger.debug(
        `Order ${merchantOrder.external_reference} will be updated to status: ${orderStatus}`,
      );

      // 🔹 Atualiza o status da ordem na Order API
      const updateResponse = await firstValueFrom(
        this.httpService.patch(
          `${this.orderServiceUrl}/orders/${merchantOrder.external_reference}/status`,
          { status: orderStatus },
          {
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      this.logger.debug(
        `Order ${merchantOrder.external_reference} updated successfully in Order API: ${JSON.stringify(updateResponse.data)}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process merchant order notification: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to process merchant order notification',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
