import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    items: [
      {
        value: { type: String, required: true },
        label: { type: String, required: true },
        order: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Settings', settingsSchema);
