import { Schema } from 'mongoose';
const oid = Schema.Types.ObjectId;
export const ReviewSchema = new Schema(
  {
    userId: { type: oid, required: true },
    orderId: { type: oid, required: true },
    productId: { type: oid, required: true },
    author: String,
    rating: Number,
    content: String,
    attachments: [oid],
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    moderationNote: String,
    moderatedBy: oid,
    publishedAt: Date,
  },
  { timestamps: true },
);
ReviewSchema.index({ orderId: 1, productId: 1 }, { unique: true });
export const SupportCaseSchema = new Schema(
  {
    userId: oid,
    orderId: { type: oid, ref: 'Order', required: true },
    productId: oid,
    type: {
      type: String,
      enum: ['RETURN', 'COMPLAINT', 'SUPPORT'],
      required: true,
    },
    reason: String,
    description: String,
    attachments: [oid],
    status: {
      type: String,
      enum: [
        'OPEN',
        'QUEUED',
        'INVESTIGATING',
        'NEEDS_INFO',
        'RESOLVING',
        'CLOSED',
      ],
      default: 'OPEN',
    },
    availableAt: Date,
    investigation: String,
    responsibility: String,
    customizationChecked: Boolean,
    resolution: String,
    result: String,
    resolutionStatus: String,
    closedAt: Date,
    messages: {
      type: [{ author: String, text: String, timestamp: Date }],
      default: [],
    },
    sourceKey: String,
  },
  { timestamps: true },
);
SupportCaseSchema.index({ sourceKey: 1 }, { unique: true, sparse: true });
export const NoticeSchema = new Schema(
  {
    key: { type: String, unique: true },
    userId: { type: oid, required: true },
    orderId: oid,
    kind: String,
    text: String,
    href: String,
    dueAt: Date,
    sentAt: Date,
    readAt: Date,
    status: {
      type: String,
      enum: ['SCHEDULED', 'SENT', 'DISMISSED'],
      default: 'SCHEDULED',
    },
  },
  { timestamps: true },
);
NoticeSchema.index({ status: 1, dueAt: 1 });
export const RefundSchema = new Schema(
  {
    key: { type: String, unique: true },
    orderId: { type: oid, required: true },
    caseId: oid,
    userId: oid,
    amount: Number,
    currency: { type: String, default: 'VND' },
    status: {
      type: String,
      enum: ['PENDING', 'FAILED', 'SUCCESS'],
      default: 'PENDING',
    },
    gatewayReference: String,
    error: String,
    nextAttemptAt: Date,
    completedAt: Date,
  },
  { timestamps: true },
);
RefundSchema.index({ orderId: 1 }, { unique: true });
export const AttachmentSchema = new Schema(
  {
    userId: { type: oid, required: true },
    name: String,
    mime: String,
    size: Number,
    data: { type: Buffer, required: true, select: false },
  },
  { timestamps: true },
);
