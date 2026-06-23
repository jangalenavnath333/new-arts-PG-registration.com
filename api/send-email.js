const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { to, subject, html, attachments } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    }

    const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const port = Number(process.env.EMAIL_PORT) || 465;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const sender = process.env.EMAIL_FROM || '"CET Exam Portal" <casas@newartsdcs.ac.in>';

    if (!user || !pass) {
      console.error(`[SMTP Error] Missing EMAIL_USER or EMAIL_PASS environment variables.`);
      return res.status(500).json({ error: 'SMTP Authentication is not configured.' });
    }

    if (!host || !port || isNaN(port)) {
      console.error(`[SMTP Error] Invalid host or port configuration.`);
      return res.status(500).json({ error: 'SMTP Host or Port is invalid.' });
    }

    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user: user,
        pass: pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify SMTP connection (optional but good for diagnostics, skipped to avoid latency for every email, but we validate config above)
    // Actually we can just wait for sendMail to throw on auth error

    const mailOptions = {
      from: sender,
      to,
      subject,
      html
    };

    if (attachments && Array.isArray(attachments)) {
      mailOptions.attachments = attachments;
    }

    const info = await transporter.sendMail(mailOptions);

    console.log(`\n========== Server Email Diagnostic Report ==========`);
    console.log(`- Recipient: ${to}`);
    console.log(`- Provider: SMTP (${host}:${port})`);
    console.log(`- Sender: ${sender}`);
    console.log(`- Message ID: ${info.messageId}`);
    console.log(`- Delivery Result: SUCCESS`);
    console.log(`- Error Message: None`);
    console.log(`====================================================\n`);

    return res.status(200).json({ success: true, message: "Email sent successfully", messageId: info.messageId });
  } catch (error) {
    console.error(`\n========== Server Email Diagnostic Report ==========`);
    console.log(`- Provider: SMTP`);
    console.log(`- Delivery Result: FAILED`);
    console.log(`- Error Message: ${error.message}`);
    console.error(`====================================================\n`);
    
    return res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
}
