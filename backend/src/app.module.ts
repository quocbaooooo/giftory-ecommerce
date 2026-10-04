import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { CustomStudioModule } from './modules/custom-studio/custom-studio.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { AdminModule } from './modules/admin/admin.module';
import { AiChatbotModule } from './modules/ai-chatbot/ai-chatbot.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI', 'mongodb://127.0.0.1:27017/giftory'),
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    CustomStudioModule,
    CartModule,
    OrdersModule,
    LoyaltyModule,
    WishlistModule,
    CloudinaryModule,
    AdminModule,
    AiChatbotModule,
  ],
})
export class AppModule {}
