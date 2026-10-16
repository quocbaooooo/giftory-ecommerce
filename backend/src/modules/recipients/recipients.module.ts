import { Module } from '@nestjs/common';
import { RecipientsController, LocationsController } from './recipients.controller';
import { RecipientsService } from './recipients.service';

@Module({ controllers: [RecipientsController, LocationsController], providers: [RecipientsService] })
export class RecipientsModule {}
