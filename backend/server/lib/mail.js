const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const configured = () => Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);

async function send(to, subject, htmlContent) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not configured.');
  }
  if (!process.env.EMAIL_FROM) {
    throw new Error('EMAIL_FROM is not configured.');
  }

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY
    },
    body: JSON.stringify({
      sender: {
        name: process.env.EMAIL_FROM_NAME || 'KLE Hackathon 2K26',
        email: process.env.EMAIL_FROM
      },
      to: [{ email: to }],
      subject,
      htmlContent
    })
  });

  const responseBody = await response.text();
  let result;
  try {
    result = responseBody ? JSON.parse(responseBody) : {};
  } catch {
    result = { message: responseBody };
  }

  if (!response.ok) {
    const detail = result.message || result.code || response.statusText;
    throw new Error(`Brevo email request failed (${response.status}): ${detail}`);
  }

  return result;
}

async function sendOtp(user, code) {
  if (!user || !user.email) {
    throw new Error('An email address is required to send an OTP.');
  }

  await send(
    user.email,
    'KLE Hackathon 2K26 - Email verification',
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2>Verify your email</h2>
      <p>Use this code to verify your KLE Hackathon 2K26 account:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:6px">${escapeHtml(code)}</p>
      <p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
    </div>`
  );
}

async function sendConfirmation(team) {
  const email = team && team.leader && team.leader.email;
  if (!email) {
    throw new Error('A team leader email is required to send a confirmation.');
  }

  await send(
    email,
    'KLE Hackathon 2K26 - Team registration received',
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2>Team registration received</h2>
      <p>Thank you for registering <strong>${escapeHtml(team.name)}</strong>.</p>
      <p><strong>College:</strong> ${escapeHtml(team.college)}</p>
      <p><strong>Domain:</strong> ${escapeHtml(team.domain)}</p>
      <p><strong>Status:</strong> ${escapeHtml(team.status)}</p>
    </div>`
  );
}

async function sendTeamInvitation(team, invitee, inviter) {
  if (!invitee || !invitee.email) {
    throw new Error('An invitee email is required to send a team invitation.');
  }

  const teamName = team && team.name ? team.name : 'your team';
  const inviterName = inviter && inviter.name ? inviter.name : 'Your teammate';
  const portalUrl = `${(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '')}/portal`;

  await send(
    invitee.email,
    `KLE Hackathon 2K26 - Invitation to join ${teamName}`,
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2>Team invitation</h2>
      <p><strong>${escapeHtml(inviterName)}</strong> has invited you to join <strong>${escapeHtml(teamName)}</strong>.</p>
      <p>Sign in to your participant account to review this invitation. You can accept it to join the team or reject it from the Invitations section in My Team.</p>
      <p><a href="${escapeHtml(portalUrl)}" style="display:inline-block;padding:12px 18px;border-radius:6px;background:#63e6ff;color:#041019;text-decoration:none;font-weight:bold">Open participant portal</a></p>
      <p style="color:#667085;font-size:12px">This invitation does not add you to the team unless you accept it.</p>
    </div>`
  );
}

async function sendInvitationDecision(invitation, decision) {
  if (!invitation || !invitation.email) {
    return;
  }

  await send(
    invitation.email,
    decision === 'accepted' ? 'KLE Hackathon 2K26 - Invitation accepted' : 'KLE Hackathon 2K26 - Invitation rejected',
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2>${decision === 'accepted' ? 'Invitation accepted' : 'Invitation rejected'}</h2>
      <p>Your invitation status has been updated.</p>
    </div>`
  );
}

module.exports = { configured, send, sendOtp, sendConfirmation, sendTeamInvitation, sendInvitationDecision };
