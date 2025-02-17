import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosRequestHeaders } from 'axios';
import { ProductionService } from '../src/domain/service/production.service';

describe('ProductionService', () => {
  let service: ProductionService;
  let httpService: HttpService;

  const mockHttpService = {
    patch: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionService,
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<ProductionService>(ProductionService);
    httpService = module.get<HttpService>(HttpService);
    jest.clearAllMocks();
  });

  describe('updateOrderStatus', () => {
    const orderId = 'order123';
    const status = 'completed';

    it('should update order status successfully', async () => {
      const responseData = { orderId, status };
      const axiosResponse: AxiosResponse = {
        data: responseData,
        status: 200,
        statusText: 'OK',
        headers: {} as unknown as AxiosRequestHeaders,
        config: { headers: {} as unknown as AxiosRequestHeaders },
      };

      jest.spyOn(httpService, 'patch').mockReturnValueOnce(of(axiosResponse));

      const result = await service.updateOrderStatus(orderId, status);

      expect(httpService.patch).toHaveBeenCalledWith(
        `http://localhost:3000/orders/${orderId}/status`,
        { status },
      );
      expect(result).toEqual(responseData);
    });

    it('should throw error with error.response data when patch fails', async () => {
      const errorResponseData = { message: 'Update error' };
      const error: any = new Error('Patch failed');
      error.response = { data: errorResponseData };

      jest.spyOn(httpService, 'patch').mockReturnValueOnce(throwError(error));

      await expect(service.updateOrderStatus(orderId, status)).rejects.toThrow(
        `Error updating order: ${JSON.stringify(errorResponseData)}`,
      );
    });

    it('should throw error with error.message when patch fails and error.response is undefined', async () => {
      const error = new Error('Patch failed without response');

      jest.spyOn(httpService, 'patch').mockReturnValueOnce(throwError(error));

      await expect(service.updateOrderStatus(orderId, status)).rejects.toThrow(
        `Error updating order: ${error.message}`,
      );
    });
  });
});
