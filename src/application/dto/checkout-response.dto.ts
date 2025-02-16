import { ApiProperty } from '@nestjs/swagger';

export class CheckoutResponse {
  @ApiProperty({
    example: 'cd6af6a3-76d2-43dc-8c3c-422a860de2ee',
  })
  orderId: string;

  @ApiProperty({
    example:
      '00020101021243650016COM.MERCADOLIBRE020130636127541fa-acdd-49dd-83ba-b67c3374dac25204000053039865802BR5909Test Test6009SAO PAULO62070503***63045CF7',
  })
  qrCode: string;
}
