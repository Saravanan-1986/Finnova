import mongoose from 'mongoose';

const savedPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    itemType: {
      type: String,
      enum: ['scheme', 'insurance'],
      required: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'itemTypeModel',
    },
    itemTypeModel: {
      type: String,
      required: true,
      enum: ['Scheme', 'InsuranceProduct'],
    },
    status: {
      type: String,
      enum: ['interested', 'applied', 'active'],
      default: 'interested',
    },
    savedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

savedPlanSchema.index({ user: 1, itemId: 1 }, { unique: true });

const SavedPlan = mongoose.model('SavedPlan', savedPlanSchema);
export default SavedPlan;
