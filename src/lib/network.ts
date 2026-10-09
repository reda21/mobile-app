import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export async function isOnline(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
  }
  try {
    const state = await NetInfo.fetch();
    return state.isConnected !== false && state.isInternetReachable !== false;
  } catch {
    return true;
  }
}

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  isOffline: boolean;
}

function getInitialNetworkStatus(): NetworkStatus {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    const online = navigator.onLine !== false;
    return {
      isConnected: online,
      isInternetReachable: online,
      isOffline: !online,
    };
  }
  return {
    isConnected: true,
    isInternetReachable: true,
    isOffline: false,
  };
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState(getInitialNetworkStatus);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleOnline = () => setStatus({ isConnected: true, isInternetReachable: true, isOffline: false });
      const handleOffline = () => setStatus({ isConnected: false, isInternetReachable: false, isOffline: true });
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setStatus({
        isConnected: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable ?? null,
        isOffline: offline,
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return status;
}
