// ============================================================
// Clyptus Job Portal - Platform Super Admin Backend Bootstrap
// ============================================================

import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuditService } from './modules/audit/audit.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const auditService = app.get(AuditService);
  const reflector = app.get(Reflector);

  const port = configService.get<number>('port', 3000);
  const apiPrefix = configService.get<string>('apiPrefix', '/api/v1');
  const corsOrigin = configService.get<string>('corsOrigin', 'http://localhost:5173');

  // Set Global API Prefix
  app.setGlobalPrefix(apiPrefix.replace(/^\//, ''));

  // Native HTTP Security Headers Perimeter
  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
    );
    next();
  });

  // Enable CORS
  app.enableCors({
    origin: [corsOrigin, 'http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });


  // Global Validation Pipe with strict whitelisting
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filter (prevents sensitive error/stack leaks)
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Response Interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // OpenAPI / Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Clyptus Job Portal - Platform Super Admin API')
    .setDescription(
      'High-privilege platform control APIs for multi-organisation management, token economy, audit logs, and security governance.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  logger.log(`================================================================`);
  logger.log(`Clyptus Platform Super Admin Backend running on port ${port}`);
  logger.log(`API Base URL: http://localhost:${port}${apiPrefix}`);
  logger.log(`Swagger Docs: http://localhost:${port}/api/docs`);
  logger.log(`================================================================`);
}

bootstrap();
