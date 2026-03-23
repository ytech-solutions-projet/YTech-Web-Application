const nodemailer = require('nodemailer');
const {
  isValidEmail,
  normalizeEmail,
  normalizeText,
  parseBoolean,
  parseInteger
} = require('./security');

let transporter = null;

const getSenderIdentity = () => {
  const address = normalizeEmail(
    process.env.EMAIL_FROM_ADDRESS || process.env.ADMIN_EMAIL || 'contact@ytech.ma'
  );
  const name = normalizeText(process.env.EMAIL_FROM_NAME, { maxLength: 120 }) || 'YTECH';

  return { name, address };
};

const isEmailConfigured = () => {
  if (process.env.NODE_ENV === 'test') {
    return false;
  }

  return Boolean(
    normalizeText(process.env.EMAIL_HOST, { maxLength: 255 }) &&
      parseInteger(process.env.EMAIL_PORT, 0) > 0 &&
      normalizeText(process.env.EMAIL_USER, { maxLength: 255 }) &&
      normalizeText(process.env.EMAIL_PASS, { maxLength: 255 }) &&
      getSenderIdentity().address
  );
};

const createTransporter = () => {
  if (!isEmailConfigured()) {
    return null;
  }

  const secure = parseBoolean(process.env.EMAIL_SECURE, parseInteger(process.env.EMAIL_PORT, 587) === 465);

  return nodemailer.createTransport({
    host: normalizeText(process.env.EMAIL_HOST, { maxLength: 255 }),
    port: parseInteger(process.env.EMAIL_PORT, 587),
    secure,
    requireTLS: parseBoolean(process.env.EMAIL_REQUIRE_TLS, !secure),
    auth: {
      user: normalizeText(process.env.EMAIL_USER, { maxLength: 255 }),
      pass: normalizeText(process.env.EMAIL_PASS, { maxLength: 255 })
    }
  });
};

const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }

  return transporter;
};

const escapeHtml = (value = '') =>
  `${value}`
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildEmailVerificationTemplate = ({ name, verificationUrl, expiresInHours, supportEmail }) => {
  const safeName = escapeHtml(name || 'client');
  const safeVerificationUrl = escapeHtml(verificationUrl);
  const safeSupportEmail = escapeHtml(supportEmail);
  const safeDuration = escapeHtml(expiresInHours);

  return {
    subject: 'Verification de votre email YTECH',
    text: [
      `Bonjour ${name || 'client'},`,
      '',
      'Merci pour votre inscription sur YTECH.',
      `Cliquez sur ce lien pour verifier votre adresse email et activer votre connexion: ${verificationUrl}`,
      '',
      `Ce lien expire dans ${expiresInHours} heure${Number(expiresInHours) > 1 ? 's' : ''}.`,
      "Si vous n'etes pas a l'origine de cette inscription, ignorez simplement cet email.",
      '',
      `Support YTECH: ${supportEmail}`
    ].join('\n'),
    html: `
      <div style="margin:0;padding:32px;background:#f5efe4;font-family:Segoe UI,Arial,sans-serif;color:#14233b;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:28px;overflow:hidden;border:1px solid rgba(20,35,59,0.08);">
          <div style="padding:28px 32px;background:linear-gradient(135deg,#12304d 0%,#12797b 100%);color:#ffffff;">
            <div style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;opacity:0.78;">Activation compte YTECH</div>
            <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;">Verifiez votre adresse email</h1>
          </div>
          <div style="padding:32px;">
            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Bonjour ${safeName},</p>
            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
              Votre compte YTECH a bien ete cree. Pour autoriser la connexion, nous devons verifier que cette adresse email vous appartient.
            </p>
            <p style="margin:0 0 24px;font-size:16px;line-height:1.7;">
              Utilisez le bouton ci-dessous pour confirmer votre email.
            </p>
            <p style="margin:0 0 24px;">
              <a
                href="${safeVerificationUrl}"
                style="display:inline-block;padding:14px 22px;border-radius:999px;background:#ef8354;color:#ffffff;text-decoration:none;font-weight:700;"
              >
                Verifier mon email
              </a>
            </p>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#4b5b73;">
              Ce lien expire dans ${safeDuration} heure${Number(expiresInHours) > 1 ? 's' : ''}. Si vous n'etes pas a l'origine de cette inscription, ignorez simplement cet email.
            </p>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#4b5b73;">
              Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur:<br />
              <a href="${safeVerificationUrl}" style="color:#12797b;word-break:break-all;">${safeVerificationUrl}</a>
            </p>
          </div>
          <div style="padding:18px 32px;background:#f9f4ed;border-top:1px solid rgba(20,35,59,0.08);font-size:13px;color:#5d6b82;">
            Support YTECH: <a href="mailto:${safeSupportEmail}" style="color:#12797b;">${safeSupportEmail}</a>
          </div>
        </div>
      </div>
    `
  };
};

const buildPasswordResetTemplate = ({ name, resetUrl, expiresInMinutes, supportEmail }) => {
  const safeName = escapeHtml(name || 'client');
  const safeResetUrl = escapeHtml(resetUrl);
  const safeSupportEmail = escapeHtml(supportEmail);
  const safeDuration = escapeHtml(expiresInMinutes);

  return {
    subject: 'Reinitialisation de votre mot de passe YTECH',
    text: [
      `Bonjour ${name || 'client'},`,
      '',
      'Nous avons recu une demande de reinitialisation de mot de passe pour votre compte YTECH.',
      `Cliquez sur ce lien pour definir un nouveau mot de passe: ${resetUrl}`,
      '',
      `Ce lien expire dans ${expiresInMinutes} minutes.`,
      "Si vous n'etes pas a l'origine de cette demande, ignorez simplement cet email.",
      '',
      `Support YTECH: ${supportEmail}`
    ].join('\n'),
    html: `
      <div style="margin:0;padding:32px;background:#f5efe4;font-family:Segoe UI,Arial,sans-serif;color:#14233b;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:28px;overflow:hidden;border:1px solid rgba(20,35,59,0.08);">
          <div style="padding:28px 32px;background:linear-gradient(135deg,#12304d 0%,#12797b 100%);color:#ffffff;">
            <div style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;opacity:0.78;">Assistant securite YTECH</div>
            <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;">Reinitialisez votre mot de passe</h1>
          </div>
          <div style="padding:32px;">
            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Bonjour ${safeName},</p>
            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
              Une demande de reinitialisation a ete recue pour votre compte YTECH.
            </p>
            <p style="margin:0 0 24px;font-size:16px;line-height:1.7;">
              Pour choisir un nouveau mot de passe, utilisez le bouton ci-dessous.
            </p>
            <p style="margin:0 0 24px;">
              <a
                href="${safeResetUrl}"
                style="display:inline-block;padding:14px 22px;border-radius:999px;background:#ef8354;color:#ffffff;text-decoration:none;font-weight:700;"
              >
                Reinitialiser mon mot de passe
              </a>
            </p>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#4b5b73;">
              Ce lien expire dans ${safeDuration} minutes. Si vous n'etes pas a l'origine de cette demande, ignorez simplement cet email.
            </p>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#4b5b73;">
              Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur:<br />
              <a href="${safeResetUrl}" style="color:#12797b;word-break:break-all;">${safeResetUrl}</a>
            </p>
          </div>
          <div style="padding:18px 32px;background:#f9f4ed;border-top:1px solid rgba(20,35,59,0.08);font-size:13px;color:#5d6b82;">
            Support YTECH: <a href="mailto:${safeSupportEmail}" style="color:#12797b;">${safeSupportEmail}</a>
          </div>
        </div>
      </div>
    `
  };
};

const sendPasswordResetEmail = async ({ to, name, resetUrl, expiresInMinutes }) => {
  const recipient = normalizeEmail(to);
  if (!isValidEmail(recipient)) {
    throw new Error('Adresse email de destination invalide');
  }

  const mailer = getTransporter();
  if (!mailer) {
    return {
      delivered: false,
      skipped: true,
      reason: 'missing_email_configuration'
    };
  }

  const sender = getSenderIdentity();
  const template = buildPasswordResetTemplate({
    name,
    resetUrl,
    expiresInMinutes,
    supportEmail: sender.address
  });

  const info = await mailer.sendMail({
    from: sender,
    to: recipient,
    replyTo: sender.address,
    subject: template.subject,
    text: template.text,
    html: template.html
  });

  return {
    delivered: true,
    messageId: info.messageId || ''
  };
};

const sendEmailVerificationEmail = async ({ to, name, verificationUrl, expiresInHours }) => {
  const recipient = normalizeEmail(to);
  if (!isValidEmail(recipient)) {
    throw new Error('Adresse email de destination invalide');
  }

  const mailer = getTransporter();
  if (!mailer) {
    return {
      delivered: false,
      skipped: true,
      reason: 'missing_email_configuration'
    };
  }

  const sender = getSenderIdentity();
  const template = buildEmailVerificationTemplate({
    name,
    verificationUrl,
    expiresInHours,
    supportEmail: sender.address
  });

  const info = await mailer.sendMail({
    from: sender,
    to: recipient,
    replyTo: sender.address,
    subject: template.subject,
    text: template.text,
    html: template.html
  });

  return {
    delivered: true,
    messageId: info.messageId || ''
  };
};

module.exports = {
  isEmailConfigured,
  sendEmailVerificationEmail,
  sendPasswordResetEmail
};
