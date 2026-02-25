import mongoose from 'mongoose';

const CollectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

CollectionSchema.index({ slug: 1 });

export default mongoose.models.Collection || mongoose.model('Collection', CollectionSchema);
