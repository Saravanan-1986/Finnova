import mongoose from 'mongoose';

const coverTierSchema = new mongoose.Schema({
  coverAmount: {
    type: Number,
    required: [true, 'Cover amount is required'],
  },
  indicativeAnnualPremium: {
    type: Number,
    required: [true, 'Indicative annual premium is required'],
  },
});

const insuranceProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    insurer: {
      type: String,
      required: [true, 'Insurer is required'], // Star Health, HDFC Ergo, LIC, etc.
      trim: true,
    },
    category: {
      type: String,
      enum: ['health', 'term_life', 'vehicle', 'accident'],
      required: [true, 'Category is required'],
    },
    shortDescription: {
      type: String,
      required: [true, 'Short description is required'],
      trim: true,
    },
    coverTiers: {
      type: [coverTierSchema],
      required: [true, 'Cover tiers are required'],
    },
    keyFeatures: {
      type: [String],
      default: [],
    },
    inclusions: {
      type: [String],
      default: [],
    },
    exclusions: {
      type: [String],
      default: [],
    },
    claimSettlementRatio: {
      type: Number,
      required: [true, 'Claim settlement ratio is required'],
      min: 0,
      max: 100,
    },
    claimProcess: {
      type: [String],
      default: [],
    },
    officialLink: {
      type: String,
      required: [true, 'Official link is required'],
      trim: true,
    },
    // Weekly refresh tracking: details are re-verified from the official site every 7 days
    lastRefreshedAt: {
      type: Date,
      default: null,
    },
    refreshStatus: {
      type: String,
      enum: ['pending', 'ok', 'unreachable', 'error'],
      default: 'pending',
    },
    httpStatusCode: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

insuranceProductSchema.index({ category: 1 });
insuranceProductSchema.index({ insurer: 1 });

const InsuranceProduct = mongoose.model('InsuranceProduct', insuranceProductSchema);
export default InsuranceProduct;
