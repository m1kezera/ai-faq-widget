// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Allow all origins (for development/testing)
  app.enableCors({
  origin: ['https://SEU-DOMINIO-DO-WIDGET.com', 'https://SITE-DO-CLIENTE.com'],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type, Accept, Authorization, x-site-key',
});


  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);
  console.log(`🚀 API listening on http://localhost:${port}`);
}
bootstrap();
