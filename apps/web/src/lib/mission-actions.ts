import { toast } from '@facile/muse';
import { logger } from '@repo/logger';
import { isSmtpNotConfigured } from '@repo/trpc-client';

export async function runAction(
	action: () => Promise<unknown>,
	success: string,
	failure: string
): Promise<boolean> {
	try {
		await action();
		toast.success(success);

		return true;
	} catch (err: any) {
		logger.error({ err }, failure);
		if (!isSmtpNotConfigured(err))
			toast.danger(err?.message || failure);

		return false;
	}
}
