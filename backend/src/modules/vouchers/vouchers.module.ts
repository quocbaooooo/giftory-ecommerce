import { Global, Module } from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { VouchersController } from './vouchers.controller';
@Global()
@Module({ providers: [VouchersService], controllers: [VouchersController], exports: [VouchersService] })
export class VouchersModule {}
