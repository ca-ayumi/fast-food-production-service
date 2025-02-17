import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ProductionService } from '../../../domain/service/production.service';
import { firstValueFrom } from 'rxjs';

@Controller('production')
export class ProductionController {
  private readonly logger = new Logger(ProductionController.name);
  private readonly ordersApiUrl = 'http://localhost:3000/orders';

  constructor(
    private readonly httpService: HttpService,
    private readonly productionService: ProductionService,
  ) {}

  @Get('status/:status')
  async getOrdersByStatus(@Param('status') status: string) {
    this.logger.debug(`Fetching orders with status: ${status}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.ordersApiUrl}/status/${encodeURIComponent(status)}`,
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching orders: ${error.message}`);
      throw new BadRequestException('Failed to fetch orders');
    }
  }

  @Patch(':orderId/status')
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body() body: { status: string },
  ) {
    this.logger.debug(`Updating order ${orderId} to status: ${body.status}`);

    if (!body || !body.status) {
      this.logger.error(`Invalid request: status is missing`);
      throw new BadRequestException('Status is required');
    }

    try {
      const updatedOrder = await this.productionService.updateOrderStatus(
        orderId,
        body.status,
      );
      this.logger.debug(
        `Order updated successfully: ${JSON.stringify(updatedOrder)}`,
      );

      return {
        message: 'Order status updated successfully',
        orderId,
        status: body.status,
      };
    } catch (error) {
      this.logger.error(`Error updating order status: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }
}
