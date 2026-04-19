export const defaultAdminIntegrations = {
  contactRecipientEmail: 'jonderecknifas@gmail.com',
  contactSenderName: 'Portfolio',
  contactSenderEmail: 'onboarding@resend.dev',
  cloudinaryFolder: 'portfolio',
  googleDriveImportEnabled: true,
  unclothyEnabled: false,
  defaultGalleryView: 'cinematic',
};

export const defaultAdminSecurity = {
  sessionTtlHours: 8,
  loginRateLimitMax: 10,
  loginRateLimitWindowSeconds: 60,
  mutationRateLimitMax: 120,
  mutationRateLimitWindowSeconds: 60,
  contactRateLimitMax: 8,
  contactRateLimitWindowSeconds: 60,
  sessionVersion: 1,
};

export const defaultAdminSettings = {
  integrations: defaultAdminIntegrations,
  security: defaultAdminSecurity,
};
