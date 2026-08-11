import mongoose from 'mongoose';

const dependentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    relation: {
      type: String,
      enum: ['spouse', 'child', 'parent', 'sibling', 'other'],
      required: [true, 'Relation is required'],
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [0, 'Age cannot be negative'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: [true, 'Gender is required'],
    },
  },
  {
    timestamps: true,
  }
);

const Dependent = mongoose.model('Dependent', dependentSchema);
export default Dependent;
