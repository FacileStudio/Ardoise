import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { logger } from '@repo/logger';

export interface SMTPConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export class SMTPClient {
  private transporter: Transporter<SMTPTransport.SentMessageInfo>;
  private from: string;

  constructor(config: SMTPConfig) {
    this.from = config.from;

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    const { to, subject, html, text, attachments } = options;

    await this.transporter.sendMail({
      from: this.from,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: text || this.stripHtml(html),
      attachments: attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
    });
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error({ err: error }, 'SMTP connection verification failed');
      return false;
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}
