import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [0, 'Target amount cannot be negative'],
    },
    targetDate: {
      type: Date,
      required: [true, 'Target date is required'],
    },
    savedAmount: {
      type: Number,
      default: 0,
      min: [0, 'Saved amount cannot be negative'],
    },
    // 'emergency_fund' is a special goal type (safety net), not a lifestyle goal
    type: {
      type: String,
      enum: ['goal', 'emergency_fund'],
      default: 'goal',
    },
    // Only used for emergency_fund: 3 or 6 months of income
    targetMonths: {
      type: Number,
      enum: [3, 6],
      default: 3,
    },
    // Audit trail of every contribution (used for contribution history + spending sync)
    contributions: [
      {
        amount: {
          type: Number,
          required: true,
          min: [0, 'Contribution amount cannot be negative'],
        },
        date: {
          type: Date,
          default: Date.now,
        },
        // Linked expense so the contribution is reflected in Spending History & income
        expense: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Expense',
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Goal = mongoose.model('Goal', goalSchema);
export default Goal;