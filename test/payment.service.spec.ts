import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { PaymentService } from '@domain/service/payment.service';
import { Payment, PaymentStatus } from '@domain/entities/payment.entity';
import { AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

describe('PaymentService', () => {
  let service: PaymentService;
  let httpService: HttpService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'MERCADOPAGO_BASE_URL':
          return 'http://localhost:3000';
        case 'MERCADOPAGO_ACCESS_TOKEN':
          return 'fake_access_token';
        case 'MERCADOPAGO_NOTIFICATION_URL':
          return 'http://localhost:3000/notification';
        case 'ORDER_SERVICE_URL':
          return 'http://localhost:3000';
        default:
          return null;
      }
    }),
  };

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
  };

  const paymentSaveMock = jest.fn();
  class MockPaymentModel {
    paymentData: any;
    constructor(paymentData: any) {
      this.paymentData = paymentData;
    }
    save() {
      return paymentSaveMock();
    }
    static collection = { name: 'payments' };
  }
  const mockConnection = { name: 'test_connection' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getModelToken(Payment.name), useValue: MockPaymentModel },
        { provide: getConnectionToken(), useValue: mockConnection },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    httpService = module.get<HttpService>(HttpService);
    jest.clearAllMocks();
  });

  describe('processOrderPayment', () => {
    const orderId = 'order123';
    const clientId = 'client123';
    const products = [
      { id: 'prod1', name: 'Product 1', unitPrice: 100 },
      { id: 'prod2', name: 'Product 2', unitPrice: 200 },
    ];
    const calculatedTotalAmount = 300;

    it('should process payment successfully', async () => {
      const mockResponse: AxiosResponse = {
        data: { qr_data: 'QR_CODE' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: undefined },
      };

      jest.spyOn(httpService, 'post').mockReturnValueOnce(of(mockResponse));
      paymentSaveMock.mockResolvedValueOnce({
        _id: 'payment123',
        orderId,
        clientId,
        products,
        amount: calculatedTotalAmount,
        status: PaymentStatus.PENDING,
        qrCode: 'QR_CODE',
      });

      const result = await service.processOrderPayment(
        orderId,
        clientId,
        products,
      );

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:3000/instore/orders/qr/seller/collectors/2023202558/pos/FIAP2POS001/qrs',
        expect.objectContaining({
          external_reference: orderId,
          total_amount: calculatedTotalAmount,
          items: expect.any(Array),
        }),
        {
          headers: {
            Authorization: `Bearer fake_access_token`,
            'Content-Type': 'application/json',
          },
        },
      );
      expect(paymentSaveMock).toHaveBeenCalled();
      expect(result).toEqual({ orderId, qrCode: 'QR_CODE' });
    });

    it('should throw error when Mercado Pago request fails', async () => {
      jest
        .spyOn(httpService, 'post')
        .mockReturnValueOnce(throwError(new Error('Request failed')));
      await expect(
        service.processOrderPayment(orderId, clientId, products),
      ).rejects.toThrow(
        new HttpException('Failed to create QR Code', HttpStatus.BAD_REQUEST),
      );
    });
  });

  describe('processMerchantOrderNotification', () => {
    const merchantOrderId = 'merchantOrder123';

    it('should process merchant order notification and update order status to "Em Preparação" when payment is approved', async () => {
      const merchantOrder = {
        external_reference: 'order123',
        status: 'closed',
        payments: [{ status: 'approved' }],
      };
      const mockGetResponse: AxiosResponse = {
        data: merchantOrder,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: undefined,
        },
      };
      jest.spyOn(httpService, 'get').mockReturnValueOnce(of(mockGetResponse));

      const mockPatchResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: undefined,
        },
      };
      jest
        .spyOn(httpService, 'patch')
        .mockReturnValueOnce(of(mockPatchResponse));

      await service.processMerchantOrderNotification(merchantOrderId);

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3000/merchant_orders/merchantOrder123',
        {
          headers: { Authorization: `Bearer fake_access_token` },
        },
      );
      expect(httpService.patch).toHaveBeenCalledWith(
        'http://localhost:3000/orders/order123/status',
        { status: 'Em Preparação' },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });

    it('should process merchant order notification and update order status to "Recebido" when payment is not approved', async () => {
      const merchantOrder = {
        external_reference: 'order123',
        status: 'closed',
        payments: [{ status: 'pending' }],
      };
      const mockGetResponse: AxiosResponse = {
        data: merchantOrder,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: undefined,
        },
      };
      jest.spyOn(httpService, 'get').mockReturnValueOnce(of(mockGetResponse));

      const mockPatchResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: undefined,
        },
      };
      jest
        .spyOn(httpService, 'patch')
        .mockReturnValueOnce(of(mockPatchResponse));

      await service.processMerchantOrderNotification(merchantOrderId);

      expect(httpService.patch).toHaveBeenCalledWith(
        'http://localhost:3000/orders/order123/status',
        { status: 'Recebido' },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });

    it('should throw error if processing merchant order notification fails', async () => {
      // Simula erro na requisição HTTP (ex: falha no GET)
      jest
        .spyOn(httpService, 'get')
        .mockReturnValueOnce(throwError(new Error('Get failed')));

      await expect(
        service.processMerchantOrderNotification(merchantOrderId),
      ).rejects.toThrow(
        new HttpException(
          'Failed to process merchant order notification',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });
});
