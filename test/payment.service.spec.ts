import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentService } from '@domain/service/payment.service';
import { Payment, PaymentStatus } from '@domain/entities/payment.entity';
import { ProcessPaymentDto } from '@application/dto/process-payment.dto';

describe('PaymentService', () => {
  let service: PaymentService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let model: Model<Payment>;

  const mockPayment = (overrides = {}) => ({
    orderId: '123e4567-e89b-12d3-a456-426614174000',
    amount: 100.5,
    status: PaymentStatus.PENDING,
    ...overrides,
  });
  mockPayment();
  const mockPaymentModel = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation(function (this: any) {
      return Promise.resolve({
        ...this,
        _id: 'some-id',
        status: PaymentStatus.SUCCESS,
      });
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getModelToken(Payment.name),
          useValue: mockPaymentModel,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    model = module.get<Model<Payment>>(getModelToken(Payment.name));
  });

  it('should process a payment and return a payment record', async () => {
    const paymentDto: ProcessPaymentDto = {
      orderId: '123e4567-e89b-12d3-a456-426614174000',
      amount: 100.5,
    };
    const result = await service.processPayment(paymentDto);
    expect(result).toHaveProperty('_id');
    expect(result.orderId).toEqual(paymentDto.orderId);
    expect(result.amount).toEqual(paymentDto.amount);
    expect(result.status).toEqual(PaymentStatus.SUCCESS);
  });
});
