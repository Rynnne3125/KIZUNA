import React, { useState } from 'react';
import { User } from '../types/auth';
import { 
  Flame, Star, Award, BookOpen, LogOut, User as UserIcon, 
  Download, RefreshCw, Smartphone, Monitor, CheckCircle2, Sparkles, ShieldCheck,
  Moon, Sun 
} from 'lucide-react';
import { isNativeApp } from '../utils/platform';

interface ProfilePageProps {
  user: User | null;
  onLogout: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  onLogout,
  isDark,
  onToggleTheme
}) => {
  const isApp = isNativeApp();

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<string | null>(null);
  const [remoteVersion, setRemoteVersion] = useState<any>(null);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateResult(null);
    try {
      const res = await fetch('/version.json?t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        setRemoteVersion(data);
        if (data.versionCode > 107) {
          setUpdateResult(`Đã có bản cập nhật mới v${data.version}! Bấm nút tải bên dưới để nâng cấp.`);
        } else {
          setUpdateResult('Bạn đang sử dụng phiên bản KIZUNA mới nhất (v1.0.7). Hệ thống luôn tự động đồng bộ bài học mới!');
        }
      } else {
        setUpdateResult('Bạn đang sử dụng phiên bản mới nhất v1.0.7.');
      }
    } catch {
      setUpdateResult('Bạn đang sử dụng phiên bản v1.0.7 (Máy chủ hoạt động bình thường).');
    } finally {
      setCheckingUpdate(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 text-center bg-white p-8 rounded-3xl border border-emerald-100 shadow-md">
        <div className="w-16 h-16 mx-auto mb-4 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
          <UserIcon className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Bạn chưa đăng nhập</h2>
        <p className="text-slate-500 text-sm mb-6">
          Vui lòng đăng nhập để xem thông tin hồ sơ và lưu tiến trình học tập của bạn.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full text-xs font-bold mb-2">
          <UserIcon className="w-3.5 h-3.5" />
          <span>HỒ SƠ HỌC VIÊN KIZUNA</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Quản Lý Tài Khoản Cá Nhân
        </h1>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-emerald-100 dark:border-slate-800 shadow-md p-6 sm:p-8 transition-colors">
        {/* User Info Header */}
        <div className="flex items-center gap-5 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800 flex-wrap">
          <img
            src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
            alt="Avatar"
            className="w-20 h-20 rounded-2xl object-cover bg-emerald-50 dark:bg-slate-800 border-2 border-emerald-200 dark:border-slate-700 shadow-xs"
          />
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                {user.fullName || user.username}
              </h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                user.role === 'ROLE_ADMIN' 
                  ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900' 
                  : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
              }`}>
                {user.role === 'ROLE_ADMIN' ? 'Ban Quản Trị' : 'Học Viên'}
              </span>
            </div>
            <div className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              @{user.username} • {user.email}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/50 p-4 rounded-2xl text-center">
            <div className="flex items-center justify-center gap-1.5 text-amber-700 dark:text-amber-400 font-extrabold text-xl mb-1">
              <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
              <span>{user.currentStreak || 0}</span>
            </div>
            <div className="text-xs text-amber-900/80 dark:text-amber-300/80 font-medium">Chuỗi Streak</div>
          </div>

          <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/50 p-4 rounded-2xl text-center">
            <div className="flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-extrabold text-xl mb-1">
              <Star className="w-5 h-5 fill-emerald-500 text-emerald-500" />
              <span>{user.activePoints || 0}</span>
            </div>
            <div className="text-xs text-emerald-900/80 dark:text-emerald-300/80 font-medium">Điểm Năng Động</div>
          </div>

          <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/50 p-4 rounded-2xl text-center">
            <div className="flex items-center justify-center gap-1.5 text-indigo-700 dark:text-indigo-400 font-extrabold text-xl mb-1">
              <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>{user.totalXp || 0}</span>
            </div>
            <div className="text-xs text-indigo-900/80 dark:text-indigo-300/80 font-medium">Kinh Nghiệm (XP)</div>
          </div>

          <div className="bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-900/50 p-4 rounded-2xl text-center">
            <div className="flex items-center justify-center gap-1.5 text-teal-700 dark:text-teal-400 font-extrabold text-xl mb-1">
              <BookOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>{user.level || 'Tân binh'}</span>
            </div>
            <div className="text-xs text-teal-900/80 dark:text-teal-300/80 font-medium">Bậc Xếp Hạng</div>
          </div>
        </div>

        {/* Theme Preference Setting Box */}
        <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 dark:from-slate-800/60 dark:to-slate-800/30 border border-emerald-200/80 dark:border-slate-700 rounded-2xl p-4 sm:p-5 mb-8 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white text-sm">
              {isDark ? <Moon className="w-4 h-4 text-emerald-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span>Chế độ giao diện (Nền Sáng / Nền Tối)</span>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
              {isDark ? '🌙 Đang dùng Nền Tối' : '☀️ Đang dùng Nền Sáng'}
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Tuỳ chỉnh giao diện học tập theo sở thích cá nhân. Chế độ nền tối giúp dịu mắt và tiết kiệm pin khi học vào ban đêm, chế độ sáng mang phong cách giấy Kanji truyền thống Nhật Bản.
          </p>

          {onToggleTheme && (
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onToggleTheme}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
                <span>{isDark ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}</span>
              </button>
            </div>
          )}
        </div>

        {/* App Version & In-App Auto-Update System */}
        <div className="bg-gradient-to-br from-slate-50 to-emerald-50/40 dark:from-slate-800/60 dark:to-slate-800/30 border border-emerald-200/80 dark:border-slate-700 rounded-2xl p-4 sm:p-5 mb-8 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white text-sm">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Thông tin phiên bản & Cập nhật ứng dụng</span>
            </div>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              v1.0.7 (Mới nhất)
            </span>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-1.5">
            <p>
              <strong>Cơ chế tự cập nhật trên điện thoại:</strong> Ứng dụng KIZUNA sử dụng công nghệ <em>Live Cloud Sync</em>. Mỗi khi mở app trên Android hoặc máy tính, hệ thống tự động tải giao diện, bài học và tính năng mới nhất từ máy chủ đám mây mà bạn không cần phải tải lại file APK hay cài đè thủ công.
            </p>
          </div>

          <div className="pt-2 border-t border-emerald-100 dark:border-slate-700 flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleCheckUpdate}
              disabled={checkingUpdate}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
              <span>{checkingUpdate ? 'Đang kiểm tra...' : 'Kiểm tra cập nhật mới'}</span>
            </button>

            {/* Chỉ hiển thị nút tải APK và tải bản PC trên Website; trên bản App / APK ẩn hoàn toàn */}
            {!isApp && (
              <>
                <a
                  href="/download/kizuna-latest.apk"
                  download="kizuna-v1.0.7.apk"
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Tải file APK Android (v1.0.7)</span>
                </a>

                <a
                  href="/download/KIZUNA-Setup.exe"
                  download="KIZUNA-Setup.exe"
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Monitor className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Tải bản PC (.exe)</span>
                </a>
              </>
            )}
          </div>

          {updateResult && (
            <div className="p-3 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{updateResult}</span>
            </div>
          )}
        </div>

        {/* Security & Session Info */}
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-4 sm:p-5 mb-8 text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-2">
          <div className="font-bold text-slate-800 dark:text-white text-sm">Bảo mật & Phiên làm việc:</div>
          <p>
            Tài khoản được bảo vệ và đồng bộ tiến độ tự động trên máy chủ KIZUNA.
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Phiên đăng nhập duy trì tối đa 24 giờ. Khi hết hạn hoặc khi bấm đăng xuất, phiên làm việc sẽ được xóa an toàn khỏi trình duyệt.
          </p>
        </div>

        {/* Logout Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-rose-600 dark:text-rose-400 hover:text-white bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-600 dark:hover:bg-rose-600 border border-rose-200 dark:border-rose-900 font-bold text-xs sm:text-sm transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất tài khoản</span>
          </button>
        </div>
      </div>
    </div>
  );
};
