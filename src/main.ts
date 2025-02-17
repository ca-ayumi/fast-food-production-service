import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ProductionController } from '@application/interfaces/controllers/production.controller';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3003);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
