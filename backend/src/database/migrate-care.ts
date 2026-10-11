import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DatabaseModule } from './database.module';
// No CareModule: migration never starts workers or awards points itself.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        uri: c.get('MONGODB_URI', 'mongodb://127.0.0.1:27017/giftory'),
      }),
    }),
    DatabaseModule,
  ],
})
class MigrationModule {}
async function main() {
  const app = await NestFactory.createApplicationContext(MigrationModule, {
    logger: ['error'],
  });
  try {
    const orders = app.get<Model<any>>(getModelToken('Order'));
    const loyalty = app.get<Model<any>>(getModelToken('LoyaltyTransaction'));
    let recovered = 0,
      unknown = 0,
      legacyUnfulfilled = 0;
    const apply = process.argv.includes('--apply');
    for await (const order of orders
      .find({ orderStatus: 'DELIVERED', deliveredAt: null })
      .cursor()) {
      const event = order.timeline.find(
        (e) => e.completed && e.title?.startsWith('Đã giao hàng thành công'),
      );
      if (!event?.timestamp) {
        unknown++;
        continue;
      }
      recovered++;
      if (apply)
        await orders.updateOne(
          { _id: order._id, deliveredAt: null },
          { $set: { deliveredAt: event.timestamp }, $inc: { __v: 1 } },
        );
    }
    for await (const order of orders
      .find({ orderStatus: { $ne: 'DELIVERED' }, userId: { $ne: null } })
      .cursor()) {
      if (
        await loyalty.exists({
          userId: order.userId,
          referenceId: order.orderCode,
          type: 'EARN',
        })
      )
        legacyUnfulfilled++;
    }
    console.log(
      JSON.stringify(
        {
          mode: apply ? 'APPLY' : 'DRY_RUN',
          deliveryTimestampsRecoverable: recovered,
          needsManualDeliveryVerification: unknown,
          legacyPointsOnUnfulfilledOrdersNeedReconciliation: legacyUnfulfilled,
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
