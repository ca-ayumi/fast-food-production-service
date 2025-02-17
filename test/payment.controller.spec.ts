import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from '@domain/service/payment.service';
import { PaymentController } from '@application/interfaces/controllers/payment.controller';

describe('PaymentController', () => {
  let controller: PaymentController;
  let paymentService: PaymentService;

  const mockPaymentService = {
    processOrderPayment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
    paymentService = module.get<PaymentService>(PaymentService);
    jest.clearAllMocks();
  });

  describe('processPayment', () => {
    it('should call processOrderPayment with correct parameters and return the result', async () => {
      const dto = {
        orderId: 'order123',
        clientId: 'client123',
        products: [
          { id: 'prod1', name: 'Product 1', unitPrice: 100 },
          { id: 'prod2', name: 'Product 2', unitPrice: 200 },
        ],
        totalAmount: 300,
      };

      const expectedResult = { orderId: dto.orderId, qrCode: 'QR_CODE' };

      mockPaymentService.processOrderPayment.mockResolvedValue(expectedResult);

      const result = await controller.processPayment(dto);

      expect(paymentService.processOrderPayment).toHaveBeenCalledWith(
        dto.orderId,
        dto.clientId,
        dto.products,
      );
      expect(result).toEqual(expectedResult);
    });
  });
});
