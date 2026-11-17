import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  WifiOff, RefreshCw, Signal, AlertTriangle, 
  Smartphone, Wifi, ShieldAlert, ArrowRight, HelpCircle
} from 'lucide-react';
import { ExtendedNetworkStatus } from '../services/networkService';

export interface NoInternet404PageProps {
  status: ExtendedNetworkStatus;
  isChecking: boolean;
  onRecheck: () => Promise<ExtendedNetworkStatus>;
}

export const NoInternet404Page: React.FC<NoInternet404PageProps> = ({
  status,
  isChecking,
  onRecheck
}) => {
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'warn' | 'info' } | null>(null);

  const handleManualRecheck = async () => {
    setFeedbackMsg({ text: 'Đang dò tìm tín hiệu Wi-Fi và Dữ liệu di động...', type: 'info' });
    try {
      const fresh = await onRecheck();
      if (fresh.connected && !fresh.isOffline) {
        setFeedbackMsg({ text: 'Đã phát hiện kết nối Internet! Đang chuyển vào trang đăng nhập...', type: 'success' });
      } else {
        setFeedbackMsg({ text: 'Vẫn chưa có kết nối Internet. Vui lòng bật Wi-Fi hoặc Dữ liệu di động (4G/5G)!', type: 'warn' });
      }
    } catch {
      setFeedbackMsg({ text: 'Lỗi kiểm tra mạng. Vui lòng thử lại sau vài giây.', type: 'warn' });
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center p-4 sm:p-6 lg:p-10 kanji-paper-bg relative overflow-x-hidden font-sans text-slate-800 selection:bg-rose-100">
      
      {/* Background Japanese Watermark */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none select-none text-[180px] sm:text-[280px] font-black text-rose-900/[0.03] leading-none z-0">
        断 線
      </div>

      {/* TOP HEADER */}
      <header className="w-full max-w-xl mx-auto flex items-center justify-between z-10 py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-600 to-red-700 flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-rose-700/20">
            絆
          </div>
          <div>
            <div className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg flex items-center gap-2">
              KIZUNA 絆
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                404 OFFLINE
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Học tiếng Nhật chuẩn bản xứ</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          <span>Không Có Internet</span>
        </div>
      </header>

      {/* MAIN CONTENT CARD */}
      <main className="w-full max-w-xl mx-auto my-auto z-10 py-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="bg-white/95 backdrop-blur-md rounded-3xl border border-rose-100 shadow-xl shadow-slate-200/60 p-6 sm:p-9 text-center relative overflow-hidden"
        >
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-red-600" />

          {/* 404 & RADAR ICON */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute w-32 h-32 rounded-full animate-ping opacity-20 bg-rose-400" style={{ animationDuration: '3s' }} />
            <div className="absolute w-24 h-24 rounded-full bg-rose-50 border border-rose-100" />
            
            <div className="relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex flex-col items-center justify-center shadow-lg shadow-rose-600/30">
              <WifiOff className="w-8 h-8" />
              <span className="text-[10px] font-black tracking-wider uppercase mt-1">404</span>
            </div>
          </div>

          {/* BADGE 404 ERROR */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 mb-3">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>404 · INTERNET REQUIRED</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
            Cần Có Kết Nối Internet Để Đăng Nhập
          </h1>

          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-6 max-w-md mx-auto">
            Hệ thống nhận thấy thiết bị của bạn đang ngoại tuyến. Để xác thực danh tính, đồng bộ tiến độ học và bảo mật tài khoản, bạn cần kết nối <strong>Wi-Fi</strong> hoặc <strong>Dữ liệu di động (4G/5G)</strong> trước khi truy cập trang đăng nhập.
          </p>

          {/* NETWORK STATUS DETAILS */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-6 text-left space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Trạng thái kết nối thiết bị:</span>
              <span className="text-rose-600 font-extrabold">Đang Ngoại Tuyến</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2">
                <Wifi className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="font-semibold text-slate-700">Mạng Wi-Fi</div>
                  <div className="text-[11px] text-rose-600 font-bold">Chưa kết nối</div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2">
                <Signal className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="font-semibold text-slate-700">Dữ liệu 4G / 5G</div>
                  <div className="text-[11px] text-rose-600 font-bold">Chưa kết nối</div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 bg-amber-50/80 border border-amber-200/60 rounded-xl p-2.5 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Hướng dẫn:</strong> Bật Wi-Fi hoặc mở Cài đặt &rarr; bật Dữ liệu di động trên điện thoại, sau đó nhấn <strong>"Kiểm tra lại kết nối"</strong> bên dưới.
              </span>
            </div>
          </div>

          {/* FEEDBACK NOTICE */}
          {feedbackMsg && (
            <div className={`p-3 rounded-xl text-xs font-semibold mb-5 flex items-center justify-center gap-2 ${
              feedbackMsg.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : feedbackMsg.type === 'warn'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* ACTION BUTTON */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleManualRecheck}
              disabled={isChecking}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 transition-all cursor-pointer active:scale-98 disabled:opacity-70"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Đang kiểm tra kết nối...' : 'Kiểm tra lại kết nối'}</span>
            </button>
          </div>
        </motion.div>
      </main>

      {/* FOOTER */}
      <footer className="w-full max-w-xl mx-auto text-center z-10 py-3 text-xs text-slate-400">
        <div className="flex items-center justify-center gap-2">
          <span>KIZUNA 絆 Hệ thống học tiếng Nhật thông minh</span>
          <span>•</span>
          <span>Yêu cầu mạng để đăng nhập</span>
        </div>
      </footer>
    </div>
  );
};
