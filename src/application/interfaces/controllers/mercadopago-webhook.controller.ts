import { Controller, Post, Logger, Req } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

@Controller('webhook')
export class MercadoPagoWebhookController {
  private readonly logger = new Logger(MercadoPagoWebhookController.name);
  private readonly orderServiceUrl: string;
  private readonly mercadoPagoToken: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.orderServiceUrl =
      this.configService.get<string>('ORDER_SERVICE_URL') ||
      'http://localhost:3000';
    this.mercadoPagoToken = this.configService.get<string>(
      'MERCADOPAGO_ACCESS_TOKEN',
    );
  }

  @Post()
  async handleWebhook(@Req() req: any) {
    this.logger.debug(
      `Received Mercado Pago webhook: ${JSON.stringify(req.body)}`,
    );

    const { action, data, type, topic, resource } = req.body;

    if (
      (action === 'payment.updated' || action === 'payment.created') &&
      type === 'payment'
    ) {
      await this.processPayment(data.id);
    } else if (topic === 'payment' && resource) {
      await this.processPayment(resource);
    } else {
      this.logger.debug(
        `Ignoring unsupported webhook event: ${JSON.stringify(req.body)}`,
      );
    }
  }

  async processPayment(paymentId: string) {
    this.logger.debug(`Fetching payment details for payment ID: ${paymentId}`);

    try {
      const payment = await this.getPaymentDetails(paymentId);
      this.logger.debug(`Payment details received: ${JSON.stringify(payment)}`);

      if (!payment || !payment.external_reference) {
        this.logger.warn(
          `Payment ${paymentId} does not contain an external reference (orderId). Ignoring.`,
        );
        return;
      }

      const orderId = payment.external_reference;

      if (payment.status === 'approved') {
        this.logger.debug(
          `Payment approved! Updating order ${orderId} to 'Em Preparação'.`,
        );
        await this.updateOrderStatus(orderId, 'Em Preparação');
      } else if (payment.status === 'rejected') {
        this.logger.debug(
          `Payment rejected. Updating order ${orderId} to 'FAILED'.`,
        );
        await this.updateOrderStatus(orderId, 'FAILED');
      }
    } catch (error) {
      this.logger.error(
        `Failed to process payment ${paymentId}: ${error.message}`,
      );
    }
  }

  async getPaymentDetails(paymentId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `https://api.mercadopago.com/v1/payments/${paymentId}`,
          {
            headers: { Authorization: `Bearer ${this.mercadoPagoToken}` },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Error fetching payment ${paymentId} details: ${error.message}`,
      );
      throw error;
    }
  }

  async updateOrderStatus(orderId: string, status: string) {
    try {
      await firstValueFrom(
        this.httpService.patch(
          `${this.orderServiceUrl}/orders/${orderId}/status`,
          { status },
        ),
      );
      this.logger.debug(
        `Order ${orderId} updated to '${status}' successfully.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update order ${orderId} status to '${status}': ${error.message}`,
      );
    }
  }
}
