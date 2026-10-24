import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone, Monitor, Apple, Download, QrCode, CheckCircle2, 
  X, ShieldCheck, Sparkles, ExternalLink, Share2, PlusSquare,
  Laptop, Check, Globe, ArrowRight
} from 'lucide-react';

interface ApkDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'android' | 'ios' | 'pc';
}

type PlatformTab = 'android' | 'ios' | 'pc';

export const ApkDownloadModal: React.FC<ApkDownloadModalProps> = ({ 
  isOpen, 
  onClose,
  defaultTab
}) => {
  // Tự động nhận diện thiết bị đang truy cập
  const detectPlatform = (): PlatformTab => {
    if (defaultTab) return defaultTab;
    if (typeof navigator === 'undefined') return 'android';
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return 'pc';
  };

  const [activePlatform, setActivePlatform] = useState<PlatformTab>('android');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActivePlatform(detectPlatform());
    }
  }, [isOpen]);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      setInstallSuccess(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPwaInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        setIsPwaInstalled(true);
        setInstallSuccess(true);
      }
      setDeferredPrompt(null);
    } else {
      // Nếu trình duyệt chưa sẵn sàng prompt, cuộn xuống phần hướng dẫn
      const guideEl = document.getElementById('pc-manual-guide');
      if (guideEl) {
        guideEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  if (!isOpen) return null;

  // Đường dẫn tải trực tiếp APK và URL truy cập web
  const apkDownloadPath = '/download/kizuna-v1.0.4.apk';
  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://kizuna-thanhphongit.duckdns.org';
  const fullDownloadUrl = `${currentHost}${apkDownloadPath}`;
  const webAppUrl = currentHost;
  
  // QR codes: Android quét tải APK trực tiếp, iOS quét mở Safari
  const qrAndroidUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(fullDownloadUrl)}`;
  const qrIosUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(webAppUrl)}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Dialog Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden z-10 my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header gradient banner */}
          <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-5 sm:p-6 text-white relative overflow-hidden shrink-0">
            <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-36 h-36 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner shrink-0">
                  {activePlatform === 'android' && <Smartphone className="w-6 h-6 text-emerald-300" />}
                  {activePlatform === 'ios' && <Apple className="w-6 h-6 text-emerald-300" />}
                  {activePlatform === 'pc' && <Monitor className="w-6 h-6 text-emerald-300" />}
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 text-[11px] font-bold mb-1 border border-emerald-400/30">
                    <Sparkles className="w-3 h-3 text-emerald-300" />
                    <span>Hỗ trợ đa nền tảng (Android • iOS • PC)</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                    Tải & Cài Đặt Ứng Dụng KIZUNA
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-4 p-1 bg-black/20 backdrop-blur-md rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setActivePlatform('android')}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                  activePlatform === 'android'
                    ? 'bg-white text-emerald-900 shadow-md scale-[1.02]'
                    : 'text-emerald-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <Smartphone className="w-4 h-4 shrink-0" />
                <span>Android</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePlatform('ios')}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                  activePlatform === 'ios'
                    ? 'bg-white text-emerald-900 shadow-md scale-[1.02]'
                    : 'text-emerald-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <Apple className="w-4 h-4 shrink-0" />
                <span>iOS (iPhone)</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePlatform('pc')}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                  activePlatform === 'pc'
                    ? 'bg-white text-emerald-900 shadow-md scale-[1.02]'
                    : 'text-emerald-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <Laptop className="w-4 h-4 shrink-0" />
                <span>Máy Tính (PC)</span>
              </button>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
            
            {/* =========================================================================
                TAB 1: ANDROID
                ========================================================================= */}
            {activePlatform === 'android' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Quick specs */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5">
                    <div className="text-[11px] text-slate-500 font-medium">Dung lượng</div>
                    <div className="text-xs sm:text-sm font-extrabold text-slate-800 mt-0.5">~6.3 MB</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5">
                    <div className="text-[11px] text-slate-500 font-medium">Hệ điều hành</div>
                    <div className="text-xs sm:text-sm font-extrabold text-slate-800 mt-0.5">Android 8.0+</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5">
                    <div className="text-[11px] text-slate-500 font-medium">Bảo mật</div>
                    <div className="text-xs sm:text-sm font-extrabold text-emerald-700 mt-0.5 flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Ký số thật
                    </div>
                  </div>
                </div>

                {/* QR Code and Instructions Section */}
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                  <div className="shrink-0 bg-white p-2.5 rounded-2xl shadow-xs border border-emerald-200/80">
                    <img
                      src={qrAndroidUrl}
                      alt="QR Code tải APK Kizuna cho Android"
                      className="w-28 h-28 sm:w-32 sm:h-32 object-contain rounded-lg"
                      loading="lazy"
                    />
                  </div>
                  <div className="text-xs text-slate-600 space-y-1.5 text-center sm:text-left">
                    <div className="font-bold text-slate-800 text-sm flex items-center justify-center sm:justify-start gap-1.5">
                      <QrCode className="w-4 h-4 text-emerald-700" />
                      <span>Quét tải bằng Camera hoặc Zalo</span>
                    </div>
                    <p className="leading-relaxed">
                      Mở ứng dụng Camera hoặc Zalo trên điện thoại Android, quét mã QR bên cạnh để tải file APK cài đặt trực tiếp.
                    </p>
                    <div className="text-[11px] text-emerald-800 font-semibold flex items-center justify-center sm:justify-start gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Đầy đủ tính năng, học mượt mà không quảng cáo</span>
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
                    <span>Tải File Cài Đặt APK (.apk)</span>
                    <span className="bg-white/20 text-xs px-2 py-0.5 rounded-md font-extrabold">v1.0.4</span>
                  </a>
                  <div className="text-center mt-2">
                    <span className="text-[11px] text-slate-500">
                      Link tải chính thức: <span className="font-mono text-emerald-700">{apkDownloadPath}</span>
                    </span>
                  </div>
                </div>

                {/* Android Installation Guide */}
                <div className="border-t border-slate-100 pt-3.5">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Hướng dẫn cài đặt Android (3 bước):
                  </div>
                  <ol className="space-y-1.5 text-xs text-slate-600 list-decimal list-inside leading-relaxed">
                    <li>Bấm nút <strong>Tải File Cài Đặt APK</strong> hoặc quét mã QR ở trên.</li>
                    <li>Mở file <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[11px]">kizuna-v1.0.4.apk</code> trong thông báo tải xong hoặc thư mục <em>Tải về (Downloads)</em>.</li>
                    <li>Chọn <strong>Cài đặt</strong> (nếu máy hỏi, bật <em>"Cho phép cài đặt từ nguồn này"</em>) và bắt đầu học ngay.</li>
                  </ol>
                </div>
              </motion.div>
            )}

            {/* =========================================================================
                TAB 2: IOS (IPHONE / IPAD)
                ========================================================================= */}
            {activePlatform === 'ios' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* iOS Apple Official Solution Banner */}
                <div className="p-3.5 rounded-2xl bg-slate-900 text-white shadow-md flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <Apple className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-white text-sm">Cài đặt trực tiếp trên iPhone qua Safari</div>
                    <div className="text-slate-300 text-[11px] mt-0.5">
                      Công nghệ Web App chính thức của Apple: Chạy toàn màn hình, có icon riêng, không cần App Store hay Jailbreak.
                    </div>
                  </div>
                </div>

                {/* QR Code to open on Safari */}
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-sky-50/70 border border-sky-100">
                  <div className="shrink-0 bg-white p-2.5 rounded-2xl shadow-xs border border-sky-200/80">
                    <img
                      src={qrIosUrl}
                      alt="QR Code mở KIZUNA trên Safari iPhone"
                      className="w-28 h-28 sm:w-32 sm:h-32 object-contain rounded-lg"
                      loading="lazy"
                    />
                  </div>
                  <div className="text-xs text-slate-600 space-y-1.5 text-center sm:text-left">
                    <div className="font-bold text-slate-800 text-sm flex items-center justify-center sm:justify-start gap-1.5">
                      <QrCode className="w-4 h-4 text-sky-700" />
                      <span>Quét bằng Camera iPhone</span>
                    </div>
                    <p className="leading-relaxed">
                      Mở ứng dụng <strong>Camera</strong> trên iPhone, quét mã QR bên cạnh để mở trang web bằng trình duyệt <strong>Safari</strong>.
                    </p>
                    <div className="text-[11px] text-sky-800 font-semibold flex items-center justify-center sm:justify-start gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>Chạy mượt mà, đầy đủ Flashcard & Âm thanh bản xứ</span>
                    </div>
                  </div>
                </div>

                {/* Step by step Safari Visual Guide */}
                <div className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/60 space-y-3">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>4 Bước cài đặt KIZUNA lên màn hình chính iPhone:</span>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-700">
                    <div className="flex items-start gap-2.5 bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0">1</span>
                      <div className="leading-snug">
                        Mở liên kết web bằng trình duyệt <strong>Safari</strong> trên iPhone/iPad.
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0">2</span>
                      <div className="leading-snug">
                        Bấm vào nút <strong>Chia sẻ (Share)</strong> ở thanh công cụ dưới đáy Safari (biểu tượng hình ô vuông có mũi tên hướng lên <Share2 className="w-3.5 h-3.5 inline text-sky-600" />).
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0">3</span>
                      <div className="leading-snug">
                        Cuộn menu xuống và chọn <strong>"Thêm vào Màn hình chính" (Add to Home Screen)</strong> (biểu tượng hình dấu cộng <PlusSquare className="w-3.5 h-3.5 inline text-emerald-600" />).
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0">4</span>
                      <div className="leading-snug">
                        Bấm <strong>"Thêm" (Add)</strong> ở góc trên bên phải màn hình. Icon KIZUNA sẽ lập tức xuất hiện trên màn hình chính của iPhone như một app thật!
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* =========================================================================
                TAB 3: PC / DESKTOP (WINDOWS / MAC / LINUX)
                ========================================================================= */}
            {activePlatform === 'pc' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Desktop PWA 1-Click Install Button */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Monitor className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">Cài Đặt Trực Tiếp KIZUNA PC App</h4>
                      <p className="text-[11px] text-slate-500">Chạy độc lập ngoài màn hình Desktop, thanh Taskbar riêng, mở siêu tốc.</p>
                    </div>
                  </div>

                  {isPwaInstalled || installSuccess ? (
                    <div className="w-full py-3 px-4 bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
                      <Check className="w-4 h-4 text-emerald-700" />
                      <span>Đã cài đặt ứng dụng KIZUNA trên máy tính! Bạn có thể mở từ Desktop hoặc thanh Taskbar.</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleInstallPwa}
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 active:scale-[0.99] text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      <Download className="w-5 h-5" />
                      <span>Cài Đặt Ngay Lên Máy Tính (PC App)</span>
                    </button>
                  )}
                </div>

                {/* Manual Install Instructions for Chrome / Edge */}
                <div id="pc-manual-guide" className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/60 space-y-3">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-700" />
                    <span>Hướng dẫn cài đặt trên Google Chrome & Microsoft Edge:</span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-700">
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-2xs">
                      <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">1</span>
                        <span>Cách 1 (Nhanh nhất): Bấm icon cài đặt trên thanh địa chỉ URL</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-[11px]">
                        Nhìn vào góc phải của thanh nhập địa chỉ web (URL) trên trình duyệt máy tính của bạn, bạn sẽ thấy biểu tượng <strong>"Cài đặt KIZUNA"</strong> (hình chiếc máy tính có mũi tên xuống <Download className="w-3 h-3 inline text-emerald-700" /> hoặc dấu cộng ⊕). Bấm vào đó và chọn <strong>"Cài đặt"</strong>.
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-2xs">
                      <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">2</span>
                        <span>Cách 2: Qua Menu trình duyệt</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-[11px]">
                        Bấm vào biểu tượng <strong>Menu 3 chấm (⋮ hoặc ...)</strong> ở góc trên bên phải trình duyệt Chrome/Edge &rarr; chọn <strong>"Lưu và chia sẻ"</strong> (hoặc "Ứng dụng") &rarr; bấm <strong>"Cài đặt KIZUNA..."</strong>.
                      </p>
                    </div>
                  </div>
                </div>

                {/* PC Learning Advantages */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Hỗ trợ phím tắt Space (Lật thẻ) & Mũi tên</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Cửa sổ độc lập không lẫn tab trình duyệt</span>
                  </div>
                </div>
              </motion.div>
            )}

          </div>

          {/* Footer close */}
          <div className="px-6 py-3.5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <span className="font-medium">KIZUNA • Học tiếng Nhật chuẩn bản xứ</span>
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
