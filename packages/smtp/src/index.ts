export { SMTPClient, fromAddress, senderName } from './client';
export { EmailTemplates } from './templates';

export type {
  SMTPConfig,
  EmailAttachment,
  SendEmailOptions,
  EmailSender,
} from './client';

export type {
  PaymentNotificationData,
  PaymentConfirmationData,
  PaymentReminderData,
  MagicLinkData,
} from './templates';
