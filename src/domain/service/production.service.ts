import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class ProductionService {
  private readonly logger = new Logger(ProductionService.name);
  private readonly orderServiceUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.orderServiceUrl =
      process.env.ORDER_SERVICE_URL || 'http://localhost:3000';
  }

  async updateOrderStatus(orderId: string, status: string) {
    this.logger.debug(`Updating order ${orderId} to status: ${status}`);

    try {
      const response = await firstValueFrom(
        this.httpService.patch(
          `${this.orderServiceUrl}/orders/${orderId}/status`,
          {
            status,
          },
        ),
      );

      this.logger.debug(`Order ${orderId} updated successfully.`);

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update order ${orderId}: ${error.message}`);

      if (error.response) {
        throw new Error(
          `Error updating order: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new Error(`Error updating order: ${error.message}`);
    }
  }
}
