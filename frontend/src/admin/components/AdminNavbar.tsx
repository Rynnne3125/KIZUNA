import React from 'react';

export interface AdminNavbarProps {
  user: { fullName?: string; username?: string; role?: string } | null;
  onGoHome?: () => void;
  onLogout: () => void;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({
  user,
  onLogout
}) => {
  return (
    <div className="bg-emerald-950 text-white px-5 py-3 mb-6 rounded-2xl flex items-center justify-between flex-wrap gap-3 border border-emerald-900/50 shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white font-extrabold text-base shadow-sm">
          絆
        </div>
        <div>
          <div className="font-extrabold text-sm sm:text-base text-emerald-50">Hệ Thống Quản Trị KIZUNA OS</div>
          <div className="text-xs text-emerald-300/80">Phân hệ dành riêng cho ban điều hành & quản trị viên</div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {user && (
          <button
            onClick={onLogout}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-300 border border-rose-500/40 hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            Đăng xuất
          </button>
        )}
      </div>
    </div>
  );
};
