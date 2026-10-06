import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { RefreshToken, RefreshTokenSchema } from './schemas/refresh-token.schema';
import { Category, CategorySchema } from './schemas/category.schema';
import { Product, ProductSchema } from './schemas/product.schema';
import { CustomDesign, CustomDesignSchema } from './schemas/custom-design.schema';
import { Cart, CartSchema } from './schemas/cart.schema';
import { Voucher, VoucherSchema } from './schemas/voucher.schema';
import { Order, OrderSchema } from './schemas/order.schema';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { LoyaltyTransaction, LoyaltyTransactionSchema } from './schemas/loyalty-transaction.schema';
import { Wishlist, WishlistSchema } from './schemas/wishlist.schema';
import { StudioAsset, StudioAssetSchema } from './schemas/studio-asset.schema';

const MODELS = [
  { name: User.name, schema: UserSchema },
  { name: RefreshToken.name, schema: RefreshTokenSchema },
  { name: Category.name, schema: CategorySchema },
  { name: Product.name, schema: ProductSchema },
  { name: CustomDesign.name, schema: CustomDesignSchema },
  { name: Cart.name, schema: CartSchema },
  { name: Voucher.name, schema: VoucherSchema },
  { name: Order.name, schema: OrderSchema },
  { name: Payment.name, schema: PaymentSchema },
  { name: LoyaltyTransaction.name, schema: LoyaltyTransactionSchema },
  { name: Wishlist.name, schema: WishlistSchema },
  { name: StudioAsset.name, schema: StudioAssetSchema },
];

@Global()
@Module({
  imports: [MongooseModule.forFeature(MODELS)],
  exports: [MongooseModule.forFeature(MODELS)],
})
export class DatabaseModule {}
