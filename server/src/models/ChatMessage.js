import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: [true, 'Role is required'],
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

chatMessageSchema.index({ user: 1, createdAt: 1 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export default ChatMessage;