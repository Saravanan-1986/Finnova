import mongoose from 'mongoose';

// Audit trail of every deduction (auto or manual "Pay Now")
const chargeSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: [0, 'Charge amount cannot be negative'],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    // Linked expense so the charge is reflected in Spending History & income
    expense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expense',
    },
  },
  { _id: false }
);

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Popular provider key (netflix, amazon-prime, hotstar, zee5, ...) or 'other'
    serviceKey: {
      type: String,
      trim: true,
      default: 'other',
    },
    name: {
      type: String,
      required: [true, 'Subscription name is required'],
      trim: true,
    },
    plan: {
      type: String,
      trim: true,
      default: '',
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    // Category used for the generated expense (Spending History)
    category: {
      type: String,
      trim: true,
      default: 'Entertainment',
    },
    autoPay: {
      type: Boolean,
      default: false,
    },
    // Day of month (1-28) on which auto-pay deducts the amount
    autoPayDate: {
      type: Number,
      min: [1, 'Auto-pay date must be between 1 and 28'],
      max: [28, 'Auto-pay date must be between 1 and 28'],
      default: 1,
    },
    status: {
      type: String,
      enum: ['active', 'cancelled'],
      default: 'active',
    },
    // Month key "YYYY-MM" of the last deduction — guarantees at most one
    // charge per month and makes auto-pay idempotent.
    lastChargedMonth: {
      type: String,
      default: '',
    },
    charges: [chargeSchema],
  },
  {
    timestamps: true,
  }
);

const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;
