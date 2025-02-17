import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { MercadoPagoWebhookController } from '@application/interfaces/controllers/mercadopago-webhook.controller';

describe('MercadoPagoWebhookController', () => {
  let controller: MercadoPagoWebhookController;
  let httpService: HttpService;

  const mockHttpService = {
    get: jest.fn(),
    patch: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'ORDER_SERVICE_URL':
          return 'http://localhost:3000';
        case 'MERCADOPAGO_ACCESS_TOKEN':
          return 'fake_token';
        default:
          return null;
      }
    }),
  };

  let loggerDebugSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MercadoPagoWebhookController],
      providers: [
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<MercadoPagoWebhookController>(
      MercadoPagoWebhookController,
    );
    httpService = module.get<HttpService>(HttpService);

    loggerDebugSpy = jest
      .spyOn(controller['logger'], 'debug')
      .mockImplementation(() => {});
    loggerWarnSpy = jest
      .spyOn(controller['logger'], 'warn')
      .mockImplementation(() => {});
    loggerErrorSpy = jest
      .spyOn(controller['logger'], 'error')
      .mockImplementation(() => {});

    jest.clearAllMocks();
  });

  describe('handleWebhook', () => {
    it('should call processPayment for payment.updated action with type "payment"', async () => {
      const req = {
        body: {
          action: 'payment.updated',
          type: 'payment',
          data: { id: 'payment123' },
        },
      };

      const processPaymentSpy = jest
        .spyOn(controller, 'processPayment')
        .mockResolvedValue(undefined);

      await controller.handleWebhook(req);

      expect(processPaymentSpy).toHaveBeenCalledWith('payment123');
    });

    it('should call processPayment for webhook with topic "payment" and resource', async () => {
      const req = {
        body: {
          topic: 'payment',
          resource: 'payment456',
        },
      };

      const processPaymentSpy = jest
        .spyOn(controller, 'processPayment')
        .mockResolvedValue(undefined);

      await controller.handleWebhook(req);

      expect(processPaymentSpy).toHaveBeenCalledWith('payment456');
    });

    it('should ignore unsupported webhook events', async () => {
      const req = {
        body: {
          action: 'payment.created',
          type: 'subscription', // tipo não suportado
        },
      };

      const processPaymentSpy = jest
        .spyOn(controller, 'processPayment')
        .mockResolvedValue(undefined);

      await controller.handleWebhook(req);

      expect(processPaymentSpy).not.toHaveBeenCalled();
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        `Ignoring unsupported webhook event: ${JSON.stringify(req.body)}`,
      );
    });
  });

  describe('processPayment', () => {
    const paymentId = 'payment789';

    it('should update order status to "Em Preparação" when payment is approved', async () => {
      const paymentDetails = {
        external_reference: 'order123',
        status: 'approved',
      };
      jest
        .spyOn(controller, 'getPaymentDetails')
        .mockResolvedValue(paymentDetails);
      const updateOrderStatusSpy = jest
        .spyOn(controller, 'updateOrderStatus')
        .mockResolvedValue(undefined);

      await controller.processPayment(paymentId);

      expect(controller.getPaymentDetails).toHaveBeenCalledWith(paymentId);
      expect(updateOrderStatusSpy).toHaveBeenCalledWith(
        'order123',
        'Em Preparação',
      );
    });

    it('should update order status to "FAILED" when payment is rejected', async () => {
      const paymentDetails = {
        external_reference: 'order123',
        status: 'rejected',
      };
      jest
        .spyOn(controller, 'getPaymentDetails')
        .mockResolvedValue(paymentDetails);
      const updateOrderStatusSpy = jest
        .spyOn(controller, 'updateOrderStatus')
        .mockResolvedValue(undefined);

      await controller.processPayment(paymentId);

      expect(controller.getPaymentDetails).toHaveBeenCalledWith(paymentId);
      expect(updateOrderStatusSpy).toHaveBeenCalledWith('order123', 'FAILED');
    });

    it('should warn if payment does not contain external_reference', async () => {
      const paymentDetails = { status: 'approved' }; // Sem external_reference
      jest
        .spyOn(controller, 'getPaymentDetails')
        .mockResolvedValue(paymentDetails);
      const updateOrderStatusSpy = jest
        .spyOn(controller, 'updateOrderStatus')
        .mockResolvedValue(undefined);

      await controller.processPayment(paymentId);

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        `Payment ${paymentId} does not contain an external reference (orderId). Ignoring.`,
      );
      expect(updateOrderStatusSpy).not.toHaveBeenCalled();
    });

    it('should log error if getPaymentDetails fails', async () => {
      const error = new Error('Fetch error');
      jest.spyOn(controller, 'getPaymentDetails').mockRejectedValue(error);

      await controller.processPayment(paymentId);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Failed to process payment ${paymentId}: ${error.message}`,
      );
    });
  });

  describe('getPaymentDetails', () => {
    const paymentId = 'payment123';

    it('should return payment details when httpService.get is successful', async () => {
      const paymentData = {
        id: paymentId,
        status: 'approved',
        external_reference: 'order123',
      };
      const axiosResponse: AxiosResponse = {
        data: paymentData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: undefined,
        },
      };
      jest.spyOn(httpService, 'get').mockReturnValueOnce(of(axiosResponse));

      const result = await controller.getPaymentDetails(paymentId);

      expect(httpService.get).toHaveBeenCalledWith(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        { headers: { Authorization: `Bearer fake_token` } },
      );
      expect(result).toEqual(paymentData);
    });

    it('should log error and throw when httpService.get fails', async () => {
      const error = new Error('Network error');
      jest.spyOn(httpService, 'get').mockReturnValueOnce(throwError(error));

      await expect(controller.getPaymentDetails(paymentId)).rejects.toThrow(
        error,
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Error fetching payment ${paymentId} details: ${error.message}`,
      );
    });
  });

  describe('updateOrderStatus', () => {
    const orderId = 'order123';
    const status = 'Em Preparação';

    it('should update order status successfully', async () => {
      jest.spyOn(httpService, 'patch').mockReturnValueOnce(
        of({
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        } as AxiosResponse),
      );
      await controller.updateOrderStatus(orderId, status);

      expect(httpService.patch).toHaveBeenCalledWith(
        `http://localhost:3000/orders/${orderId}/status`,
        { status },
      );
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        `Order ${orderId} updated to '${status}' successfully.`,
      );
    });

    it('should log error when update order status fails', async () => {
      const error = new Error('Patch failed');
      jest.spyOn(httpService, 'patch').mockReturnValueOnce(throwError(error));

      await controller.updateOrderStatus(orderId, status);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Failed to update order ${orderId} status to '${status}': ${error.message}`,
      );
    });
  });
});
