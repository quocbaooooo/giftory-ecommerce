import { Module } from '@nestjs/common';
import { MarketingController, AdminMarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';

@Module({ controllers: [MarketingController, AdminMarketingController], providers: [MarketingService], exports: [MarketingService] })
export class MarketingModule {}
