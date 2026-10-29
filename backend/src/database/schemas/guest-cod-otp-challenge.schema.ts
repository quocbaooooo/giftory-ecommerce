import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GuestCodOtpChallengeDocument = GuestCodOtpChallenge & Document;

@Schema({ timestamps: true })
export class GuestCodOtpChallenge {
  @Prop({ required: true, unique: true, index: true })
  challengeId: string;

  @Prop({ required: true, index: true })
  phone: string;

  @Prop({ required: true })
  sessionId: string;

  @Prop({ required: true, select: false })
  codeHash: string;

  @Prop({ required: true, default: 0 })
  attemptsUsed: number;

  @Prop({ required: true, default: 1 })
  sendCount: number;

  @Prop({ required: true, enum: ['PENDING', 'VERIFIED', 'CONSUMED', 'LOCKED'], default: 'PENDING', index: true })
  status: 'PENDING' | 'VERIFIED' | 'CONSUMED' | 'LOCKED';

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop()
  verifiedAt?: Date;

  @Prop()
  consumedAt?: Date;
}

export const GuestCodOtpChallengeSchema = SchemaFactory.createForClass(GuestCodOtpChallenge);
GuestCodOtpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });
GuestCodOtpChallengeSchema.index({ phone: 1, sessionId: 1, createdAt: -1 });
