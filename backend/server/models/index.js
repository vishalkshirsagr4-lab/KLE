const mongoose = require('mongoose');
const { Schema } = mongoose;
const person = { name: { type: String, required: true }, email: { type: String, required: true, lowercase: true } };

const User = mongoose.models.User || mongoose.model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: String,
  college: String,
  course: String,
  department: String,
  password: { type: String, required: true },
  role: { type: String, enum: ['participant', 'admin'], default: 'participant' },
  team: { type: Schema.Types.ObjectId, ref: 'Team' },
  emailVerified: { type: Boolean, default: false },
  status: { type: String, enum: ['PENDING_VERIFICATION', 'VERIFIED', 'REJECTED'], default: 'PENDING_VERIFICATION' },
  otpHash: String,
  otpExpires: Date,
  otpAttempts: { type: Number, default: 0 },
  otpSentAt: Date
}, { timestamps: true }));

const Team = mongoose.models.Team || mongoose.model('Team', new Schema({
  name: { type: String, required: true },
  size: { type: Number, enum: [2, 3, 4], required: true },
  college: { type: String, required: true },
  idNumber: { type: String, required: true },
  idFile: String,
  domain: { type: String, required: true },
  problemStatement: { type: String, required: true, minlength: 50 },
  leader: person,
  leaderId: { type: Schema.Types.ObjectId, ref: 'User' },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  user: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true }));

const Invitation = mongoose.models.Invitation || mongoose.model('Invitation', new Schema({
  team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  inviter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  invitee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  message: { type: String, default: '' }
}, { timestamps: true }));

const Domain = mongoose.models.Domain || mongoose.model('Domain', new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' }
}));

const Announcement = mongoose.models.Announcement || mongoose.model('Announcement', new Schema({
  message: { type: String, required: true }
}, { timestamps: true }));

module.exports = { User, Team, Invitation, Domain, Announcement };
