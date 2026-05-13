import type { SMTPClient, EmailAttachment } from './client';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface PaymentNotificationData {
  clientEmail: string;
  paymentLink: string;
  amount: number;
  dueDate: Date;
  clientName?: string;
  invoiceNumber?: string;
}

export interface PaymentConfirmationData {
  clientEmail: string;
  receiptPdfBuffer: Buffer;
  amount: number;
  clientName?: string;
  paymentDate?: Date;
  invoiceNumber?: string;
}

export interface PaymentReminderData {
  clientEmail: string;
  paymentLink: string;
  amount: number;
  dueDate: Date;
  clientName?: string;
  invoiceNumber?: string;
  daysUntilDue?: number;
}

export class EmailTemplates {
  constructor(private smtpClient: SMTPClient) {}

  async sendPaymentNotification(data: PaymentNotificationData): Promise<void> {
    const {
      clientEmail,
      paymentLink,
      amount,
      dueDate,
      clientName = 'Client',
      invoiceNumber = 'N/A',
    } = data;

    const formattedAmount = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);

    const formattedDueDate = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'long',
    }).format(dueDate);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .info { background-color: white; padding: 15px; border-left: 4px solid #4F46E5; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nouveau paiement à régler</h1>
    </div>
    <div class="content">
      <p>Bonjour ${escapeHtml(clientName)},</p>

      <p>Vous avez un nouveau paiement à régler.</p>

      <div class="info">
        <p><strong>Facture :</strong> ${escapeHtml(invoiceNumber)}</p>
        <p><strong>Montant :</strong> ${escapeHtml(formattedAmount)}</p>
        <p><strong>Date d'échéance :</strong> ${escapeHtml(formattedDueDate)}</p>
      </div>

      <p>Pour régler ce paiement, veuillez cliquer sur le bouton ci-dessous :</p>

      <div style="text-align: center;">
        <a href="${escapeHtml(paymentLink)}" class="button">Régler maintenant</a>
      </div>

      <p>Merci de votre confiance.</p>

      <div class="footer">
        <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    await this.smtpClient.sendEmail({
      to: clientEmail,
      subject: `Nouveau paiement à régler - ${formattedAmount}`,
      html,
    });
  }

  async sendPaymentConfirmation(
    data: PaymentConfirmationData
  ): Promise<void> {
    const {
      clientEmail,
      receiptPdfBuffer,
      amount,
      clientName = 'Client',
      paymentDate = new Date(),
      invoiceNumber = 'N/A',
    } = data;

    const formattedAmount = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);

    const formattedPaymentDate = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(paymentDate);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .success { background-color: #D1FAE5; color: #065F46; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center; }
    .info { background-color: white; padding: 15px; border-left: 4px solid #10B981; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Paiement confirmé</h1>
    </div>
    <div class="content">
      <p>Bonjour ${escapeHtml(clientName)},</p>

      <div class="success">
        <h2 style="margin: 0;">Votre paiement a été reçu avec succès</h2>
      </div>

      <p>Nous vous confirmons la réception de votre paiement.</p>

      <div class="info">
        <p><strong>Facture :</strong> ${escapeHtml(invoiceNumber)}</p>
        <p><strong>Montant payé :</strong> ${escapeHtml(formattedAmount)}</p>
        <p><strong>Date de paiement :</strong> ${escapeHtml(formattedPaymentDate)}</p>
      </div>

      <p>Vous trouverez votre reçu en pièce jointe de cet email.</p>

      <p>Merci de votre confiance.</p>

      <div class="footer">
        <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    const attachments: EmailAttachment[] = [
      {
        filename: `recu-${invoiceNumber || 'paiement'}.pdf`,
        content: receiptPdfBuffer,
        contentType: 'application/pdf',
      },
    ];

    await this.smtpClient.sendEmail({
      to: clientEmail,
      subject: `Confirmation de paiement - ${formattedAmount}`,
      html,
      attachments,
    });
  }

  async sendPaymentReminder(data: PaymentReminderData): Promise<void> {
    const {
      clientEmail,
      paymentLink,
      amount,
      dueDate,
      clientName = 'Client',
      invoiceNumber = 'N/A',
      daysUntilDue,
    } = data;

    const formattedAmount = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);

    const formattedDueDate = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'long',
    }).format(dueDate);

    const urgencyLevel =
      daysUntilDue !== undefined && daysUntilDue <= 3 ? 'urgent' : 'normal';
    const urgencyColor = urgencyLevel === 'urgent' ? '#EF4444' : '#F59E0B';
    const urgencyText =
      urgencyLevel === 'urgent'
        ? 'URGENT : Échéance imminente'
        : 'Rappel de paiement';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: ${urgencyColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .warning { background-color: #FEF3C7; color: #92400E; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid ${urgencyColor}; }
    .button { display: inline-block; background-color: ${urgencyColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .info { background-color: white; padding: 15px; border-left: 4px solid ${urgencyColor}; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(urgencyText)}</h1>
    </div>
    <div class="content">
      <p>Bonjour ${escapeHtml(clientName)},</p>

      <div class="warning">
        <p><strong>⚠️ Ce paiement arrive à échéance ${
          daysUntilDue !== undefined
            ? daysUntilDue === 0
              ? "aujourd'hui"
              : daysUntilDue === 1
                ? 'demain'
                : `dans ${daysUntilDue} jours`
            : 'bientôt'
        }.</strong></p>
      </div>

      <p>Nous vous rappelons qu'un paiement est en attente de règlement.</p>

      <div class="info">
        <p><strong>Facture :</strong> ${escapeHtml(invoiceNumber)}</p>
        <p><strong>Montant :</strong> ${escapeHtml(formattedAmount)}</p>
        <p><strong>Date d'échéance :</strong> ${escapeHtml(formattedDueDate)}</p>
      </div>

      <p>Pour éviter tout retard, veuillez régler ce paiement dès que possible :</p>

      <div style="text-align: center;">
        <a href="${escapeHtml(paymentLink)}" class="button">Régler maintenant</a>
      </div>

      <p>Si vous avez déjà effectué ce paiement, veuillez ignorer ce message.</p>

      <div class="footer">
        <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    await this.smtpClient.sendEmail({
      to: clientEmail,
      subject:
        urgencyLevel === 'urgent'
          ? `URGENT : Paiement à régler - ${formattedAmount}`
          : `Rappel : Paiement à régler - ${formattedAmount}`,
      html,
    });
  }
}
