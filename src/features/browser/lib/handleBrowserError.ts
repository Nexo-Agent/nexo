import { toast } from 'sonner';
import i18n from '@/i18n/config';

export function getBrowserErrorMessage(error: unknown): string {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const message = record.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return i18n.t('browser:error');
}

export function notifyBrowserError(error: unknown): void {
  toast.error(getBrowserErrorMessage(error));
}
