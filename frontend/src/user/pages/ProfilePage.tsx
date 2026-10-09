import React from 'react';
import { User } from '../types/auth';
import { Flame, Star, Award, BookOpen, LogOut, User as UserIcon } from 'lucide-react';

interface ProfilePageProps {
  user: User | null;
  onLogout: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  onLogout
}) => {
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
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold mb-2">
          <UserIcon className="w-3.5 h-3.5" />
          <span>HỒ SƠ HỌC VIÊN KIZUNA</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Quản Lý Tài Khoản Cá Nhân
        </h1>
      </div>

      <div className="bg-white rounded-3xl border border-emerald-100 shadow-md p-6 sm:p-8">
        {/* User Info Header */}
        <div className="flex items-center gap-5 mb-8 pb-6 border-b border-slate-100 flex-wrap">
          <img
            src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
            alt="Avatar"
            className="w-20 h-20 rounded-2xl object-cover bg-emerald-50 border-2 border-emerald-200 shadow-xs"
          />
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {user.fullName || user.username}
              </h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                user.role === 'ROLE_ADMIN' 
                  ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                {user.role === 'ROLE_ADMIN' ? 'Ban Quản Trị' : 'Học Viên'}
              </span>
            </div>
            <div className="text-slate-500 text-sm mt-1">
              @{user.username} • {user.email}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <div className="bg-amber-50/70 border border-amber-200/60 p-4 rounded-2xl text-center">
            <div className="flex items-center justify-center gap-1.5 text-amber-700 font-extrabold text-xl mb-1">
              <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
              <span>{user.currentStreak || 0}</span>
            </div>
            <div className="text-xs text-amber-900/80 font-medium">Chuỗi Streak</div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/60 p-4 rounded-2xl text-center">
            <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-extrabold text-xl mb-1">
              <Star className="w-5 h-5 fill-emerald-500 text-emerald-500" />
              <span>{user.activePoints || 0}</span>
            </div>
            <div className="text-xs text-emerald-900/80 font-medium">Điểm Năng Động</div>
          </div>

          <div className="bg-indigo-50/70 border border-indigo-200/60 p-4 rounded-2xl text-center">
            <div className="flex items-center justify-center gap-1.5 text-indigo-700 font-extrabold text-xl mb-1">
              <Award className="w-5 h-5 text-indigo-600" />
              <span>{user.totalXp || 0}</span>
            </div>
            <div className="text-xs text-indigo-900/80 font-medium">Kinh Nghiệm (XP)</div>
          </div>

          <div className="bg-teal-50/70 border border-teal-200/60 p-4 rounded-2xl text-center">
            <div className="flex items-center justify-center gap-1.5 text-teal-700 font-extrabold text-xl mb-1">
              <BookOpen className="w-5 h-5 text-teal-600" />
              <span>{user.level || 'Tân binh'}</span>
            </div>
            <div className="text-xs text-teal-900/80 font-medium">Bậc Xếp Hạng</div>
          </div>
        </div>

        {/* Security & Session Info */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 mb-8 text-xs sm:text-sm text-slate-600 space-y-2">
          <div className="font-bold text-slate-800 text-sm">Bảo mật & Phiên làm việc:</div>
          <p>
            Tài khoản được bảo vệ và đồng bộ tiến độ tự động trên máy chủ KIZUNA.
          </p>
          <p className="text-slate-500 text-xs">
            Phiên đăng nhập duy trì tối đa 24 giờ. Khi hết hạn hoặc khi bấm đăng xuất, phiên làm việc sẽ được xóa an toàn khỏi trình duyệt.
          </p>
        </div>

        {/* Logout Button */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 font-bold text-xs sm:text-sm transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất tài khoản</span>
          </button>
        </div>
      </div>
    </div>
  );
};
