import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone, Download, QrCode, CheckCircle2, 
  X, ShieldCheck, Sparkles, AlertCircle, ExternalLink 
} from 'lucide-react';

interface ApkDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkDownloadModal: React.FC<ApkDownloadModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // Đường dẫn tải trực tiếp APK từ thư mục public
  const apkDownloadPath = '/download/kizuna-latest.apk';
  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'http://15.135.17.96';
  const fullDownloadUrl = `${currentHost}${apkDownloadPath}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(fullDownloadUrl)}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Dialog Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden z-10 my-auto"
        >
          {/* Header gradient banner */}
          <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-6 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-36 h-36 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
                  <Smartphone className="w-6 h-6 text-emerald-300" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 text-[11px] font-bold mb-1 border border-emerald-400/30">
                    <Sparkles className="w-3 h-3 text-emerald-300" />
                    <span>Phiên bản Android APK v1.0.4</span>
                  </div>
                  <h3 className="text-xl font-extrabold tracking-tight text-white">
                    Tải KIZUNA Mobile Cho Điện Thoại
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 sm:p-7 space-y-6">
            
            {/* Quick specifications grid */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5">
                <div className="text-[11px] text-slate-500 font-medium">Dung lượng</div>
                <div className="text-sm font-extrabold text-slate-800 mt-0.5">~12.8 MB</div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5">
                <div className="text-[11px] text-slate-500 font-medium">Hệ điều hành</div>
                <div className="text-sm font-extrabold text-slate-800 mt-0.5">Android 8.0+</div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5">
                <div className="text-[11px] text-slate-500 font-medium">Bảo mật</div>
                <div className="text-sm font-extrabold text-emerald-700 mt-0.5 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> An toàn
                </div>
              </div>
            </div>

            {/* QR Code and Instructions Section */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <div className="shrink-0 bg-white p-2.5 rounded-2xl shadow-xs border border-emerald-200/80">
                <img
                  src={qrCodeUrl}
                  alt="QR Code tải APK Kizuna"
                  className="w-32 h-32 object-contain rounded-lg"
                  loading="lazy"
                />
              </div>
              <div className="text-xs text-slate-600 space-y-1.5">
                <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-700" />
                  <span>Quét mã tải nhanh bằng camera</span>
                </div>
                <p className="leading-relaxed">
                  Mở ứng dụng Camera hoặc Zalo trên điện thoại Android, quét mã QR bên cạnh để tải trực tiếp file APK về máy.
                </p>
                <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tự động đồng bộ tiến độ học từ tài khoản web</span>
                </div>
              </div>
            </div>

            {/* Direct Download Button */}
            <div>
              <a
                href={apkDownloadPath}
                download="kizuna-v1.0.4.apk"
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 active:scale-[0.99] text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-600/25 transition-all text-center cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>Tải Trực Tiếp File APK (.apk)</span>
              </a>
              <div className="text-center mt-2">
                <span className="text-[11px] text-slate-500">
                  Link tải chính thức: <span className="font-mono text-emerald-700">{apkDownloadPath}</span>
                </span>
              </div>
            </div>

            {/* Simple 3-step installation guide */}
            <div className="border-t border-slate-100 pt-4">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Hướng dẫn cài đặt nhanh 3 bước:
              </div>
              <ol className="space-y-2 text-xs text-slate-600 list-decimal list-inside leading-relaxed">
                <li>Bấm <strong>Tải Trực Tiếp File APK</strong> hoặc quét mã QR ở trên.</li>
                <li>Mở file <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[11px]">kizuna-v1.0.4.apk</code> trong thông báo hoặc thư mục <em>Tải về (Downloads)</em>.</li>
                <li>Chọn <strong>Cài đặt</strong> (nếu máy hỏi, bật <em>"Cho phép cài đặt từ nguồn này"</em>) và hoàn tất.</li>
              </ol>
            </div>

          </div>

          {/* Footer close */}
          <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>KIZUNA © 2026</span>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-600 hover:text-emerald-700 font-bold transition-colors cursor-pointer"
            >
              Đóng cửa sổ
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
