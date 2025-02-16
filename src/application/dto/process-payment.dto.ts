import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsPositive } from 'class-validator';

export class ProcessPaymentDto {
  @ApiProperty({
    description: 'ID do pedido',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  orderId: string;

  @ApiProperty({ description: 'Valor do pagamento', example: 100.5 })
  @IsNumber()
  @IsPositive({ message: 'Amount must be a positive number' })
  amount: number;
}
