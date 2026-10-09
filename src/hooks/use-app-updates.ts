import { useCallback, useState } from 'react';
import * as Updates from 'expo-updates';
import { showToast } from '../lib/toast';

export type UpdateStatus =
  | 'disabled'
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'ready'
  | 'up-to-date'
  | 'error';

export function useAppUpdates() {
  const [status, setStatus] = useState<UpdateStatus>(Updates.isEnabled ? 'idle' : 'disabled');
  const [error, setError] = useState('');

  const checkNow = useCallback(async () => {
    if (!Updates.isEnabled) {
      setStatus('disabled');
      return;
    }
    setError('');
    setStatus('checking');
    try {
      const res = await Updates.checkForUpdateAsync();
      if (!res.isAvailable) {
        setStatus('up-to-date');
        return;
      }
      setStatus('downloading');
      await Updates.fetchUpdateAsync();
      setStatus('ready');
      const answer = await showToast({
        title: 'تحديث جديد جاهز 🎉',
        message: 'أعد تشغيل التطبيق لتطبيق آخر الأخبار.',
        actionLabel: 'إعادة التشغيل',
        duration: 8000,
      }).catch(() => 'dismiss' as const);
      if (answer === 'action') {
        await Updates.reloadAsync().catch(() => {});
      }
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'تعذر التحقق من التحديثات.');
    }
  }, []);

  return {
    supported: Updates.isEnabled,
    status,
    error,
    checkNow,
    channel: Updates.channel,
    runtimeVersion: Updates.runtimeVersion,
    updateId: Updates.updateId,
  };
}
