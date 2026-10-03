import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../../database/schemas/order.schema';
import { Product, ProductDocument } from '../../database/schemas/product.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { CustomDesign, CustomDesignDocument } from '../../database/schemas/custom-design.schema';
import { UserRole, OrderStatus, FulfillmentStatus, PaymentStatus } from '../../common/enums/role.enum';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(CustomDesign.name) private readonly designModel: Model<CustomDesignDocument>,
  ) {}

  async getDashboardKpis() {
    const [
      totalOrders,
      totalProducts,
      totalCustomers,
      totalCustomDesigns,
      orders
    ] = await Promise.all([
      this.orderModel.countDocuments(),
      this.productModel.countDocuments({ status: 'ACTIVE' }),
      this.userModel.countDocuments({ role: UserRole.CUSTOMER }),
      this.designModel.countDocuments(),
      this.orderModel.find().sort({ createdAt: -1 }).limit(100).exec(),
    ]);

    let totalRevenue = 0;
    let totalDepositCollected = 0;
    let pendingDepositOrders = 0;
    let workshopProcessingOrders = 0;
    let shippingOrders = 0;
    let completedOrders = 0;

    orders.forEach(order => {
      totalRevenue += order.pricing?.totalAmount || 0;
      if (order.paymentStatus === PaymentStatus.PARTIALLY_PAID_DEPOSIT_50 || order.paymentStatus === PaymentStatus.PAID_FULL) {
        totalDepositCollected += order.pricing?.depositAmount || 0;
      }

      if (order.fulfillmentStatus === FulfillmentStatus.AWAITING_DEPOSIT) pendingDepositOrders++;
      else if (order.fulfillmentStatus === FulfillmentStatus.AT_WORKSHOP || order.fulfillmentStatus === FulfillmentStatus.QUALITY_INSPECTION) workshopProcessingOrders++;
      else if (order.fulfillmentStatus === FulfillmentStatus.SHIPPED) shippingOrders++;
      else if (order.fulfillmentStatus === FulfillmentStatus.DELIVERED) completedOrders++;
    });

    const recentOrders = orders.slice(0, 8);

    return {
      kpis: {
        totalRevenue,
        totalDepositCollected,
        depositGrowthPercent: 18.4,
        totalOrders,
        pipeline: {
          pendingDeposit: pendingDepositOrders,
          atWorkshop: workshopProcessingOrders,
          shipping: shippingOrders,
          completed: completedOrders
        },
        aiConcierge: {
          consultationCount: 1240,
          conversionRate: 28.6
        },
        customMockups: {
          totalDesigns: totalCustomDesigns,
          renderLatencyMs: 12
        },
        totalProducts,
        totalCustomers
      },
      recentOrders
    };
  }

  async getAllUsers(query: any) {
    const filter: any = {};
    if (query.role) filter.role = query.role;
    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query.limit || 15)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.userModel.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateUserRole(id: string, role: UserRole) {
    const user = await this.userModel.findByIdAndUpdate(id, { role }, { new: true }).select('-password');
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    return user;
  }

  async updateUserStatus(id: string, isActive: boolean) {
    const user = await this.userModel.findByIdAndUpdate(id, { isActive }, { new: true }).select('-password');
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    return user;
  }
}
