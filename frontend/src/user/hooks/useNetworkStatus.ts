import { useState, useEffect, useCallback } from 'react';
import { ConnectionType } from '@capacitor/network';
import { networkService, ExtendedNetworkStatus } from '../services/networkService';

export interface UseNetworkStatusReturn {
  status: ExtendedNetworkStatus;
  isChecking: boolean;
  wifiOnlyRequired: boolean;
  isCellularBypassed: boolean;
  isBlockedByNoInternet: boolean;
  isBlockedByWifiRequirement: boolean;
  recheck: () => Promise<ExtendedNetworkStatus>;
  setWifiOnlyRequired: (required: boolean) => void;
  bypassCellular: () => void;
  resetBypass: () => void;
  simulatedType: ConnectionType | null;
  setSimulatedType: (type: ConnectionType | null) => void;
}

export const useNetworkStatus = (): UseNetworkStatusReturn => {
  const [status, setStatus] = useState<ExtendedNetworkStatus>(() => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    return {
      connected: isOnline,
      connectionType: isOnline ? 'wifi' : 'none',
      isWifi: isOnline,
      isCellular: false,
      isOffline: !isOnline,
      isWeak: false,
      quality: isOnline ? 'online' : 'offline'
    };
  });

  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [wifiOnlyRequired, setWifiOnlyRequiredState] = useState<boolean>(() => networkService.isWifiOnlyRequired());
  const [isCellularBypassed, setIsCellularBypassedState] = useState<boolean>(() => networkService.isCellularBypassed());
  const [simulatedType, setSimulatedTypeState] = useState<ConnectionType | null>(() => networkService.getSimulatedType());

  const fetchStatus = useCallback(async (force = false) => {
    setIsChecking(true);
    try {
      const fresh = await networkService.getStatus(force);
      setStatus(fresh);
      return fresh;
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus(false);

    const handleBrowserOffline = () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setStatus(prev => ({
          ...prev,
          connected: false,
          connectionType: 'none',
          isWifi: false,
          isCellular: false,
          isOffline: true,
          isWeak: false,
          quality: 'offline'
        }));
      }
    };
    const handleBrowserOnline = () => {
      void fetchStatus(true);
    };
    window.addEventListener('offline', handleBrowserOffline);
    window.addEventListener('online', handleBrowserOnline);

    const unsubscribe = networkService.addStatusListener((updatedStatus) => {
      setStatus(updatedStatus);
      setIsChecking(false);
    });

    const handleConfigChange = () => {
      setWifiOnlyRequiredState(networkService.isWifiOnlyRequired());
      setIsCellularBypassedState(networkService.isCellularBypassed());
      setSimulatedTypeState(networkService.getSimulatedType());
      void fetchStatus(true);
    };

    window.addEventListener('kizuna_network_config_changed', handleConfigChange);

    return () => {
      window.removeEventListener('offline', handleBrowserOffline);
      window.removeEventListener('online', handleBrowserOnline);
      unsubscribe();
      window.removeEventListener('kizuna_network_config_changed', handleConfigChange);
    };
  }, [fetchStatus]);

  // App hỗ trợ học tập Offline hoàn toàn, không còn chặn truy cập khi mất mạng
  const isBlockedByNoInternet = false;
  const isBlockedByWifiRequirement = false;

  const setWifiOnlyRequired = (required: boolean) => {
    networkService.setWifiOnlyRequired(required);
    setWifiOnlyRequiredState(required);
  };

  const bypassCellular = () => {
    networkService.setCellularBypassed(true);
    setIsCellularBypassedState(true);
  };

  const resetBypass = () => {
    networkService.setCellularBypassed(false);
    setIsCellularBypassedState(false);
  };

  const setSimulatedType = (type: ConnectionType | null) => {
    networkService.setSimulatedType(type);
    setSimulatedTypeState(type);
    void fetchStatus(true);
  };

  const recheck = useCallback(async () => {
    return await fetchStatus(true);
  }, [fetchStatus]);

  return {
    status,
    isChecking,
    wifiOnlyRequired,
    isCellularBypassed,
    isBlockedByNoInternet,
    isBlockedByWifiRequirement,
    recheck,
    setWifiOnlyRequired,
    bypassCellular,
    resetBypass,
    simulatedType,
    setSimulatedType
  };
};
