import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        
        // If DATABASE_URL exists (Render), it connects using the Internal URL and SSL.
        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true, // Auto-creates tables (good for initial setup)
            ssl: { rejectUnauthorized: false }, // Mandatory for Render cloud DB
          };
        }

        // Fallback for local development using your .env variables
        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST') || 'localhost',
          port: parseInt(config.get<string>('DB_PORT') || '5432', 10),
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_NAME'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: true,
        };
      },
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    ChatModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
