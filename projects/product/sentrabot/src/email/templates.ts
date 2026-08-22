export function renderVerificationEmail(input: {
  appName: string;
  verificationUrl: string;
}) {
  return {
    subject: `Verify your ${input.appName} account`,
    text: `Verify your account by opening: ${input.verificationUrl}`,
  };
}

export function renderPasswordResetEmail(input: {
  appName: string;
  resetUrl: string;
}) {
  return {
    subject: `Reset your ${input.appName} password`,
    text: `Reset your password by opening: ${input.resetUrl}`,
  };
}
