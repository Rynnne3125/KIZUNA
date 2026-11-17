import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, WifiOff, RefreshCw, Signal, AlertTriangle, 
  ChevronRight, Smartphone, Laptop, CheckCircle2, 
  HelpCircle, ShieldCheck, ArrowRight, Info
} from 'lucide-react';
import { ExtendedNetworkStatus } from '../services/networkService';
import { ConnectionType } from '@capacitor/network';

export interface WifiRequiredPageProps {
  status: ExtendedNetworkStatus;
  isChecking: boolean;
  onRecheck: () => Promise<ExtendedNetworkStatus>;
  onBypassCellular?: () => void;
  simulatedType?: ConnectionType | null;
  onSetSimulatedType?: (type: ConnectionType | null) => void;
}

export const WifiRequiredPage: React.FC<WifiRequiredPageProps> = ({
  status,
  isChecking,
  onRecheck,
  onBypassCellular,
  simulatedType,
  onSetSimulatedType
}) => {
  const [showGuide, setShowGuide] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'warn' | 'info' } | null>(null);
  const [showSimPanel, setShowSimPanel] = useState(false);

  const handleManualRecheck = async () => {
    setFeedbackMsg({ text: 'Đang kiểm tra lại tín hiệu mạng...', type: 'info' });
    try {
      const fresh = await onRecheck();
      if (fresh.isWifi) {
        setFeedbackMsg({ text: 'Đã kết nối Wi-Fi thành công! Đang chuyển vào ứng dụng...', type: 'success' });
      } else if (fresh.isCellular) {
        setFeedbackMsg({ text: 'Thiết bị vẫn đang dùng Dữ liệu di động (4G/5G). Hãy bật Wi-Fi!', type: 'warn' });
      } else {
        setFeedbackMsg({ text: 'Chưa phát hiện kết nối mạng. Vui lòng kiểm tra lại thiết bị!', type: 'warn' });
      }
    } catch {
      setFeedbackMsg({ text: 'Lỗi kiểm tra mạng. Vui lòng thử lại sau vài giây.', type: 'warn' });
    }
  };

  const isOffline = status.isOffline;
  const isCellular = status.isCellular;

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center p-4 sm:p-6 lg:p-10 kanji-paper-bg relative overflow-x-hidden font-sans text-slate-800 selection:bg-emerald-100">
      
      {/* Background Japanese Watermark */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none select-none text-[180px] sm:text-[280px] font-black text-emerald-900/[0.03] leading-none z-0">
        無 線
      </div>

      {/* TOP HEADER */}
      <header className="w-full max-w-xl mx-auto flex items-center justify-between z-10 py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-emerald-700/20">
            絆
          </div>
          <div>
            <div className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg flex items-center gap-2">
              KIZUNA 絆
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                APP
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Học tiếng Nhật chuẩn bản xứ</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
          <span>Cần kết nối Wi-Fi</span>
        </div>
      </header>

      {/* MAIN CONTENT CARD */}
      <main className="w-full max-w-xl mx-auto my-auto z-10 py-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="bg-white/95 backdrop-blur-md rounded-3xl border border-emerald-100 shadow-xl shadow-slate-200/60 p-6 sm:p-9 text-center relative overflow-hidden"
        >
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500" />

          {/* ANIMATED RADAR ICON */}
          <div className="relative my-4 flex items-center justify-center">
            {/* Outer pulsating wave rings */}
            <div className={`absolute w-32 h-32 rounded-full animate-ping opacity-25 ${
              isOffline ? 'bg-rose-400' : 'bg-emerald-400'
            }`} style={{ animationDuration: '3s' }} />
            
            <div className={`absolute w-24 h-24 rounded-full ${
              isOffline ? 'bg-rose-100/80' : 'bg-emerald-100/80'
            } animate-pulse`} />

            {/* Central Badge */}
            <div className={`relative w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg transition-all ${
              isOffline 
                ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-rose-500/25'
                : 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-emerald-500/25'
            }`}>
              {isChecking ? (
                <RefreshCw className="w-10 h-10 animate-spin" />
              ) : isOffline ? (
                <WifiOff className="w-10 h-10" />
              ) : isCellular ? (
                <div className="relative">
                  <Signal className="w-10 h-10" />
                  <span className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-900 text-[10px] font-extrabold px-1 rounded-sm">4G</span>
                </div>
              ) : (
                <Wifi className="w-10 h-10" />
              )}
            </div>
          </div>

          {/* HEADINGS */}
          <div className="space-y-2 mb-6">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {isOffline ? 'Không Có Kết Nối Internet' : 'Yêu Cầu Kết Nối Mạng Wi-Fi'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              {isOffline ? (
                <span>
                  Ứng dụng KIZUNA không phát hiện thấy đường truyền Internet. Vui lòng kết nối vào mạng <strong className="text-emerald-700">Wi-Fi</strong> để tiếp tục sử dụng.
                </span>
              ) : isCellular ? (
                <span>
                  Bạn đang sử dụng <strong className="text-amber-700">Dữ liệu di động (4G/5G)</strong>. Ứng dụng yêu cầu kết nối <strong className="text-emerald-700">Wi-Fi</strong> để đảm bảo tốc độ cao và không tiêu hao dung lượng data của bạn.
                </span>
              ) : (
                <span>
                  Vui lòng kết nối thiết bị với mạng <strong className="text-emerald-700">Wi-Fi khả dụng</strong> để tải nội dung bài học tiếng Nhật.
                </span>
              )}
            </p>
          </div>

          {/* STATUS DETAIL CARD */}
          <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 mb-6 text-left space-y-2.5">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-500 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-slate-400" />
                Mạng hiện tại:
              </span>
              <span className="font-extrabold flex items-center gap-1.5">
                {isOffline ? (
                  <span className="text-rose-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Mất mạng (Offline)
                  </span>
                ) : isCellular ? (
                  <span className="text-amber-700 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    Dữ liệu di động (4G/5G)
                  </span>
                ) : (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Mạng Wi-Fi
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-slate-200/60">
              <span className="text-slate-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Điều kiện truy cập:
              </span>
              <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 text-xs">
                Yêu cầu Wi-Fi
              </span>
            </div>
          </div>

          {/* FEEDBACK NOTIFICATION */}
          <AnimatePresence>
            {feedbackMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`p-3 rounded-xl mb-5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 ${
                  feedbackMsg.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : feedbackMsg.type === 'warn'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                }`}
              >
                {feedbackMsg.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                {feedbackMsg.type === 'warn' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                {feedbackMsg.type === 'info' && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />}
                <span>{feedbackMsg.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ACTION BUTTONS */}
          <div className="space-y-3">
            {/* 1. Primary Recheck Button */}
            <button
              onClick={handleManualRecheck}
              disabled={isChecking}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Đang kiểm tra kết nối...' : 'Kiểm Tra Lại Kết Nối Wi-Fi'}</span>
            </button>

            {/* 2. Wi-Fi Guide Toggle Button */}
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <span>{showGuide ? 'Ẩn hướng dẫn bật Wi-Fi' : 'Xem hướng dẫn bật kết nối Wi-Fi'}</span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showGuide ? 'rotate-90' : ''}`} />
            </button>

            {/* 3. Cellular Bypass Button (Khi đang có 4G và người dùng muốn tiếp tục) */}
            {isCellular && onBypassCellular && (
              <div className="pt-2">
                <button
                  onClick={onBypassCellular}
                  className="w-full py-2 px-4 rounded-xl border border-amber-300 bg-amber-50/70 hover:bg-amber-100 text-amber-900 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  title="Cho phép sử dụng tạm thời bằng 4G/5G cho phiên này"
                >
                  <ArrowRight className="w-4 h-4 text-amber-700" />
                  <span>Tôi hiểu và vẫn muốn tiếp tục bằng 4G/5G</span>
                </button>
                <p className="text-[10px] text-slate-400 mt-1">
                  (Khuyến nghị kết nối Wi-Fi để tiết kiệm dung lượng)
                </p>
              </div>
            )}
          </div>

          {/* ACCORDION GUIDE */}
          <AnimatePresence>
            {showGuide && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-5 text-left text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3"
              >
                <div className="font-extrabold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Info className="w-4 h-4 text-emerald-600" />
                  Cách bật Wi-Fi nhanh:
                </div>
                
                <div className="space-y-2 text-slate-600">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/60 flex items-start gap-2.5">
                    <Smartphone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-800">Điện thoại Android / iPhone:</strong>
                      <p className="text-[11px] mt-0.5">
                        Vuốt màn hình từ trên xuống để mở thanh <em>Cài đặt nhanh (Control Center)</em> &rarr; Nhấn vào biểu tượng <strong>Wi-Fi</strong> để bật và chọn tên mạng quen thuộc của bạn.
                      </p>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/60 flex items-start gap-2.5">
                    <Laptop className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-800">Máy tính (Laptop / PC):</strong>
                      <p className="text-[11px] mt-0.5">
                        Bấm vào biểu tượng mạng ở góc dưới bên phải màn hình (Taskbar) &rarr; Bật <strong>Wi-Fi</strong> và chọn mạng để kết nối.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </main>

      {/* FOOTER & TEST / SIMULATION TOOLBAR */}
      <footer className="w-full max-w-xl mx-auto z-10 text-center space-y-3">
        <div className="text-[11px] text-slate-400">
          KIZUNA 絆 Hệ thống học tiếng Nhật trực tuyến • Đảm bảo kết nối ổn định
        </div>

        {/* Nút bật thanh giả lập mạng để tiện kiểm thử trực quan */}
        {onSetSimulatedType && (
          <div className="pt-1">
            <button
              onClick={() => setShowSimPanel(!showSimPanel)}
              className="text-[11px] text-slate-500 hover:text-emerald-700 underline font-medium cursor-pointer"
            >
              {showSimPanel ? '▲ Đóng công cụ kiểm thử mạng' : '▼ Công cụ kiểm thử: Thử nghiệm các trạng thái mạng'}
            </button>

            {showSimPanel && (
              <div className="mt-2.5 p-3 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200 shadow-md text-left text-xs space-y-2">
                <div className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Trình giả lập mạng (Kiểm tra nhanh chức năng):</span>
                  {simulatedType && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
                      Đang giả lập: {simulatedType.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    onClick={() => onSetSimulatedType('wifi')}
                    className={`px-2 py-1.5 rounded-lg font-bold text-[11px] border cursor-pointer transition-all ${
                      simulatedType === 'wifi'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    1. Có Wi-Fi
                  </button>
                  <button
                    onClick={() => onSetSimulatedType('cellular')}
                    className={`px-2 py-1.5 rounded-lg font-bold text-[11px] border cursor-pointer transition-all ${
                      simulatedType === 'cellular'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-slate-50 hover:bg-amber-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    2. Dùng 4G/5G
                  </button>
                  <button
                    onClick={() => onSetSimulatedType('none')}
                    className={`px-2 py-1.5 rounded-lg font-bold text-[11px] border cursor-pointer transition-all ${
                      simulatedType === 'none'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 hover:bg-rose-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    3. Mất mạng
                  </button>
                  <button
                    onClick={() => onSetSimulatedType(null)}
                    className="px-2 py-1.5 rounded-lg font-bold text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 cursor-pointer"
                  >
                    Mạng thực tế
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </footer>

    </div>
  );
};
