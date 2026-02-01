export class DiscordWebhook {
  private webhookUrl: string | undefined;

  constructor(url?: string) {
    const finalUrl = url || process.env.DISCORD_WEBHOOK_URL;
    if (!finalUrl) {
      throw new Error(
        'Discord webhook URL must be provided either as a parameter or via DISCORD_WEBHOOK_URL environment variable.'
      );
    }
    this.webhookUrl = finalUrl;
  }

  private fetch = async (payload: any): Promise<{ error: string | null }> => {
    try {
      const response = await fetch(this.webhookUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return response.ok ? { error: null } : { error: await response.text() };
    } catch (err: any) {
      return { error: err.message };
    }
  };

  public sendEmbed = async (
    title: string,
    description: string,
    color: number = 0x5865f2 // Couleur "Blurple" par défaut
  ): Promise<void> => {
    try {
      const payload = {
        embeds: [
          {
            title,
            description,
            color,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const { error } = await this.fetch(payload);
      if (error) throw new Error(error);
    } catch (error) {
      console.error('Error sending Discord embed:', error);
    }
  };
}

export const discordWebhook = new DiscordWebhook();
