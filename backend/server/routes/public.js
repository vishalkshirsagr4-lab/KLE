const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, Team, Invitation, Domain, Announcement } = require('../models');
const { auth, sign } = require('../middleware/auth');
const { sendConfirmation, sendOtp, sendTeamInvitation, sendInvitationDecision } = require('../lib/mail');
const { createNotification, markInvitationNotificationRead } = require('../lib/notifications');

const EMAIL = /^\S+@\S+\.\S+$/;
const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

async function validate(b) {
  const d = {
    name: str(b.team, 80), size: Number(b.size), college: str(b.college, 120), idNumber: str(b.idn, 60),
    domain: str(b.domain, 60), problemStatement: str(b.ps, 3000),
    leader: { name: str(b.ln, 80), email: str(b.le, 120).toLowerCase() }
  };
  if (!d.name || !d.college || !d.idNumber || !d.leader.name) return { error: 'Fill in all required fields.' };
  if (![2, 3, 4].includes(d.size)) return { error: 'Team size must be 2, 3 or 4.' };
  if (!EMAIL.test(d.leader.email)) return { error: 'Enter a valid team leader email.' };
  if (d.problemStatement.length < 50) return { error: 'Problem statement needs at least 50 characters.' };
  if (!(await Domain.exists({ name: d.domain }))) return { error: 'Choose a valid domain.' };
  if (typeof b.idFile === 'string' && b.idFile) {
    if (!/^data:(image\/(png|jpe?g|webp)|application\/pdf);base64,/.test(b.idFile) || b.idFile.length > 2e6)
      return { error: 'ID card must be an image or PDF under 1.5 MB.' };
    d.idFile = b.idFile;
  }
  return { data: d };
}

function serializeParticipant(user) {
  if (!user) return null;
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    college: user.college || '',
    status: user.status || (user.emailVerified ? 'VERIFIED' : 'PENDING_VERIFICATION')
  };
}

// Email verification (6-digit code sent through Brevo)
const hashCode = (email, code) => crypto.createHmac('sha256', process.env.JWT_SECRET).update(email + ':' + code).digest('hex');
const sameHash = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
async function issueOtp(u) {
  const code = String(crypto.randomInt(100000, 1000000));
  u.otpHash = undefined; u.otpExpires = undefined; u.otpAttempts = 0; u.otpSentAt = undefined;
  await u.save();
  await sendOtp(u, code);
  u.otpHash = hashCode(u.email, code); u.otpExpires = new Date(Date.now() + 10 * 60 * 1000); u.otpSentAt = new Date();
  await u.save();
}
const MAIL_FAIL = 'We could not send the verification email. Check the Brevo settings, then press Resend code.';

function getMailErrorMessage(error) {
  const ip = error.message.match(/unrecogni[sz]ed IP address\s+([0-9a-f:.]+)/i)?.[1];
  if (ip) {
    return `Brevo blocked this server IP (${ip}). Add it to your authorized IPs at https://app.brevo.com/security/authorised_ips, then resend the code.`;
  }
  return MAIL_FAIL;
}

// POST /api/signup : creates an unverified account and emails a code
router.post('/signup', async (req, res) => {
  const name = str(req.body.name, 80), email = str(req.body.email, 120).toLowerCase(), pw = String(req.body.password || '');
  const college = str(req.body.college, 120), phone = str(req.body.phone, 30), course = str(req.body.course, 80), department = str(req.body.department, 80);
  if (!name || !EMAIL.test(email)) return res.status(400).json({ error: 'Enter your name and a valid email.' });
  if (pw.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  let u = await User.findOne({ email });
  if (u && u.emailVerified) return res.status(409).json({ error: 'This email already has an account. Log in instead.' });
  const password = await bcrypt.hash(pw, 10);
  if (u) { u.name = name; u.password = password; u.college = college || u.college; u.phone = phone || u.phone; u.course = course || u.course; u.department = department || u.department; u.status = 'PENDING_VERIFICATION'; }
  else u = new User({ name, email, password, college, phone, course, department, role: 'participant', status: 'PENDING_VERIFICATION' });
  try { await issueOtp(u); }
  catch (e) { console.error('OTP email failed:', e.message); return res.status(502).json({ error: getMailErrorMessage(e), needsVerification: true, email }); }
  res.status(201).json({ ok: true, needsVerification: true, email });
});

// POST /api/verify-email { email, code } : activates the account and logs in
router.post('/verify-email', async (req, res) => {
  const email = str(req.body.email, 120).toLowerCase(), code = str(String(req.body.code || ''), 10);
  const u = await User.findOne({ email });
  if (!u || u.emailVerified || !u.otpHash) return res.status(400).json({ error: 'Invalid or expired code. Request a new one.' });
  if (u.otpExpires < new Date() || u.otpAttempts >= 5) return res.status(400).json({ error: 'This code has expired or was tried too many times. Press Resend code.' });
  if (!sameHash(hashCode(email, code), u.otpHash)) {
    u.otpAttempts += 1; await u.save();
    return res.status(400).json({ error: `Wrong code. ${Math.max(0, 5 - u.otpAttempts)} tries left.` });
  }
  u.emailVerified = true; u.status = 'VERIFIED'; u.otpHash = undefined; u.otpExpires = undefined; u.otpAttempts = 0; await u.save();
  res.json({ token: sign(u), role: u.role, name: u.name });
});

// POST /api/resend-code { email } : 60 second cooldown
router.post('/resend-code', async (req, res) => {
  const u = await User.findOne({ email: str(req.body.email, 120).toLowerCase() });
  if (u && !u.emailVerified) {
    const wait = u.otpSentAt ? 60 - Math.floor((Date.now() - u.otpSentAt) / 1000) : 0;
    if (wait > 0) return res.status(429).json({ error: `Please wait ${wait} seconds before requesting another code.` });
    try { await issueOtp(u); } catch (e) { console.error('OTP email failed:', e.message); return res.status(502).json({ error: getMailErrorMessage(e) }); }
  }
  res.json({ ok: true });
});

router.get('/participants/search', auth, async (req, res) => {
  const currentUser = await User.findById(req.user.id).select('_id role emailVerified');
  if (!currentUser || currentUser.role !== 'participant' || !currentUser.emailVerified) {
    return res.status(403).json({ error: 'Only verified participants can search for other participants.' });
  }

  const q = str(req.query.q, 80);
  if (q.length < 2) return res.json([]);
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const occupiedIds = await Promise.all([
    Team.distinct('user'),
    Team.distinct('leaderId'),
    Team.distinct('members')
  ]);
  const unavailable = [...new Set(occupiedIds.flat().filter(Boolean).map((id) => id.toString()))];
  const users = await User.find({
    role: 'participant',
    emailVerified: true,
    _id: { $ne: currentUser._id, $nin: unavailable },
    $or: [{ name: regex }, { email: regex }, { college: regex }]
  }).select('_id name email college status').limit(10).lean();

  res.json(users.map((user) => serializeParticipant(user)));
});

router.post('/participants/search', auth, async (req, res) => {
  const currentUser = await User.findById(req.user.id).select('_id role emailVerified');
  if (!currentUser || currentUser.role !== 'participant' || !currentUser.emailVerified) {
    return res.status(403).json({ error: 'Only verified participants can search for other participants.' });
  }

  const q = str(req.body.q || req.query.q, 80);
  if (q.length < 2) return res.json([]);
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const occupiedIds = await Promise.all([
    Team.distinct('user'),
    Team.distinct('leaderId'),
    Team.distinct('members')
  ]);
  const unavailable = [...new Set(occupiedIds.flat().filter(Boolean).map((id) => id.toString()))];
  const users = await User.find({
    role: 'participant',
    emailVerified: true,
    _id: { $ne: currentUser._id, $nin: unavailable },
    $or: [{ name: regex }, { email: regex }, { college: regex }]
  }).select('_id name email college status').limit(10).lean();

  res.json(users.map((user) => serializeParticipant(user)));
});

// POST /api/team : logged-in participant registers their team
router.post('/team', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user || user.role !== 'participant') return res.status(403).json({ error: 'Only participants can register a team.' });
  if (!user.emailVerified) return res.status(403).json({ error: 'Only verified participants can create a team.' });
  if (await Team.exists({ $or: [{ user: user._id }, { leaderId: user._id }, { members: user._id }] })) return res.status(409).json({ error: 'You already registered a team. Edit it from your dashboard.' });

  const teamSize = Number(req.body.size || 2);
  const rawMembers = Array.isArray(req.body.memberIds) ? req.body.memberIds : (Array.isArray(req.body.members) ? req.body.members : []);
  if (rawMembers.length > 0) {
    return res.status(403).json({ error: 'Direct member assignment is not allowed. Invite verified participants and let them accept the invitation.' });
  }

  if (![2, 3, 4].includes(teamSize)) return res.status(400).json({ error: 'Team size must be 2, 3 or 4.' });

  const { error, data } = await validate({ ...req.body, le: user.email, ln: str(req.body.ln, 80) || user.name, members: [] });
  if (error) return res.status(400).json({ error });

  const team = await Team.create({
    ...data,
    user: user._id,
    leaderId: user._id,
    leader: { name: user.name, email: user.email },
    members: [],
    size: teamSize,
  });

  user.team = team._id; await user.save();
  sendConfirmation(team).catch((e) => console.error('Confirmation email failed:', e.message));
  res.status(201).json({ ok: true, team: { id: team._id, name: team.name, status: team.status } });
});

router.post('/team/invite', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user || user.role !== 'participant') return res.status(403).json({ error: 'Only participants can invite teammates.' });
  if (!user.emailVerified) return res.status(403).json({ error: 'Only verified participants can send invitations.' });

  const team = await Team.findOne({ leaderId: user._id });
  if (!team) return res.status(404).json({ error: 'Create a team before inviting members.' });

  const email = str(req.body.email, 120).toLowerCase();
  if (!EMAIL.test(email)) return res.status(400).json({ error: 'Enter the verified participant email to invite.' });
  const invitee = await User.findOne({
    email,
    role: 'participant',
    emailVerified: true
  });
  if (!invitee) return res.status(404).json({ error: 'Select a verified participant to invite.' });
  if (invitee._id.toString() === user._id.toString()) return res.status(400).json({ error: 'You cannot invite yourself.' });
  const existingTeam = await Team.exists({
    $or: [
      ...(invitee.team ? [{ _id: invitee.team }] : []),
      { user: invitee._id },
      { leaderId: invitee._id },
      { members: invitee._id }
    ]
  });
  if (existingTeam) return res.status(409).json({ error: 'This participant already belongs to a team.' });
  if (invitee.team) {
    invitee.team = undefined;
    await invitee.save();
  }

  const existingInvite = await Invitation.findOne({ team: team._id, invitee: invitee._id, status: 'pending' });
  if (existingInvite) return res.status(409).json({ error: 'This participant already received an invitation.' });
  const pendingInvitations = await Invitation.countDocuments({ team: team._id, status: 'pending' });
  if ((team.members || []).length + pendingInvitations >= team.size - 1) {
    return res.status(409).json({ error: 'Your team has no open member slots for another invitation.' });
  }

  const invite = await Invitation.create({ team: team._id, inviter: user._id, invitee: invitee._id, email: invitee.email });
  try {
    await sendTeamInvitation(team, invitee, user);
  } catch (error) {
    console.error('Invitation email failed:', error.message);
    await Invitation.deleteOne({ _id: invite._id });
    return res.status(502).json({ error: 'The invitation could not be sent by email. Please try again.' });
  }
  await createNotification({
    recipientId: invitee._id,
    title: 'Team invitation',
    message: `${user.name} invited you to join ${team.name}. Accept or reject it from My Team.`,
    type: 'TEAM',
    dedupeKey: `team-invitation:${invite._id}`,
    metadata: { invitationId: invite._id.toString(), url: '/portal?view=teams' }
  });
  res.status(201).json({ ok: true, invite: { id: invite._id, status: invite.status, invitee: serializeParticipant(invitee) } });
});

router.get('/team/invitations', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user || user.role !== 'participant') return res.status(403).json({ error: 'Only participants can view invitations.' });

  const [received, sent] = await Promise.all([
    Invitation.find({ invitee: user._id }).populate('team', 'name status').populate('inviter', 'name email').sort('-createdAt').lean(),
    Invitation.find({ inviter: user._id }).populate('invitee', 'name email college').populate('team', 'name status').sort('-createdAt').lean()
  ]);

  res.json({
    received: received.map((item) => ({
      id: item._id,
      status: item.status,
      createdAt: item.createdAt,
      team: item.team ? { id: item.team._id, name: item.team.name, status: item.team.status } : null,
      inviter: item.inviter ? { name: item.inviter.name, email: item.inviter.email } : null
    })),
    sent: sent.map((item) => ({
      id: item._id,
      status: item.status,
      createdAt: item.createdAt,
      invitee: item.invitee ? serializeParticipant(item.invitee) : null,
      team: item.team ? { id: item.team._id, name: item.team.name, status: item.team.status } : null
    }))
  });
});

router.post('/team/invitations/:id/accept', auth, async (req, res) => {
  if (req.user.role !== 'participant') return res.status(403).json({ error: 'Only participants can accept team invitations.' });
  const invitation = await Invitation.findById(req.params.id).populate('team invitee');
  if (!invitation) return res.status(404).json({ error: 'Invitation not found.' });
  if (!invitation.invitee) return res.status(404).json({ error: 'Invitation recipient no longer exists.' });
  if (invitation.invitee._id.toString() !== req.user.id) return res.status(403).json({ error: 'This invitation is not for your account.' });
  if (invitation.status !== 'pending') return res.status(409).json({ error: 'This invitation has already been answered.' });
  if (!invitation.team) return res.status(404).json({ error: 'Team no longer exists.' });

  const claimed = await Invitation.findOneAndUpdate(
    { _id: invitation._id, invitee: req.user.id, status: 'pending' },
    { $set: { status: 'accepted' } },
    { new: true }
  );
  if (!claimed) return res.status(409).json({ error: 'This invitation has already been answered.' });

  const teamId = invitation.team._id;
  let invitee;
  try {
    invitee = await User.findOneAndUpdate(
      { _id: req.user.id, role: 'participant', emailVerified: true, team: null },
      { $set: { team: teamId, status: 'VERIFIED' } },
      { new: true }
    );
    if (!invitee) {
      await Invitation.updateOne({ _id: invitation._id, status: 'accepted' }, { $set: { status: 'pending' } });
      return res.status(409).json({ error: 'You already belong to a team or your account is not verified.' });
    }

    const updatedTeam = await Team.findOneAndUpdate(
      {
        _id: teamId,
        members: { $ne: invitee._id },
        $expr: { $lt: [{ $size: { $ifNull: ['$members', []] } }, { $subtract: ['$size', 1] }] }
      },
      { $addToSet: { members: invitee._id } },
      { new: true }
    );
    if (!updatedTeam) {
      await User.updateOne({ _id: invitee._id, team: teamId }, { $unset: { team: 1 } });
      await Invitation.updateOne({ _id: invitation._id, status: 'accepted' }, { $set: { status: 'pending' } });
      return res.status(409).json({ error: 'This team is full or you already belong to it.' });
    }

    const supersededInvitations = await Invitation.find({
      invitee: invitee._id,
      _id: { $ne: invitation._id },
      status: 'pending'
    }).select('_id').lean();
    await Invitation.updateMany({ invitee: invitee._id, _id: { $ne: invitation._id }, status: 'pending' }, { $set: { status: 'rejected' } });
    try {
      await Promise.all([
        markInvitationNotificationRead(invitee._id, invitation._id, 'accepted'),
        ...supersededInvitations.map((item) =>
          markInvitationNotificationRead(invitee._id, item._id, 'rejected')
        )
      ]);
    } catch (error) {
      console.error('Invitation notification sync failed:', error.message);
    }
    try { await sendInvitationDecision(invitation, 'accepted'); } catch (error) { console.error('Invitation decision email failed:', error.message); }
    res.json({ ok: true, team: { id: updatedTeam._id, name: updatedTeam.name, status: updatedTeam.status }, invitation: { id: invitation._id, status: 'accepted' } });
  } catch (error) {
    if (invitee) {
      await Team.updateOne({ _id: teamId }, { $pull: { members: invitee._id } });
      await User.updateOne({ _id: invitee._id, team: teamId }, { $unset: { team: 1 } });
    }
    await Invitation.updateOne({ _id: invitation._id, status: 'accepted' }, { $set: { status: 'pending' } });
    throw error;
  }
});

router.post('/team/invitations/:id/reject', auth, async (req, res) => {
  if (req.user.role !== 'participant') return res.status(403).json({ error: 'Only participants can reject team invitations.' });
  const invitation = await Invitation.findById(req.params.id).populate('invitee');
  if (!invitation) return res.status(404).json({ error: 'Invitation not found.' });
  if (!invitation.invitee) return res.status(404).json({ error: 'Invitation recipient no longer exists.' });
  if (invitation.invitee._id.toString() !== req.user.id) return res.status(403).json({ error: 'This invitation is not for your account.' });

  const rejected = await Invitation.findOneAndUpdate(
    { _id: invitation._id, invitee: req.user.id, status: 'pending' },
    { $set: { status: 'rejected' } },
    { new: true }
  );
  if (!rejected) return res.status(409).json({ error: 'This invitation has already been answered.' });
  try {
    await markInvitationNotificationRead(invitation.invitee._id, invitation._id, 'rejected');
  } catch (error) {
    console.error('Invitation notification sync failed:', error.message);
  }
  try { await sendInvitationDecision(invitation, 'rejected'); } catch (error) { console.error('Invitation decision email failed:', error.message); }
  res.json({ ok: true, invitation: { id: rejected._id, status: rejected.status } });
});

// POST /api/login : participants and admins
router.post('/login', async (req, res) => {
  const email = str(req.body.email, 120).toLowerCase();
  const u = await User.findOne({ email });
  if (!u || !(await bcrypt.compare(String(req.body.password || ''), u.password))) return res.status(401).json({ error: 'Wrong email or password.' });
  if (u.role === 'participant' && !u.emailVerified) return res.status(403).json({ error: 'Verify your email first. Enter the code we sent you, or press Resend code.', needsVerification: true, email });
  res.json({ token: sign(u), role: u.role, name: u.name });
});

// GET /api/me : the participant's own team
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('name email role college status emailVerified team');
  const team = await Team.findOne({ $or: [{ user: req.user.id }, { leaderId: req.user.id }, { members: req.user.id }] }).lean();
  if (!team) return res.json({ user, team: null, invitations: [] });

  const memberIds = Array.isArray(team.members) ? team.members : [];
  const members = await User.find({ _id: { $in: memberIds } }).select('name email college').lean();
  const memberMap = new Map(members.map((member) => [member._id.toString(), serializeParticipant(member)]));
  team.members = (memberIds || []).map((id) => memberMap.get(id.toString()) || null).filter(Boolean);
  team.hasId = !!team.idFile; delete team.idFile;

  const invitations = await Invitation.find({ $or: [{ invitee: req.user.id }, { inviter: req.user.id }] }).sort('-createdAt').lean();
  res.json({ user, team, invitations: invitations.map((item) => ({ id: item._id, status: item.status, team: item.team && item.team.toString(), createdAt: item.createdAt })) });
});

// PUT /api/me/team : edit team details, domain, problem statement
router.put('/me/team', auth, async (req, res) => {
  const team = await Team.findOne({ leaderId: req.user.id });
  if (!team) return res.status(404).json({ error: 'No team found for this account.' });

  const rawMembers = Array.isArray(req.body.memberIds) ? req.body.memberIds : (Array.isArray(req.body.members) ? req.body.members : []);
  if (rawMembers.length > 0) return res.status(403).json({ error: 'Team members can only join by accepting an invitation.' });

  const teamSize = Number(req.body.size || team.size || 2);
  if (![2, 3, 4].includes(teamSize)) return res.status(400).json({ error: 'Team size must be 2, 3 or 4.' });
  if ((team.members || []).length > teamSize - 1) return res.status(409).json({ error: 'Team size cannot be smaller than its current membership.' });

  const leader = await User.findById(req.user.id).select('name email');
  if (!leader) return res.status(404).json({ error: 'Team leader account not found.' });
  const b = { ...req.body, ln: leader.name, le: leader.email };
  const { error, data } = await validate(b);
  if (error) return res.status(400).json({ error });

  Object.assign(team, {
    name: data.name,
    size: teamSize,
    college: data.college,
    idNumber: data.idNumber,
    domain: data.domain,
    problemStatement: data.problemStatement,
    leader: { name: leader.name, email: leader.email },
  });
  if (data.idFile) team.idFile = data.idFile;
  await team.save();
  res.json({ ok: true });
});

router.get('/domains', async (req, res) => res.json(await Domain.find().sort('name').lean()));
router.get('/announcements', async (req, res) => res.json(await Announcement.find().sort('-createdAt').limit(20).lean()));

module.exports = router;
