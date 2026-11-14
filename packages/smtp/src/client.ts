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
  sender?: EmailSender;
}

/**
 * Who a message is sent for. The address is always the platform's own From
 * address; only the display name changes, and replies go to `replyTo`.
 */
export interface EmailSender {
  name: string;
  replyTo?: string;
}

/** The bare address of a From header such as `"Name" <a@b.c>` or `a@b.c`. */
export function fromAddress(from: string): string {
  const match = /<([^<>\s]+@[^<>\s]+)>\s*$/.exec(from);
  return (match ? match[1] : from).trim();
}

/** A display name that cannot carry a header break or an address of its own. */
export function senderName(name: string): string {
  return name.replace(/[\r\n<>"@\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 78) || 'Ardoise';
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
    const { to, subject, html, text, attachments, sender } = options;

    await this.transporter.sendMail({
      from: sender ? { name: senderName(sender.name), address: fromAddress(this.from) } : this.from,
      ...(sender?.replyTo ? { replyTo: sender.replyTo } : {}),
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
