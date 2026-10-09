import React from 'react';
import { ShieldAlert, Home, LogOut } from 'lucide-react';

export interface AdminForbidden403Props {
  userRole?: string;
  userName?: string;
  onGoHome: () => void;
  onLogout?: () => void;
}

export const AdminForbidden403: React.FC<AdminForbidden403Props> = ({
  userRole = 'ROLE_USER',
  userName = 'Học Viên',
  onGoHome,
  onLogout
}) => {
  return (
    <div className="max-w-lg mx-auto my-16 p-8 text-center bg-white rounded-3xl border border-rose-200 shadow-xl">
      <div className="w-16 h-16 mx-auto mb-5 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center border border-rose-200">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="inline-block bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1 rounded-full mb-3 tracking-wider uppercase">
        403 Forbidden - Admin Only
      </div>

      <h2 className="text-2xl font-extrabold text-slate-900 mb-3">
        Quyền Truy Cập Bị Từ Chối
      </h2>

      <p className="text-sm text-slate-600 leading-relaxed mb-6">
        Khu vực này yêu cầu đặc quyền <strong>ROLE_ADMIN</strong>. Tài khoản học viên thông thường không được phép truy cập vào bảng điều khiển quản trị.
      </p>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 text-left text-xs sm:text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-slate-500">Tài khoản hiện tại:</span>
          <span className="font-bold text-slate-800">{userName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Vai trò hiện có:</span>
          <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-xs">{userRole}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Yêu cầu quyền:</span>
          <span className="bg-rose-100 text-rose-900 font-bold px-2 py-0.5 rounded text-xs">ROLE_ADMIN</span>
        </div>
      </div>

      <div className="flex gap-3 justify-center flex-wrap">
        <button 
          onClick={onGoHome} 
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Về Trang Học Viên</span>
        </button>

        {onLogout && (
          <button 
            onClick={onLogout} 
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        )}
      </div>
    </div>
  );
};
