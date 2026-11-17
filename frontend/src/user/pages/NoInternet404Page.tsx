import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { ExtendedNetworkStatus } from '../services/networkService';

export interface NoInternet404PageProps {
  status: ExtendedNetworkStatus;
  isChecking: boolean;
  onRecheck: () => Promise<ExtendedNetworkStatus>;
}

export const NoInternet404Page: React.FC<NoInternet404PageProps> = ({
  isChecking,
  onRecheck
}) => {
  const handleRetry = async () => {
    try {
      const fresh = await onRecheck();
      if (fresh.connected && !fresh.isOffline) {
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-slate-50 font-sans text-slate-800">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shadow-xs">
          <WifiOff className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-black tracking-widest text-rose-600 uppercase">
            404 • OFFLINE
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Không có kết nối Internet
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            Vui lòng kiểm tra lại kết nối Wi-Fi hoặc dữ liệu di động để tiếp tục sử dụng KIZUNA.
          </p>
        </div>

        <button
          onClick={handleRetry}
          disabled={isChecking}
          className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
          <span>{isChecking ? 'Đang kiểm tra kết nối...' : 'Thử lại'}</span>
        </button>
      </div>
    </div>
  );
};
