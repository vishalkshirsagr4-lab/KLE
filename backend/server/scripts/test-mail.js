// Usage: npm run test-mail -- you@example.com
require('dotenv').config();
const { configured, send } = require('../lib/mail');
(async () => {
  if (!configured()) {
    console.error('Set BREVO_API_KEY and EMAIL_FROM in .env');
    process.exit(1);
  }
  const to = process.argv[2]; if (!to) { console.error('Pass an email address'); process.exit(1); }
  await send(to, 'Brevo test', '<p>Brevo email delivery works for KLE Hackathon 2K26.</p>');
  console.log('Test email sent to', to);
})().catch((e) => { console.error('Brevo test email failed:', e.message); process.exit(1); });
