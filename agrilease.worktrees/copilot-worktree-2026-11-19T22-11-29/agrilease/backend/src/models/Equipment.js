import mongoose from 'mongoose';

const equipmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  brandModel: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  rateType: {
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  availability: {
    type: Boolean,
    default: true,
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
}, { timestamps: true });

const Equipment = mongoose.model('Equipment', equipmentSchema);

export default Equipment;