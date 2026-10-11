import { toast } from '@repo/utils';
import { logger } from '@repo/logger';

export async function runAction(
	action: () => Promise<unknown>,
	success: string,
	failure: string
): Promise<boolean> {
	try {
		await action();
		toast.push(success, 'success');

		return true;
	} catch (err: any) {
		logger.error({ err }, failure);
		toast.push(err?.message || failure, 'error');

		return false;
	}
}
