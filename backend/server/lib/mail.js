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

module.exports = { configured, send, sendOtp, sendConfirmation };
