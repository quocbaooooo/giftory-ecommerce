import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wishlist, WishlistDocument } from '../../database/schemas/wishlist.schema';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(Wishlist.name) private readonly wishlistModel: Model<WishlistDocument>,
  ) {}

  async getWishlist(userId: string) {
    let wishlist = await this.wishlistModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate('productIds')
      .populate('savedDesignIds')
      .exec();

    if (!wishlist) {
      wishlist = await this.wishlistModel.create({
        userId: new Types.ObjectId(userId),
        productIds: [],
        savedDesignIds: []
      });
    }

    return wishlist;
  }

  async toggleProduct(userId: string, productId: string) {
    let wishlist = await this.wishlistModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!wishlist) {
      wishlist = await this.wishlistModel.create({
        userId: new Types.ObjectId(userId),
        productIds: [],
        savedDesignIds: []
      });
    }

    const pId = new Types.ObjectId(productId);
    const index = wishlist.productIds.findIndex(id => id.toString() === productId);
    let isAdded = false;

    if (index > -1) {
      wishlist.productIds.splice(index, 1);
    } else {
      wishlist.productIds.push(pId);
      isAdded = true;
    }

    await wishlist.save();
    return {
      isAdded,
      message: isAdded ? 'Đã thêm vào danh sách quà yêu thích' : 'Đã xóa khỏi danh sách yêu thích',
      totalItems: wishlist.productIds.length
    };
  }
}
