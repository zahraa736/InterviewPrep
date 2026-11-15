import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true, select: false },
  resetTokenHash: { type: String, select: false },
  resetTokenExpiresAt: { type: Date, select: false }
});

userSchema.pre('save', async function () {
  if (this.isModified('password_hash')) {
    this.password_hash = await bcrypt.hash(this.password_hash, 10);
  }
});

userSchema.set('toJSON', {
  transform: function (document, returnedObject) {
    delete returnedObject.password_hash;
    delete returnedObject.resetTokenHash;
    delete returnedObject.resetTokenExpiresAt;
    return returnedObject;
  }
});

const User = mongoose.model('User', userSchema);

export default User;
