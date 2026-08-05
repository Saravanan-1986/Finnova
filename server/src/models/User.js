import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [10, 'Age must be at least 10'],
      max: [100, 'Age must be at most 100'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', ''],
      default: '',
    },
    occupationType: {
      type: String,
      enum: ['student', 'professional'],
      required: [true, 'Occupation type is required'],
    },
    // Student fields
    college: {
      type: String,
      trim: true,
      default: '',
    },
    monthlyAllowance: {
      type: Number,
      default: 0,
    },
    // Professional fields
    sector: {
      type: String,
      enum: ['IT', 'Finance', 'Healthcare', 'Education', 'Other', ''],
      default: '',
    },
    monthlyIncome: {
      type: Number,
      default: 0,
    },
    region: {
      type: String,
      trim: true,
      default: '',
    },
    currency: {
      type: String,
      default: 'INR',
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);
export default User;