import mongoose from 'mongoose';

// One-off income on top of the fixed monthly income/allowance
// (freelance payouts, cashback, gifts, bonuses...). Added from the
// Dashboard "Add Extra Income" button and counted for the month it falls in.
const extraIncomeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const ExtraIncome = mongoose.model('ExtraIncome', extraIncomeSchema);
export default ExtraIncome;
