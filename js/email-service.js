// ============================================
// CET EXAM PORTAL - EMAIL NOTIFICATION SERVICE
// Calls the secure backend /api/send-email
// Professional HTML Email Templates with
// Official College Branding
// ============================================

export async function sendEmail(to, subject, html, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Email Service] Sending email to: ${to} (Attempt ${attempt}/${maxRetries})`);
      const payloadSize = html ? html.length : 0;
      
      const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3000/api/send-email' 
        : '/api/send-email';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, html }),
      });

      const status = response.status;

      if (!response.ok) {
        const errBody = await response.text();
        let errData = {};
        try { errData = JSON.parse(errBody); } catch(e) {}
        throw new Error(`API failed (${status}): ${errData.details || errData.error || 'Unknown'}`);
      }

      const data = await response.json();
      let isSuccess = data && (data.success === true || data.messageId);

      if (isSuccess) {
        console.log("[Email Service] Email sent successfully on attempt " + attempt);
        return true;
      } else {
        throw new Error("Success returned without delivery verification from API.");
      }
    } catch (error) {
      console.error(`[Email Service] Exception on attempt ${attempt}:`, error.message);
      if (attempt === maxRetries) {
        console.error(`[Email Service] All ${maxRetries} attempts failed. Giving up.`);
        return false; // Fail silently so app flow doesn't break
      }
      // Wait before retrying (exponential backoff)
      const waitTime = attempt * 1500;
      console.log(`[Email Service] Waiting ${waitTime}ms before retry...`);
      await new Promise(res => setTimeout(res, waitTime));
    }
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
    const success = await sendEmail(data.email, tmpl.subject, tmpl.html);
    if (!success) {
      console.error(`[Email Service] Failed to send confirmation email to ${data.email}`);
    }
  } catch (error) {
    console.error(`[Email Service] Error in sendConfirmationEmail:`, error);
  }
}

// ── Shared Layout Helpers ──────────────────────────────────

function emailHeader() {
  return `
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #1e40af 100%); padding: 24px 20px; text-align: center; border-radius: 12px 12px 0 0;">
      <div style="font-size: 28px; margin-bottom: 8px;">🎓</div>
      <p style="margin: 0 0 4px 0; color: #cbd5e1; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">AHMEDNAGAR JILHA MARATHA VIDYA PRASARAK SAMAJ'S</p>
      <h1 style="margin: 0 0 2px 0; color: #ffffff; font-size: 18px; font-weight: 700;">New Arts, Commerce and Science College,</h1>
      <p style="margin: 0 0 8px 0; color: #e2e8f0; font-size: 14px; font-weight: 500;">Ahmednagar (Autonomous)</p>
      <p style="margin: 0 0 4px 0; color: #93c5fd; font-size: 13px; font-weight: 600;">Center for Advanced Studies in Applied Sciences (CASAS)</p>
      <p style="margin: 0; color: #bfdbfe; font-size: 15px; font-weight: 700; letter-spacing: 0.5px;">Department of Computer Science</p>
      <div style="width: 80px; height: 3px; background: #60a5fa; margin: 16px auto 0; border-radius: 2px;"></div>
    </div>`;
}

function emailFooter() {
  return `
    <div style="background: #f8fafc; padding: 24px 20px; text-align: center; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
      <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px;">Warm Regards,</p>
      <p style="margin: 0; color: #1e3a5f; font-size: 14px; font-weight: 700;">Admission Cell / CET Examination Cell</p>
      <p style="margin: 4px 0 2px 0; color: #475569; font-size: 12px; font-weight: 600;">Department of Computer Science (CASAS)</p>
      <p style="margin: 2px 0; color: #64748b; font-size: 11px;">New Arts, Commerce and Science College, Ahmednagar (Autonomous)</p>
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
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
  approval: (name, cetId, examDate, startTime, course) => ({
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
        ['🆔 Application ID', `<span style="color: #2563eb; font-size: 16px; letter-spacing: 1px;">${cetId}</span>`],
        ['📚 Course', course || 'N/A'],
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

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <h2 style="margin: 0 0 16px; color: #dc2626; font-size: 18px; text-align: center;">📢 महत्त्वाची प्रवेश सूचना: एम.एस्सी. प्रवेश परीक्षा २०२६ 📢</h2>
        <p style="color: #334155; font-size: 13px; line-height: 1.7;">
          न्यू आर्ट्स, कॉमर्स अँड सायन्स कॉलेज, अहमदनगर येथील कॅसस (Center For Advanced Studies in Applied Sciences) विभागातील M.Sc. Computer Science आणि M.Sc. Computer Applications या अभ्यासक्रमांसाठी अर्ज केलेल्या सर्व विद्यार्थ्यांसाठी प्रवेश प्रक्रियेचे नियम आणि सविस्तर वेळापत्रक खालीलप्रमाणे आहे:
        </p>
        <p style="margin: 0 0 12px; color: #1e293b; font-size: 13px; line-height: 1.7;">
          <strong style="color: #b91c1c;">१. प्रवेशाचा मुख्य निकष:</strong> M.Sc. चे सर्व प्रवेश हे फक्त आणि फक्त प्रवेश परीक्षेमध्ये मिळालेल्या गुणांच्या आधारावरच गुणवत्ता यादी (Merit List) तयार केली जाईल.
        </p>
        <p style="margin: 0 0 12px; color: #1e293b; font-size: 13px; line-height: 1.7;">
          <strong style="color: #b91c1c;">२. परीक्षेचा दिनांक आणि वेळ:</strong> प्रवेश परीक्षा गुरुवार दिनांक २५ जून २०२६ रोजी सकाळी ०९:३० ते ११:०० या वेळेत होईल.
        </p>
        <p style="margin: 0 0 12px; color: #1e293b; font-size: 13px; line-height: 1.7;">
          <strong style="color: #b91c1c;">३. रिपोर्टिंग वेळ आणि ठिकाण:</strong> सर्व विद्यार्थ्यांनी गुरुवार दिनांक २५ जून रोजी सकाळी ठीक ०९:०० वाजता कॅसस (CASAS) विभाग, प्रशासकीय इमारतीमधील पहिल्या मजल्यावर ऑफलाइन परीक्षेसाठी समक्ष उपस्थित राहणे अनिवार्य आहे.
        </p>
        <p style="margin: 0 0 12px; color: #1e293b; font-size: 13px; line-height: 1.7;">
          <strong style="color: #b91c1c;">४. प्रवेश परीक्षेचे स्वरूप व उत्तरपत्रिका:</strong> सदर परीक्षा पूर्णपणे ऑफलाइन पद्धतीने होणार असून एकूण १०० गुणांची असेल. परीक्षेमध्ये एकूण ७५ प्रश्न विचारले जातील, ज्यामध्ये ५० प्रश्न प्रत्येकी १ गुणाचे आणि २५ प्रश्न प्रत्येकी २ गुणांचे असतील. विद्यार्थ्यांना सर्व प्रश्न उत्तरपत्रिकेवर (Answer Sheet) सोडवायचे आहेत, याची विद्यार्थ्यांनी नोंद घ्यावी.
        </p>
        <p style="margin: 0 0 12px; color: #1e293b; font-size: 13px; line-height: 1.7;">
          <strong style="color: #b91c1c;">५. उपस्थितीची अनिवार्यता:</strong> या प्रवेश परीक्षेसाठी उपस्थित राहून परीक्षा देणाऱ्या विद्यार्थ्यांचाच प्रवेशासाठी विचार केला जाईल. प्रवेश परीक्षेस गैरहजर राहिल्यास विद्यार्थ्याचा प्रवेशावरील दावा पूर्णपणे संपुष्टात येईल, याची गंभीर नोंद घ्यावी.
        </p>
        <p style="margin: 0 0 12px; color: #1e293b; font-size: 13px; line-height: 1.7;">
          <strong style="color: #b91c1c;">६. गुणवत्ता यादी व कौन्सिलिंग:</strong> प्रवेश परीक्षा संपल्यानंतर लगेचच विद्यार्थ्यांची प्रवेश परीक्षा गुणांनुसार गुणवत्ता यादी तयार केली जाईल. त्यानंतर याच गुणवत्ता यादीनुसार त्याच दिवशी दुपारी ठीक ०१:०० वाजता कौन्सिलिंग राऊंडद्वारे विद्यार्थ्यांचे प्रवेश केले जातील.
        </p>
        <p style="margin: 0 0 12px; color: #1e293b; font-size: 13px; line-height: 1.7;">
          <strong style="color: #b91c1c;">७. तात्पुरते प्रवेश शुल्क:</strong> गुणवत्तेनुसार प्रवेश मिळालेल्या विद्यार्थ्यांनी जागेवरच प्रोव्हिजनल ॲडमिशन शुल्क रुपये १०००/- भरणे अनिवार्य आहे.
        </p>
        <p style="margin: 0 0 12px; color: #1e293b; font-size: 13px; line-height: 1.7;">
          <strong style="color: #b91c1c;">८. जातीचा दाखला (राखीव प्रवर्ग):</strong> कौन्सिलिंग राऊंडसाठी येताना ज्या विद्यार्थ्यांनी राखीव जागांसाठी दावा केला आहे, त्यांनी सक्षम प्राधिकृत अधिकाऱ्याने दिलेला आपला राखीव प्रवर्गातील मूळ जातीचा दाखला सोबत आणणे बंधनकारक आहे.
        </p>
        <p style="margin: 0; color: #1e293b; font-size: 13px; line-height: 1.7;">
          <strong style="color: #b91c1c;">९. अंतिम प्रवेश निश्चिती:</strong> कौन्सिलिंग राऊंडद्वारे दिलेले प्रवेश हे पूर्णपणे तात्पुरत्या स्वरूपाचे असतील. विद्यार्थ्यांनी आपल्या पदवी अभ्यासक्रम उत्तीर्ण केल्याचे ओरिजिनल गुणपत्रक आणि महाविद्यालयातून प्राप्त झालेले ओरिजिनल ट्रान्सफर सर्टिफिकेट सादर केल्यानंतरच आपला महाविद्यालयातील पदव्युत्तर वर्गाचा प्रवेश निश्चित केला जाईल.
        </p>
        <div style="margin-top: 20px; text-align: right;">
          <p style="margin: 0 0 4px; color: #1e293b; font-size: 14px; font-weight: bold;">प्रा. अरुण गांगर्डे</p>
          <p style="margin: 0; color: #475569; font-size: 12px;">प्रमुख, CASAS</p>
        </div>
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      
      <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981;">
        <h3 style="margin: 0 0 8px; font-size: 14px; color: #047857;">🎉 WhatsApp Community</h3>
        <p style="color: #065f46; font-size: 13px; line-height: 1.6; margin: 0 0 12px 0;">
          For all future updates, announcements, merit lists, document verification schedules, admission notices, and important information, please join our official WhatsApp group:
        </p>
        <a href="https://chat.whatsapp.com/HgoOmUNbRRL5iohnuwNgpJ?s=cl&p=i&ilr=4" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-weight: bold; font-size: 13px;">Join WhatsApp Group</a>
        <p style="color: #065f46; font-size: 12px; margin: 12px 0 0 0;">
          Please join the group to stay updated with all admission-related notifications.<br><br>Thank you.
        </p>
      </div>
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
  scheduleUpdate: (name, examDate, startTime, duration, course, loginId, portalUrl, examUrl, studentEmail) => ({
    subject: `📅 CET Examination Schedule Announced – ${course}`,
    html: wrapEmail(`
      <h2 style="margin: 0 0 4px; color: #2563eb; font-size: 20px;">📅 Exam Schedule Announced</h2>
      <p style="margin: 0 0 16px; color: #64748b; font-size: 13px;">Your CET Exam time and date have been finalized.</p>

      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        Dear <strong style="color: #0f172a;">${name}</strong>,
      </p>
      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        Congratulations! Your application has been approved for the admission process. The examination details are provided below:
      </p>

      ${detailsBox([
        ['📚 Course', course || 'N/A'],
        ['📅 Exam Date', `<strong style="color: #dc2626; font-size: 15px;">${examDate}</strong>`],
        ['🕐 Start Time', `<strong style="color: #dc2626; font-size: 15px;">${startTime}</strong>`],
        ['⏳ Duration', `${duration} Minutes`]
      ])}

      <div style="background: linear-gradient(135deg, #eff6ff, #f0f9ff); border: 2px solid #3b82f6; border-radius: 10px; padding: 20px; margin: 24px 0;">
        <h3 style="margin: 0 0 14px; color: #1e40af; font-size: 16px; text-align: center;">🔐 Your Login Info</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 12px; color: #475569; font-size: 13px; font-weight: 600; border-bottom: 1px solid #bfdbfe; width: 40%;">🆔 CET ID / Username</td>
            <td style="padding: 8px 12px; color: #1e40af; font-size: 15px; font-weight: 800; border-bottom: 1px solid #bfdbfe;">${loginId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #475569; font-size: 13px; font-weight: 600; border-bottom: 1px solid #bfdbfe;">📧 Login Email</td>
            <td style="padding: 8px 12px; color: #0f172a; font-size: 14px; font-weight: 700; border-bottom: 1px solid #bfdbfe;">${studentEmail || 'student@email.com'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #475569; font-size: 13px; font-weight: 600;">🔑 Password</td>
            <td style="padding: 8px 12px; color: #dc2626; font-size: 14px; font-weight: 800;">Your Registered Mobile Number</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${examUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 32px; border-radius: 8px; letter-spacing: 0.5px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);">🔗 Go to Examination Portal</a>
        <p style="margin: 8px 0 0; color: #94a3b8; font-size: 11px;">${examUrl}</p>
      </div>

      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        Please login using your registered credentials and appear for the examination at least 10 minutes before the scheduled time.
      </p>
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
  }),

  // 8. Official Entrance Notification (Marathi)
  entranceNotification: (name) => ({
    subject: `📢 महत्त्वाची प्रवेश सूचना: एम.एस्सी. प्रवेश परीक्षा २०२६`,
    html: wrapEmail(`
      <h2 style="margin: 0 0 16px; color: #dc2626; font-size: 20px; text-align: center;">📢 महत्त्वाची प्रवेश सूचना: एम.एस्सी. प्रवेश परीक्षा २०२६ 📢</h2>
      
      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        प्रिय <strong style="color: #0f172a;">${name}</strong>,
      </p>
      
      <p style="color: #334155; font-size: 14px; line-height: 1.7;">
        न्यू आर्ट्स, कॉमर्स अँड सायन्स कॉलेज, अहमदनगर येथील कॅसस (Center For Advanced Studies in Applied Sciences) विभागातील M.Sc. Computer Science आणि M.Sc. Computer Applications या अभ्यासक्रमांसाठी अर्ज केलेल्या सर्व विद्यार्थ्यांसाठी प्रवेश प्रक्रियेचे नियम आणि सविस्तर वेळापत्रक खालीलप्रमाणे आहे:
      </p>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 12px; color: #1e293b; font-size: 14px; line-height: 1.7;">
          <strong style="color: #b91c1c;">१. प्रवेशाचा मुख्य निकष:</strong> M.Sc. चे सर्व प्रवेश हे फक्त आणि फक्त प्रवेश परीक्षेमध्ये मिळालेल्या गुणांच्या आधारावरच गुणवत्ता यादी (Merit List) तयार केली जाईल.
        </p>
        <p style="margin: 0 0 12px; color: #1e293b; font-size: 14px; line-height: 1.7;">
          <strong style="color: #b91c1c;">२. परीक्षेचा दिनांक आणि वेळ:</strong> प्रवेश परीक्षा गुरुवार दिनांक २५ जून २०२६ रोजी सकाळी ०९:३० ते ११:०० या वेळेत होईल.
        </p>
        <p style="margin: 0 0 12px; color: #1e293b; font-size: 14px; line-height: 1.7;">
          <strong style="color: #b91c1c;">३. रिपोर्टिंग वेळ आणि ठिकाण:</strong> सर्व विद्यार्थ्यांनी गुरुवार दिनांक २५ जून रोजी सकाळी ठीक ०९:०० वाजता कॅसस (CASAS) विभाग, प्रशासकीय इमारतीमधील पहिल्या मजल्यावर ऑफलाइन परीक्षेसाठी समक्ष उपस्थित राहणे अनिवार्य आहे.
        </p>
        <p style="margin: 0 0 12px; color: #1e293b; font-size: 14px; line-height: 1.7;">
          <strong style="color: #b91c1c;">४. प्रवेश परीक्षेचे स्वरूप व उत्तरपत्रिका:</strong> सदर परीक्षा पूर्णपणे ऑफलाइन पद्धतीने होणार असून एकूण १०० गुणांची असेल. परीक्षेमध्ये एकूण ७५ प्रश्न विचारले जातील, ज्यामध्ये ५० प्रश्न प्रत्येकी १ गुणाचे आणि २५ प्रश्न प्रत्येकी २ गुणांचे असतील. विद्यार्थ्यांना सर्व प्रश्न उत्तरपत्रिकेवर (Answer Sheet) सोडवायचे आहेत, याची विद्यार्थ्यांनी नोंद घ्यावी.
        </p>
        <p style="margin: 0 0 12px; color: #1e293b; font-size: 14px; line-height: 1.7;">
          <strong style="color: #b91c1c;">५. उपस्थितीची अनिवार्यता:</strong> या प्रवेश परीक्षेसाठी उपस्थित राहून परीक्षा देणाऱ्या विद्यार्थ्यांचाच प्रवेशासाठी विचार केला जाईल. प्रवेश परीक्षेस गैरहजर राहिल्यास विद्यार्थ्याचा प्रवेशावरील दावा पूर्णपणे संपुष्टात येईल, याची गंभीर नोंद घ्यावी.
        </p>
        <p style="margin: 0 0 12px; color: #1e293b; font-size: 14px; line-height: 1.7;">
          <strong style="color: #b91c1c;">६. गुणवत्ता यादी व कौन्सिलिंग:</strong> प्रवेश परीक्षा संपल्यानंतर लगेचच विद्यार्थ्यांची प्रवेश परीक्षा गुणांनुसार गुणवत्ता यादी तयार केली जाईल. त्यानंतर याच गुणवत्ता यादीनुसार त्याच दिवशी दुपारी ठीक ०१:०० वाजता कौन्सिलिंग राऊंडद्वारे विद्यार्थ्यांचे प्रवेश केले जातील.
        </p>
        <p style="margin: 0 0 12px; color: #1e293b; font-size: 14px; line-height: 1.7;">
          <strong style="color: #b91c1c;">७. तात्पुरते प्रवेश शुल्क:</strong> गुणवत्तेनुसार प्रवेश मिळालेल्या विद्यार्थ्यांनी जागेवरच प्रोव्हिजनल ॲडमिशन शुल्क रुपये १०००/- भरणे अनिवार्य आहे.
        </p>
        <p style="margin: 0 0 12px; color: #1e293b; font-size: 14px; line-height: 1.7;">
          <strong style="color: #b91c1c;">८. जातीचा दाखला (राखीव प्रवर्ग):</strong> कौन्सिलिंग राऊंडसाठी येताना ज्या विद्यार्थ्यांनी राखीव जागांसाठी दावा केला आहे, त्यांनी सक्षम प्राधिकृत अधिकाऱ्याने दिलेला आपला राखीव प्रवर्गातील मूळ जातीचा दाखला सोबत आणणे बंधनकारक आहे.
        </p>
        <p style="margin: 0; color: #1e293b; font-size: 14px; line-height: 1.7;">
          <strong style="color: #b91c1c;">९. अंतिम प्रवेश निश्चिती:</strong> कौन्सिलिंग राऊंडद्वारे दिलेले प्रवेश हे पूर्णपणे तात्पुरत्या स्वरूपाचे असतील. विद्यार्थ्यांनी आपल्या पदवी अभ्यासक्रम उत्तीर्ण केल्याचे ओरिजिनल गुणपत्रक आणि महाविद्यालयातून प्राप्त झालेले ओरिजिनल ट्रान्सफर सर्टिफिकेट सादर केल्यानंतरच आपला महाविद्यालयातील पदव्युत्तर वर्गाचा प्रवेश निश्चित केला जाईल.
        </p>
      </div>

      <div style="margin-top: 30px; text-align: right;">
        <p style="margin: 0 0 4px; color: #1e293b; font-size: 15px; font-weight: bold;">प्रा. अरुण गांगर्डे</p>
        <p style="margin: 0; color: #475569; font-size: 13px;">प्रमुख, CASAS</p>
        <p style="margin: 0; color: #475569; font-size: 12px;">(Center For Advanced Studies in Applied Sciences)</p>
      </div>
    `)
  })
};

export default { sendEmail, sendConfirmationEmail, EmailTemplates };
