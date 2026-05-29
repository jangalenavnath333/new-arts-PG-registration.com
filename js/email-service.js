// ============================================
// CET EXAM PORTAL - EMAIL NOTIFICATION SERVICE
// Calls the secure backend /api/send-email
// Professional HTML Email Templates with
// Official College Branding
// ============================================

export async function sendEmail(to, subject, html) {
  try {
    console.log("Sending email...");
    const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'http://localhost:3000/api/send-email' 
      : '/api/send-email';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, html }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Email API failed (${response.status}): ${errData.details || 'Unknown'}`);
    }

    const data = await response.json();
    console.log("Email sent successfully");
    return true;
  } catch (error) {
    console.error(error);
    return false; // Fail silently so app flow doesn't break
  }
}

export async function sendConfirmationEmail(data) {
  try {
    const loginUrl = window.location.origin + '/student/login.html';
    const tmpl = EmailTemplates.pendingApproval(
      data.fullName || data.name,
      data.studentId,
      data.email,
      data.mobile || data.password,
      loginUrl,
      data.courseApplied,
      data.paymentStatus
    );
    await sendEmail(data.email, tmpl.subject, tmpl.html);
  } catch (error) {
    console.error(error);
  }
}

// ── Shared Layout Helpers ──────────────────────────────────

function emailHeader() {
  return `
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #1e40af 100%); padding: 32px 20px; text-align: center; border-radius: 12px 12px 0 0;">
      <div style="font-size: 28px; margin-bottom: 6px;">🎓</div>
      <h1 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: 0.5px;">Department of Computer Science</h1>
      <p style="margin: 4px 0 0 0; color: #bfdbfe; font-size: 13px; font-weight: 500;">🏛️ New Arts, Commerce and Science College, Ahilyanagar</p>
      <p style="margin: 4px 0 0 0; color: #93c5fd; font-size: 12px; font-weight: 600; letter-spacing: 1px;">📘 CET Examination Cell</p>
      <div style="width: 60px; height: 3px; background: #60a5fa; margin: 14px auto 0; border-radius: 2px;"></div>
    </div>`;
}

function emailFooter() {
  return `
    <div style="background: #f8fafc; padding: 24px 20px; text-align: center; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
      <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px;">Warm Regards,</p>
      <p style="margin: 0; color: #1e3a5f; font-size: 13px; font-weight: 700;">🎓 Department of Computer Science</p>
      <p style="margin: 2px 0; color: #475569; font-size: 11px;">🏛️ New Arts, Commerce and Science College, Ahilyanagar</p>
      <p style="margin: 2px 0; color: #64748b; font-size: 11px;">📘 CET Examination Cell</p>
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #94a3b8; font-size: 10px;">This is an automated notification from the CET Exam Portal. Please do not reply to this email.</p>
      </div>
    </div>`;
}

function wrapEmail(bodyContent) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <div style="max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid #e2e8f0;">
      ${emailHeader()}
      <div style="padding: 28px 28px 20px;">
        ${bodyContent}
      </div>
      ${emailFooter()}
    </div>
  </body>
  </html>`;
}

function detailsBox(rows) {
  const rowsHtml = rows.map(([label, value]) => `
    <tr>
      <td style="padding: 8px 12px; color: #64748b; font-size: 13px; font-weight: 600; white-space: nowrap; border-bottom: 1px solid #f1f5f9;">${label}</td>
      <td style="padding: 8px 12px; color: #0f172a; font-size: 14px; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${value}</td>
    </tr>`).join('');

  return `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse;">
        ${rowsHtml}
      </table>
    </div>`;
}

function statusBadge(text, bgColor, textColor) {
  return `<span style="display: inline-block; background: ${bgColor}; color: ${textColor}; font-size: 12px; font-weight: 700; padding: 4px 14px; border-radius: 20px; letter-spacing: 0.5px;">${text}</span>`;
}

// ── Email Templates ────────────────────────────────────────

export const EmailTemplates = {

  // 1. Application Submitted / Pending Approval (with Login Credentials)
  pendingApproval: (name, cetId, email, mobile, loginUrl, courseName, paymentStatus) => ({
    subject: `📩 Application Received – CET Exam Portal | Your Login Credentials`,
    html: wrapEmail(`
      <h2 style="margin: 0 0 4px; color: #1e3a5f; font-size: 20px;">📩 Application Received Successfully</h2>
      <p style="margin: 0 0 16px; color: #64748b; font-size: 13px;">Your CET application has been submitted. Your login credentials are below.</p>

      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        Dear <strong style="color: #0f172a;">${name}</strong>,
      </p>
      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        Thank you for applying to the CET Examination. We have successfully received your application along with all uploaded documents and payment details.
      </p>

      ${detailsBox([
        ['👨‍🎓 Student Name', `<strong>${name}</strong>`],
        ['📚 Course Applied', `<strong>${courseName || 'N/A'}</strong>`],
        ['🆔 CET ID', `<strong>${cetId}</strong>`],
        ['💰 Payment Status', statusBadge(paymentStatus || 'SUCCESS', '#d1fae5', '#065f46')],
        ['📞 Contact Mobile', mobile],
        ['📧 Contact Email', email],
        ['📋 Application Status', statusBadge('PENDING APPROVAL', '#fef3c7', '#92400e')],
        ['📝 Next Step', 'Document &amp; Payment Verification by Admin']
      ])}

      <div style="background: linear-gradient(135deg, #eff6ff, #f0f9ff); border: 2px solid #3b82f6; border-radius: 10px; padding: 20px; margin: 24px 0;">
        <h3 style="margin: 0 0 14px; color: #1e40af; font-size: 16px; text-align: center;">🔐 Your Login Credentials</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 12px; color: #475569; font-size: 13px; font-weight: 600; border-bottom: 1px solid #bfdbfe; width: 40%;">🆔 CET ID / Username</td>
            <td style="padding: 10px 12px; color: #1e40af; font-size: 15px; font-weight: 800; border-bottom: 1px solid #bfdbfe; letter-spacing: 0.5px;">${cetId}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; color: #475569; font-size: 13px; font-weight: 600; border-bottom: 1px solid #bfdbfe;">📧 Registered Email</td>
            <td style="padding: 10px 12px; color: #0f172a; font-size: 14px; font-weight: 700; border-bottom: 1px solid #bfdbfe;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; color: #475569; font-size: 13px; font-weight: 600;">🔑 Password</td>
            <td style="padding: 10px 12px; color: #dc2626; font-size: 15px; font-weight: 800; letter-spacing: 1px;">${mobile}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 32px; border-radius: 8px; letter-spacing: 0.5px;">🔗 Go to Student Login Portal</a>
        <p style="margin: 8px 0 0; color: #94a3b8; font-size: 11px;">${loginUrl}</p>
      </div>

      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e; font-size: 13px;">
          🔒 <strong>Security Note:</strong> For your safety, please change your password after your first login. Do not share your login credentials with anyone.
        </p>
      </div>

      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        Once our admin team verifies your documents and payment, you will receive another email confirming your <strong>approval</strong> and exam schedule.
      </p>
      <p style="color: #64748b; font-size: 13px; margin-top: 16px;">
        ⏳ Please allow 24-48 hours for the verification process.
      </p>
    `)
  }),

  // 2. Application Approved
  approval: (name, cetId, examDate, startTime) => ({
    subject: `✅ Application APPROVED – Your CET ID: ${cetId}`,
    html: wrapEmail(`
      <h2 style="margin: 0 0 4px; color: #059669; font-size: 20px;">✅ Application Approved!</h2>
      <p style="margin: 0 0 16px; color: #64748b; font-size: 13px;">Congratulations! You are now registered for the CET Examination.</p>

      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        Dear <strong style="color: #0f172a;">${name}</strong>,
      </p>
      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        Your application has been reviewed, verified, and <strong style="color: #059669;">approved</strong> by the CET Examination Cell. Please find your details below:
      </p>

      ${detailsBox([
        ['🆔 CET ID', `<span style="color: #2563eb; font-size: 16px; letter-spacing: 1px;">${cetId}</span>`],
        ['📅 Exam Date', examDate || '<span style="color: #f59e0b;">To Be Announced</span>'],
        ['🕐 Start Time', startTime || '<span style="color: #f59e0b;">To Be Announced</span>'],
        ['📋 Status', statusBadge('APPROVED', '#d1fae5', '#065f46')]
      ])}

      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px; color: #1e40af; font-size: 14px; font-weight: 700;">📌 Important Instructions:</p>
        <ul style="margin: 0; padding-left: 18px; color: #334155; font-size: 13px; line-height: 1.8;">
          <li><strong>Download your Admit Card</strong> from the Quick Actions section of your Student Dashboard.</li>
          <li>Login using your <strong>CET ID</strong> and registered <strong>Mobile Number</strong>.</li>
          <li>Ensure a stable internet connection, working <strong>webcam</strong>, and <strong>microphone</strong>.</li>
          <li>Join the exam portal <strong>10 minutes before</strong> the scheduled time.</li>
          <li><strong>Do not</strong> switch tabs, use keyboard shortcuts, or take screenshots during the exam.</li>
          <li>After <strong>3 security warnings</strong>, your exam will be automatically locked.</li>
        </ul>
      </div>

      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        🍀 We wish you the very best for your examination!
      </p>
    `)
  }),

  // 3. Application Rejected
  rejection: (name, reason) => ({
    subject: `❌ Application Update – CET Exam Portal`,
    html: wrapEmail(`
      <h2 style="margin: 0 0 4px; color: #dc2626; font-size: 20px;">❌ Application Not Approved</h2>
      <p style="margin: 0 0 16px; color: #64748b; font-size: 13px;">There is an issue with your submitted application.</p>

      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        Dear <strong style="color: #0f172a;">${name}</strong>,
      </p>
      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        We regret to inform you that your CET Examination application could not be approved at this time.
      </p>

      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #991b1b; font-size: 13px; font-weight: 600;">
          🚫 Reason: <span style="font-weight: 400;">${reason || 'Submitted documents are incomplete, invalid, or do not meet the eligibility criteria.'}</span>
        </p>
      </div>

      ${detailsBox([
        ['📋 Status', statusBadge('REJECTED', '#fee2e2', '#991b1b')],
        ['🔄 Action Required', 'Re-apply with correct documents']
      ])}

      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        If you believe this is an error, please contact the CET Examination Cell or re-submit your application with the correct details and valid documents.
      </p>
    `)
  }),

  // 4. Payment Verified
  paymentVerified: (name, amount, transactionId) => ({
    subject: `💳 Payment Verified – CET Exam Portal`,
    html: wrapEmail(`
      <h2 style="margin: 0 0 4px; color: #059669; font-size: 20px;">💳 Payment Verified Successfully</h2>
      <p style="margin: 0 0 16px; color: #64748b; font-size: 13px;">Your exam fee payment has been confirmed.</p>

      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        Dear <strong style="color: #0f172a;">${name}</strong>,
      </p>
      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        We are pleased to confirm that your payment for the CET Examination has been successfully verified by the admin team.
      </p>

      ${detailsBox([
        ['💰 Amount Paid', `<strong>${amount || 'N/A'}</strong>`],
        ['🔢 Transaction ID', `<code style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 13px;">${transactionId || 'N/A'}</code>`],
        ['📋 Payment Status', statusBadge('VERIFIED', '#d1fae5', '#065f46')]
      ])}

      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        Your application will now proceed to the final approval stage. You will receive a separate email once your application is approved.
      </p>
    `)
  }),

  // 5. Exam Schedule / Reschedule
  scheduleUpdate: (name, examDate, startTime) => ({
    subject: `📅 Exam Schedule Update – CET Exam Portal`,
    html: wrapEmail(`
      <h2 style="margin: 0 0 4px; color: #2563eb; font-size: 20px;">📅 Exam Schedule Notification</h2>
      <p style="margin: 0 0 16px; color: #64748b; font-size: 13px;">Your CET Examination has been scheduled / rescheduled.</p>

      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        Dear <strong style="color: #0f172a;">${name}</strong>,
      </p>
      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        Please note the following exam schedule. Make sure to be prepared and available on time.
      </p>

      ${detailsBox([
        ['📅 Exam Date', `<strong style="font-size: 15px;">${examDate}</strong>`],
        ['🕐 Start Time', `<strong style="font-size: 15px;">${startTime}</strong>`],
        ['📋 Status', statusBadge('SCHEDULED', '#dbeafe', '#1e40af')]
      ])}

      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px; color: #92400e; font-size: 14px; font-weight: 700;">⚠️ Important Reminders:</p>
        <ul style="margin: 0; padding-left: 18px; color: #78350f; font-size: 13px; line-height: 1.8;">
          <li>Login to the CET portal <strong>10 minutes before</strong> the scheduled time.</li>
          <li>Keep your <strong>CET ID</strong> and registered <strong>Mobile Number</strong> ready.</li>
          <li>Use a <strong>laptop or desktop</strong> with Chrome/Edge browser for best experience.</li>
          <li>Ensure a working <strong>webcam</strong> and <strong>microphone</strong> are connected.</li>
          <li>Sit in a <strong>well-lit, quiet room</strong> with no other person present.</li>
        </ul>
      </div>
    `)
  }),

  // 6. Exam Reminder (uses same template as schedule but different subject)
  examReminder: (name, examDate, startTime) => ({
    subject: `🔔 Exam Reminder – CET Examination Tomorrow!`,
    html: wrapEmail(`
      <h2 style="margin: 0 0 4px; color: #dc2626; font-size: 20px;">🔔 Exam Reminder</h2>
      <p style="margin: 0 0 16px; color: #64748b; font-size: 13px;">Your CET Examination is approaching. Be prepared!</p>

      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        Dear <strong style="color: #0f172a;">${name}</strong>,
      </p>
      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        This is a reminder that your CET Examination is scheduled as below. Please ensure all preparations are complete.
      </p>

      ${detailsBox([
        ['📅 Exam Date', `<strong style="font-size: 16px; color: #dc2626;">${examDate}</strong>`],
        ['🕐 Start Time', `<strong style="font-size: 16px; color: #dc2626;">${startTime}</strong>`],
        ['📋 Status', statusBadge('UPCOMING', '#fee2e2', '#991b1b')]
      ])}

      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px; color: #991b1b; font-size: 14px; font-weight: 700;">🚨 Exam Day Rules:</p>
        <ul style="margin: 0; padding-left: 18px; color: #7f1d1d; font-size: 13px; line-height: 1.8;">
          <li><strong>Camera &amp; Microphone</strong> must remain ON throughout the exam.</li>
          <li><strong>Tab switching</strong> or minimizing the browser will trigger a warning.</li>
          <li><strong>Screenshots, copy-paste, and keyboard shortcuts</strong> are strictly blocked.</li>
          <li><strong>3 warnings = Automatic exam lock</strong>. Only admin can unlock.</li>
          <li>Your face must be <strong>clearly visible</strong> to the webcam at all times.</li>
          <li><strong>No other person</strong> should be visible in the camera frame.</li>
        </ul>
      </div>

      <p style="color: #334155; font-size: 14px; line-height: 1.7; text-align: center; margin-top: 20px;">
        🍀 <strong>All the best for your examination!</strong>
      </p>
    `)
  }),

  // 7. Result Published
  resultPublished: (name, score, total) => ({
    subject: `📊 CET Exam Result Published – Check Your Score`,
    html: wrapEmail(`
      <h2 style="margin: 0 0 4px; color: #7c3aed; font-size: 20px;">📊 Exam Result Published</h2>
      <p style="margin: 0 0 16px; color: #64748b; font-size: 13px;">Your CET Examination result is now available.</p>

      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        Dear <strong style="color: #0f172a;">${name}</strong>,
      </p>
      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        The results for the CET Examination have been published. Your performance summary is provided below:
      </p>

      <div style="background: linear-gradient(135deg, #ede9fe, #f5f3ff); border: 2px solid #c4b5fd; border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 6px; color: #6d28d9; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Score</p>
        <p style="margin: 0; color: #4c1d95; font-size: 36px; font-weight: 800;">${score} <span style="font-size: 18px; color: #7c3aed; font-weight: 400;">/ ${total}</span></p>
      </div>

      ${detailsBox([
        ['📊 Score', `${score} out of ${total}`],
        ['📋 Status', statusBadge('PUBLISHED', '#ede9fe', '#5b21b6')]
      ])}

      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        Login to your CET Student Dashboard for the detailed performance report, including question-wise analysis.
      </p>

      <div style="text-align: center; margin-top: 20px;">
        <p style="color: #64748b; font-size: 12px;">If you have any concerns regarding your result, please contact the CET Examination Cell.</p>
      </div>
    `)
  })
};

export default { sendEmail, sendConfirmationEmail, EmailTemplates };
