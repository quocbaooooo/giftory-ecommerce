import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CareService } from './care.service';
import { CareController, CareAdminController } from './care.controller';
import {
  ReviewSchema,
  SupportCaseSchema,
  NoticeSchema,
  RefundSchema,
  AttachmentSchema,
} from './care.schemas';
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Review', schema: ReviewSchema },
      { name: 'SupportCase', schema: SupportCaseSchema },
      { name: 'CareNotice', schema: NoticeSchema },
      { name: 'Refund', schema: RefundSchema },
      { name: 'CareAttachment', schema: AttachmentSchema },
    ]),
  ],
  providers: [CareService],
  controllers: [CareController, CareAdminController],
  exports: [CareService],
})
export class CareModule {}
