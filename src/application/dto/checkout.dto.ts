import { IsNotEmpty, IsUUID, IsArray, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckoutDto {
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

  @ApiProperty({
    description: 'Client ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({
    description: 'Products IDs',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsNotEmpty()
  productIds: string[];

  @ApiProperty({
    description: 'Total amount of the order',
    example: 100.5,
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  totalAmount: number;
}
