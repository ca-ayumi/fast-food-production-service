import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosRequestHeaders } from 'axios';
import { BadRequestException } from '@nestjs/common';
import { ProductionController } from '../src/application/interfaces/controllers/production.controller';
import { ProductionService } from '../src/domain/service/production.service';

describe('ProductionController', () => {
  let controller: ProductionController;
  let httpService: HttpService;
  let productionService: ProductionService;

  const mockHttpService = {
    get: jest.fn(),
    patch: jest.fn(), // Não é usado diretamente no controller
  };

  const mockProductionService = {
    updateOrderStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductionController],
      providers: [
        { provide: HttpService, useValue: mockHttpService },
        { provide: ProductionService, useValue: mockProductionService },
      ],
    }).compile();

    controller = module.get<ProductionController>(ProductionController);
    httpService = module.get<HttpService>(HttpService);
    productionService = module.get<ProductionService>(ProductionService);

    jest.clearAllMocks();
  });

  describe('getOrdersByStatus', () => {
    it('should return orders when httpService.get is successful', async () => {
      const status = 'pending';
      const responseData = [{ orderId: 'order1' }, { orderId: 'order2' }];

      const axiosResponse: AxiosResponse = {
        data: responseData,
        status: 200,
        statusText: 'OK',
        headers: {} as unknown as AxiosRequestHeaders, // Força a conversão
        config: { headers: {} as unknown as AxiosRequestHeaders },
      };

      jest.spyOn(httpService, 'get').mockReturnValueOnce(of(axiosResponse));

      const result = await controller.getOrdersByStatus(status);

      expect(httpService.get).toHaveBeenCalledWith(
        `http://localhost:3000/orders/status/${encodeURIComponent(status)}`
      );
      expect(result).toEqual(responseData);
    });

    it('should throw BadRequestException when httpService.get fails', async () => {
      const status = 'pending';
      const error = new Error('Network error');
      jest.spyOn(httpService, 'get').mockReturnValueOnce(throwError(error));

      await expect(controller.getOrdersByStatus(status)).rejects.toThrow(
        new BadRequestException('Failed to fetch orders'),
      );
    });
  });

  describe('updateOrderStatus', () => {
    const orderId = 'order123';

    it('should throw BadRequestException if body is missing status', async () => {
      const body = {} as any;

      await expect(controller.updateOrderStatus(orderId, body)).rejects.toThrow(
        new BadRequestException('Status is required'),
      );
    });

    it('should update order status successfully', async () => {
      const body = { status: 'completed' };
      const updatedOrderMock = { orderId, status: 'completed' };

      jest
        .spyOn(productionService, 'updateOrderStatus')
        .mockResolvedValueOnce(updatedOrderMock);

      const result = await controller.updateOrderStatus(orderId, body);

      expect(productionService.updateOrderStatus).toHaveBeenCalledWith(
        orderId,
        body.status,
      );
      expect(result).toEqual({
        message: 'Order status updated successfully',
        orderId,
        status: body.status,
      });
    });

    it('should throw BadRequestException when productionService.updateOrderStatus fails', async () => {
      const body = { status: 'completed' };
      const error = new Error('Update failed');

      jest
        .spyOn(productionService, 'updateOrderStatus')
        .mockRejectedValueOnce(error);

      await expect(controller.updateOrderStatus(orderId, body)).rejects.toThrow(
        new BadRequestException('Update failed'),
      );
    });
  });
});
