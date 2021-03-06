import { environment as env } from '@env-api/environment';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import helmet from 'helmet';
import { AppModule } from './app/app.module';
import { ConfigService } from './app/config';

declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  const config: ConfigService = app.get(ConfigService);
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
      forbidUnknownValues: true,
    })
  );

  // Link DI container to class-validator
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  // for uploaded images
  // app.useStaticAssets(join(__dirname, './../public'));

  const openIdConf = await config.getOpenIdConfiguration();
  const options = new DocumentBuilder()
    .setTitle('Sumo API Docs')
    .setDescription('Sumo API for Ngx Starter Kit')
    .setExternalDoc('Github Repo', 'https://github.com/xmlking/ngx-starter-kit/tree/master/apps/api')
    .setVersion(config.getVersion())
    .addServer('/docs')
    // .addOAuth2(
    //   'implicit',
    //   openIdConf.authorization_endpoint,
    //   openIdConf.token_endpoint,
    // }
    //   // {openid: 'openid', profile: 'profile', email: 'email'}
    // )
    .build();
  const document = SwaggerModule.createDocument(app, options);
  const { additionalQueryStringParams } = config.getAuth();
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      oauth2RedirectUrl: `${env.server.domainUrl}/docs/oauth2-redirect.html`,
      oauth: {
        clientId: env.auth.clientId,
        appName: 'Sumo API',
        // scopeSeparator: ' ',
        additionalQueryStringParams,
      },
    },
  });

  // Starts listening to shutdown hooks
  app.enableShutdownHooks();

  await app.listen(env.server.port || 3000, env.server.host || '0.0.0.0');

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}

bootstrap();
