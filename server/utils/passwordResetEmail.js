import nodemailer from "nodemailer";

const requiredEmailSettings = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "FRONTEND_URL",
];

export function isEmailConfigured() {
  return requiredEmailSettings.every((setting) =>
    Boolean(process.env[setting]),
  );
}

export async function sendPasswordResetEmail(email, resetToken) {
  // Check if the email function is running
  console.log("Starting password reset email delivery");

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const frontendUrl = process.env.FRONTEND_URL.replace(/\/$/, "");
  const resetUrl = `${frontendUrl}/?resetToken=${encodeURIComponent(resetToken)}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Reset your InterviewPrep password",
    text: `Use this link to reset your InterviewPrep password. It expires in 15 minutes: ${resetUrl}`,
    html: `
      <h2>Reset your InterviewPrep password</h2>
      <p>Use the link below to choose a new password. This link expires in 15 minutes.</p>
      <p><a href="${resetUrl}">Reset my password</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
}
