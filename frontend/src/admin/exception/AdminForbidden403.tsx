import React from 'react';
import { ShieldAlert, Home, LogOut } from 'lucide-react';

export interface AdminForbidden403Props {
  userRole?: string;
  userName?: string;
  onGoHome?: () => void;
  onLogout?: () => void;
}

export const AdminForbidden403: React.FC<AdminForbidden403Props> = ({
  userRole = 'ROLE_USER',
  userName = 'Học Viên',
  onGoHome,
  onLogout
}) => {
  return (
    <div className="max-w-lg mx-4 sm:mx-auto my-8 sm:my-16 p-5 sm:p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-xl">
      <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-2xl flex items-center justify-center border border-rose-200 dark:border-rose-800">
        <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8" />
      </div>

      <div className="inline-block bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-[11px] sm:text-xs font-bold px-3 py-1 rounded-full mb-3 tracking-wider uppercase">
        403 Forbidden - Admin Only
      </div>

      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-2.5 sm:mb-3">
        Quyền Truy Cập Bị Từ Chối
      </h2>

      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5 sm:mb-6">
        Khu vực này yêu cầu đặc quyền <strong>ROLE_ADMIN</strong>. Tài khoản học viên thông thường không được phép truy cập vào bảng điều khiển quản trị.
      </p>

      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 sm:p-4 mb-5 sm:mb-6 text-left text-xs sm:text-sm space-y-2">
        <div className="flex justify-between gap-2">
          <span className="text-slate-500 dark:text-slate-400">Tài khoản hiện tại:</span>
          <span className="font-bold text-slate-800 dark:text-white truncate">{userName}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-slate-500 dark:text-slate-400">Vai trò hiện có:</span>
          <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-xs shrink-0">{userRole}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-slate-500 dark:text-slate-400">Yêu cầu quyền:</span>
          <span className="bg-rose-100 text-rose-900 font-bold px-2 py-0.5 rounded text-xs shrink-0">ROLE_ADMIN</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center">
        <button 
          onClick={onGoHome} 
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Về Trang Học Viên</span>
        </button>

        {onLogout && (
          <button 
            onClick={onLogout} 
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 text-slate-700 dark:text-slate-200 hover:text-rose-600 border border-slate-200 dark:border-slate-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        )}
      </div>
    </div>
  );
};
