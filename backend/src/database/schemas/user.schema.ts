import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from '../../common/enums/role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ trim: true, default: '' })
  phone: string;

  @Prop({ default: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRbj1Xlk6xPUT5xpT4NWozIhnu9-l5jJFg3wi5hduQMFNP8eq35s6HQi-7njUTqplZ5gKMJgwL0aYcoB4ZQhuTXuywlvmCNpmRBDnC8fAFTen2ZkUwFa1tRBkI62LPpBWCU5T8tqFTA2aGvXfm8T8T2KenmPq5-ajEmvJdZxoLXYgMY1-NSDsEItTCboL69H-cD0E1nwDsT4gm2om46yVFNOrpxv3GkjkhCLDxSbPCfDpfmKYZHF1jP6tbM72_Xg_fvIA' })
  avatar: string;

  @Prop({
    type: {
      street: { type: String, default: '' },
      ward: { type: String, default: '' },
      district: { type: String, default: '' },
      city: { type: String, default: '' }
    },
    default: {}
  })
  address: {
    street: string;
    ward: string;
    district: string;
    city: string;
  };

  @Prop({ type: String, enum: UserRole, default: UserRole.CUSTOMER })
  role: UserRole;

  @Prop({ default: 100 })
  loyaltyPoints: number;

  @Prop({ default: 'BRONZE', enum: ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND'] })
  loyaltyTier: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1 });
