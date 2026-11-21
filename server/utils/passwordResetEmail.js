const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export function isEmailConfigured() {
  return Boolean(
    process.env.BREVO_API_KEY &&
    process.env.SMTP_FROM &&
    process.env.FRONTEND_URL,
  );
}

export async function sendPasswordResetEmail(email, resetToken) {
  console.log("Starting password reset email delivery");

  const frontendUrl = process.env.FRONTEND_URL.replace(/\/$/, "");
  const resetUrl = `${frontendUrl}/?resetToken=${encodeURIComponent(resetToken)}`;

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: {
        name: "InterviewPrep",
        email: "interviewprephelp20@gmail.com",
      },
      to: [{ email }],
      subject: "Reset your InterviewPrep password",
      textContent: `Use this link to reset your password (expires in 15 minutes): ${resetUrl}`,
      htmlContent: `
        <h2>Reset your InterviewPrep password</h2>
        <p>Click below to choose a new password. This link expires in 15 minutes.</p>
        <p><a href="${resetUrl}">Reset my password</a></p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
    }),
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    console.error("Brevo email API error:", response.status, errorDetails);
    throw new Error(`Brevo email API failed: ${response.status}`);
  }

  console.log("Password reset email accepted by Brevo");
}
