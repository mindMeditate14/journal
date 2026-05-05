import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    uid: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      match: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    profile: {
      firstName: String,
      lastName: String,
      affiliation: String,
      bio: String,
      avatar: String,
      expertise: [String],
    },
    role: {
      type: String,
      enum: ['admin', 'editor', 'researcher', 'reviewer', 'practitioner', 'reader'],
      index: true,
    },
    roles: {
      type: [{ type: String, enum: ['admin', 'editor', 'researcher', 'reviewer', 'practitioner', 'reader'] }],
      default: ['researcher'],
      index: true,
    },
    subscription: {
      plan: {
        type: String,
        enum: ['free', 'researcher', 'premium', 'institutional'],
        default: 'free',
      },
      expiresAt: Date,
      features: {
        maxProjects: { type: Number, default: 5 },
        maxLibraryItems: { type: Number, default: 100 },
        aiAssistantAccess: { type: Boolean, default: false },
        advancedSearch: { type: Boolean, default: false },
      },
    },
    workspace: {
      projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ResearchProject' }],
      libraries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Library' }],
      drafts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Manuscript' }],
      savedJournals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Journal' }],
    },
    preferences: {
      theme: { type: String, default: 'light' },
      defaultCitationStyle: { type: String, default: 'apa' },
      notifications: { type: Boolean, default: true },
      emailDigest: { type: Boolean, default: false },
    },
    lastLogin: Date,
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const normalizeRoles = (role, roles) => {
  const input = Array.isArray(roles) && roles.length > 0 ? roles : (role ? [role] : []);
  const unique = [...new Set(input.filter(Boolean))];
  return unique.length > 0 ? unique : ['researcher'];
};

userSchema.pre('validate', function (next) {
  this.roles = normalizeRoles(this.role, this.roles);
  this.role = this.roles[0];
  next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcryptjs.genSalt(12);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcryptjs.compare(candidatePassword, this.password);
};

// Exclude sensitive fields in JSON response
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  user.roles = normalizeRoles(user.role, user.roles);
  user.role = user.roles[0];
  return user;
};

export default mongoose.model('User', userSchema);
