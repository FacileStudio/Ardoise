# @repo/smtp

SMTP email service package for sending transactional emails.

## Features

- Send emails via SMTP using nodemailer
- Pre-built email templates for payment workflows
- Support for attachments (PDF receipts)
- Type-safe configuration
- HTML email templates with responsive design

## Installation

This package is part of the monorepo workspace. Install dependencies from the root:

```bash
bun install
```

## Configuration

Add these environment variables to your backend `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

These variables are validated in `@repo/env` via `serverEnvSchema`.

## Usage

### Initialize the SMTP client

```typescript
import { SMTPClient, EmailTemplates } from '@repo/smtp';

const smtpClient = new SMTPClient({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM,
});

const emailTemplates = new EmailTemplates(smtpClient);
```

### Send custom email

```typescript
await smtpClient.sendEmail({
  to: 'client@example.com',
  subject: 'Your subject',
  html: '<h1>Hello</h1><p>Email content</p>',
  attachments: [
    {
      filename: 'document.pdf',
      content: pdfBuffer,
      contentType: 'application/pdf',
    },
  ],
});
```

### Send payment notification

```typescript
await emailTemplates.sendPaymentNotification({
  clientEmail: 'client@example.com',
  paymentLink: 'https://pay.example.com/invoice/123',
  amount: 150.00,
  dueDate: new Date('2026-03-01'),
  clientName: 'John Doe',
  invoiceNumber: 'INV-2026-001',
});
```

### Send payment confirmation with PDF receipt

```typescript
import { readFileSync } from 'fs';

const receiptPdf = readFileSync('./receipt.pdf');

await emailTemplates.sendPaymentConfirmation({
  clientEmail: 'client@example.com',
  receiptPdfBuffer: receiptPdf,
  amount: 150.00,
  clientName: 'John Doe',
  paymentDate: new Date(),
  invoiceNumber: 'INV-2026-001',
});
```

### Send payment reminder

```typescript
await emailTemplates.sendPaymentReminder({
  clientEmail: 'client@example.com',
  paymentLink: 'https://pay.example.com/invoice/123',
  amount: 150.00,
  dueDate: new Date('2026-03-01'),
  clientName: 'John Doe',
  invoiceNumber: 'INV-2026-001',
  daysUntilDue: 3,
});
```

## Email Templates

### Payment Notification
Sent when a new payment is created. Includes:
- Invoice details
- Amount due
- Due date
- Payment link button

### Payment Confirmation
Sent after successful payment. Includes:
- Payment confirmation
- Amount paid
- Payment date
- PDF receipt attachment

### Payment Reminder
Sent before payment due date. Includes:
- Warning badge (urgent if <= 3 days)
- Invoice details
- Days until due
- Payment link button

## API Reference

### SMTPClient

#### Constructor

```typescript
new SMTPClient(config: SMTPConfig)
```

#### Methods

- `sendEmail(options: SendEmailOptions): Promise<void>` - Send an email
- `verifyConnection(): Promise<boolean>` - Verify SMTP connection

### EmailTemplates

#### Constructor

```typescript
new EmailTemplates(smtpClient: SMTPClient)
```

#### Methods

- `sendPaymentNotification(data: PaymentNotificationData): Promise<void>`
- `sendPaymentConfirmation(data: PaymentConfirmationData): Promise<void>`
- `sendPaymentReminder(data: PaymentReminderData): Promise<void>`

## Type Definitions

See `src/client.ts` and `src/templates.ts` for complete type definitions.

## Testing SMTP Configuration

```typescript
const isConnected = await smtpClient.verifyConnection();
if (!isConnected) {
  console.error('SMTP connection failed');
}
```

## Gmail Setup

For Gmail SMTP:
1. Enable 2-factor authentication
2. Generate an App Password (Google Account > Security > App Passwords)
3. Use the app password as `SMTP_PASS`
4. Set `SMTP_HOST=smtp.gmail.com` and `SMTP_PORT=587`

## License

Private monorepo package
