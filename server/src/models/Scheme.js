import mongoose from 'mongoose';

const schemeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    issuer: {
      type: String,
      required: [true, 'Issuer is required'], // 'Central' | 'State' | specific state name
      trim: true,
    },
    category: {
      type: String,
      enum: ['health', 'life', 'pension', 'crop', 'accident', 'education', 'housing', 'other'],
      required: [true, 'Category is required'],
    },
    shortDescription: {
      type: String,
      required: [true, 'Short description is required'],
      trim: true,
    },
    fullDescription: {
      type: String,
      required: [true, 'Full description is required'],
      trim: true,
    },
    eligibility: {
      minAge: {
        type: Number,
        default: 0,
      },
      maxAge: {
        type: Number,
        default: 100,
      },
      gender: {
        type: String,
        enum: ['any', 'male', 'female'],
        default: 'any',
      },
      minIncome: {
        type: Number,
        default: 0,
      },
      maxIncome: {
        type: Number,
        default: 999999999, // Fallback for Infinity
      },
      occupation: {
        type: [String],
        default: ['any'],
      },
      applicableStates: {
        type: [String],
        default: ['any'],
      },
    },
    benefits: {
      type: [String],
      default: [],
    },
    documentsRequired: {
      type: [String],
      default: [],
    },
    applicationSteps: {
      type: [String],
      default: [],
    },
    officialLink: {
      type: String,
      required: [true, 'Official link is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

schemeSchema.index({ category: 1 });
schemeSchema.index({ issuer: 1 });
schemeSchema.index({ 'eligibility.occupation': 1 });

const Scheme = mongoose.model('Scheme', schemeSchema);
export default Scheme;
