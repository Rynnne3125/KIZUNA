import React, { useState, useEffect } from 'react';
import { AdminUser, AdminRole, StudentDossierData } from '../types/adminTypes';
import { adminService } from '../services/adminService';
import { Badge } from '@/admin/components/ui/badge';
import { Button } from '@/admin/components/ui/button';
import { Input } from '@/admin/components/ui/input';
import { Label } from '@/admin/components/ui/label';
import {
  X, Shield, UserCheck, Ban, CheckCircle2, Flame, Zap,
  Trash2, Save, BookOpen, RefreshCw, AlertTriangle, Award, Clock,
  Bot, MapPin, Target
} from 'lucide-react';

const SKILL_LABELS: Record<string, string> = {
  alphabet: 'Bảng chữ cái',
  vocabulary: 'Từ vựng',
  grammar: 'Ngữ pháp',
  kanji: 'Chữ Hán (Kanji)',
  reading: 'Đọc hiểu'
};

const CONFIDENCE_STYLES: Record<string, { label: string; cls: string }> = {
  HIGH: { label: 'Tin cậy Cao (HIGH)', cls: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  MODERATE: { label: 'Trung bình (MODERATE)', cls: 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  LOW: { label: 'Thấp / Cơ bản (LOW)', cls: 'border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' }
};

interface UserInspectorDrawerProps {
  user: AdminUser | null;
  onClose: () => void;
  onUserUpdated: (updated: AdminUser) => void;
  onUserDeleted: (userId: string) => void;
}

export const UserInspectorDrawer: React.FC<UserInspectorDrawerProps> = ({
  user,
  onClose,
  onUserUpdated,
  onUserDeleted
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'anticheat' | 'dossier'>('profile');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states - Profile & Role
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>('ROLE_USER');
  const [level, setLevel] = useState('Tân binh');
  const [isBanned, setIsBanned] = useState(false);

  // Anti-cheat states
  const [pointsDelta, setPointsDelta] = useState<string>('');
  const [antiCheatReason, setAntiCheatReason] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Dossier states
  const [dossier, setDossier] = useState<StudentDossierData | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || user.username || '');
      setEmail(user.email || '');
      setRole((user.role === 'ROLE_ADMIN' ? 'ROLE_ADMIN' : 'ROLE_USER'));
      setLevel(user.level || 'Tân binh');
      setIsBanned(user.status === 'BANNED' || user.enabled === false);
      setPointsDelta('');
      setAntiCheatReason('');
      setConfirmDelete(false);
      setFeedback(null);

      setLoadingDossier(true);
      adminService.getStudentDossier(user).then(data => {
        setDossier(data);
        setLoadingDossier(false);
      });
    }
  }, [user]);

  if (!user) return null;

  const showMessage = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const nextStatus = isBanned ? 'BANNED' : 'ACTIVE';
    const updates: Partial<AdminUser> = {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      role,
      level,
      status: nextStatus,
      enabled: !isBanned
    };

    const ok = await adminService.updateUser(user.id, updates);
    setSaving(false);
    if (ok) {
      const updatedUser: AdminUser = { ...user, ...updates };
      onUserUpdated(updatedUser);
      showMessage('success', 'Đã lưu thông tin, phân quyền và trạng thái tài khoản.');
    } else {
      showMessage('error', 'Không thể cập nhật lên Firestore. Vui lòng thử lại.');
    }
  };

  const handleQuickToggleRole = async () => {
    const nextRole: AdminRole = role === 'ROLE_ADMIN' ? 'ROLE_USER' : 'ROLE_ADMIN';
    setSaving(true);
    const ok = await adminService.updateUserRole(user.id, nextRole);
    setSaving(false);
    if (ok) {
      setRole(nextRole);
      onUserUpdated({ ...user, role: nextRole });
      showMessage('success', `Đã chuyển vai trò thành ${nextRole === 'ROLE_ADMIN' ? 'Quản trị viên (ROLE_ADMIN)' : 'Học viên (ROLE_USER)'}.`);
    } else {
      showMessage('error', 'Lỗi khi đổi vai trò.');
    }
  };

  const handleQuickToggleStatus = async () => {
    const nextActive = isBanned; // nếu đang bị khóa thì mở khóa (true), ngược lại khóa (false)
    setSaving(true);
    const ok = await adminService.updateUserStatus(user.id, nextActive);
    setSaving(false);
    if (ok) {
      setIsBanned(!nextActive);
      onUserUpdated({
        ...user,
        status: nextActive ? 'ACTIVE' : 'BANNED',
        enabled: nextActive
      });
      showMessage('success', nextActive ? 'Đã mở khóa tài khoản (ACTIVE).' : 'Đã khóa tài khoản vi phạm (BANNED).');
    } else {
      showMessage('error', 'Lỗi khi cập nhật trạng thái tài khoản.');
    }
  };

  const handleResetStreak = async () => {
    setSaving(true);
    const ok = await adminService.resetUserStreak(user.id);
    setSaving(false);
    if (ok) {
      onUserUpdated({ ...user, currentStreak: 0 });
      showMessage('success', 'Đã reset chuỗi Streak của học viên về 0 ngày.');
    } else {
      showMessage('error', 'Lỗi khi reset chuỗi Streak.');
    }
  };

  const handleAdjustPoints = async (multiplier: 1 | -1) => {
    const rawNum = parseInt(pointsDelta, 10);
    if (isNaN(rawNum) || rawNum <= 0) {
      showMessage('error', 'Vui lòng nhập số Điểm Năng Động hợp lệ (> 0).');
      return;
    }
    const delta = rawNum * multiplier;
    setSaving(true);
    const newPoints = await adminService.adjustUserActivePoints(
      user.id,
      user.activePoints || 0,
      delta,
      antiCheatReason.trim() || (multiplier > 0 ? 'Admin cộng thưởng điểm' : 'Admin trừ điểm chống gian lận')
    );
    setSaving(false);
    if (newPoints !== null) {
      onUserUpdated({ ...user, activePoints: newPoints });
      setPointsDelta('');
      showMessage('success', `Đã điều chỉnh ${delta > 0 ? `+${delta}` : delta} AP. Điểm Năng Động mới: ${newPoints} AP.`);
    } else {
      showMessage('error', 'Lỗi khi điều chỉnh Điểm Năng Động.');
    }
  };

  const handleSoftDelete = async () => {
    setSaving(true);
    const ok = await adminService.softDeleteUser(user.id);
    setSaving(false);
    if (ok) {
      onUserDeleted(user.id);
      onClose();
    } else {
      showMessage('error', 'Không thể xóa người dùng.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 text-white flex items-center justify-center font-extrabold text-lg shrink-0 shadow-md shadow-emerald-600/20">
              {(user.fullName || user.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white truncate">
                  {user.fullName || user.username || 'Học viên'}
                </h3>
                <Badge variant="outline" className={role === 'ROLE_ADMIN' ? 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : 'border-slate-200 text-slate-600'}>
                  {role === 'ROLE_ADMIN' ? 'ROLE_ADMIN' : 'ROLE_USER'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user.email} • ID: <span className="font-mono">{user.id}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 gap-2 pt-2">
          {[
            { id: 'profile' as const, label: 'Hồ sơ & Phân quyền', icon: Shield },
            { id: 'anticheat' as const, label: 'Chống gian lận', icon: Flame },
            { id: 'dossier' as const, label: 'Hồ sơ Học tập (Dossier)', icon: BookOpen },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                  active
                    ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 dark:border-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* FEEDBACK BANNER */}
        {feedback && (
          <div className={`mx-6 mt-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback.message}</span>
          </div>
        )}

        {/* DRAWER BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: HỒ SƠ, RBAC & KHÓA TÀI KHOẢN */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase text-slate-400">Phân quyền RBAC</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">
                      {role === 'ROLE_ADMIN' ? 'Quản trị viên (Admin)' : 'Học viên (User)'}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={handleQuickToggleRole}
                    className="w-full justify-center text-xs font-bold cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 mr-1.5 text-red-500" />
                    {role === 'ROLE_ADMIN' ? 'Hạ xuống ROLE_USER' : 'Thăng cấp ROLE_ADMIN'}
                  </Button>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase text-slate-400">Trạng thái truy cập</div>
                    <div className={`text-sm font-bold mt-0.5 ${isBanned ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {isBanned ? 'Bị khóa (BANNED)' : 'Đang hoạt động (ACTIVE)'}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={handleQuickToggleStatus}
                    className={`w-full justify-center text-xs font-bold cursor-pointer ${
                      isBanned ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' : 'border-rose-300 text-rose-700 hover:bg-rose-50'
                    }`}
                  >
                    {isBanned ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Mở khóa tài khoản
                      </>
                    ) : (
                      <>
                        <Ban className="w-3.5 h-3.5 mr-1.5" /> Khóa tài khoản (Ban)
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Edit Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">Chỉnh sửa thông tin tài khoản</h4>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Họ và tên hiển thị</Label>
                  <Input
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Nhập họ và tên"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Địa chỉ Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Vai trò hệ thống</Label>
                    <select
                      value={role}
                      onChange={e => setRole(e.target.value as AdminRole)}
                      className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                    >
                      <option value="ROLE_USER">ROLE_USER (Học viên)</option>
                      <option value="ROLE_ADMIN">ROLE_ADMIN (Quản trị viên)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Cấp độ JLPT</Label>
                    <select
                      value={level}
                      onChange={e => setLevel(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                    >
                      <option value="Tân binh">Tân binh</option>
                      <option value="N5">JLPT N5</option>
                      <option value="N4">JLPT N4</option>
                      <option value="N3">JLPT N3</option>
                      <option value="N2">JLPT N2</option>
                      <option value="N1">JLPT N1</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-600/20 cursor-pointer">
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </Button>
                </div>
              </form>

              {/* Soft Delete Zone */}
              <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-rose-800 dark:text-rose-300">Xóa mềm người dùng (Soft Delete)</div>
                  <div className="text-xs text-rose-600/80 dark:text-rose-400">Đánh dấu `isDeleted = true` và thu hồi quyền đăng nhập mà không làm mất lịch sử hệ thống.</div>
                </div>
                {!confirmDelete ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmDelete(true)}
                    className="border-rose-300 text-rose-700 hover:bg-rose-100 shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" /> Xóa
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSoftDelete}
                      disabled={saving}
                      className="bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                    >
                      Xác nhận xóa
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmDelete(false)}
                      className="cursor-pointer"
                    >
                      Hủy
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CHỐNG GIAN LẬN (ANTI-CHEAT) */}
          {activeTab === 'anticheat' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20">
                  <div className="flex items-center gap-2 text-orange-600 text-xs font-bold uppercase">
                    <Flame className="w-4 h-4" /> Chuỗi Streak hiện tại
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                    {user.currentStreak || 0} <span className="text-sm font-semibold text-slate-500">ngày</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase">
                    <Zap className="w-4 h-4" /> Điểm Năng Động (AP)
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                    {(user.activePoints || 0).toLocaleString()} <span className="text-sm font-semibold text-slate-500">AP</span>
                  </div>
                </div>
              </div>

              {/* Reset Streak */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Can thiệp Chuỗi Streak (Chống đổi giờ thiết bị)
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Đặt lại chuỗi ngày học liên tiếp (`currentStreak`) về 0 trên cả hồ sơ cá nhân và bảng xếp hạng.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving || (user.currentStreak || 0) === 0}
                    onClick={handleResetStreak}
                    className="border-amber-300 text-amber-700 hover:bg-amber-50 shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reset Streak về 0
                  </Button>
                </div>
              </div>

              {/* Adjust Active Points */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                    Điều chỉnh Điểm Năng Động (Active Points)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Thưởng điểm khuyến khích hoặc trừ điểm ảo do spam bài tập trên Bảng Xếp Hạng.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Số điểm điều chỉnh (AP)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={pointsDelta}
                      onChange={e => setPointsDelta(e.target.value)}
                      placeholder="Ví dụ: 50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Lý do ghi nhận</Label>
                    <Input
                      value={antiCheatReason}
                      onChange={e => setAntiCheatReason(e.target.value)}
                      placeholder="VD: Hoàn điểm / Phạt spam..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <Button
                    type="button"
                    disabled={saving}
                    onClick={() => handleAdjustPoints(1)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  >
                    + Cộng Điểm Năng Động
                  </Button>
                  <Button
                    type="button"
                    disabled={saving}
                    onClick={() => handleAdjustPoints(-1)}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                  >
                    - Trừ Điểm Năng Động
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HỒ SƠ HỌC TẬP (STUDENT DOSSIER) */}
          {activeTab === 'dossier' && (
            <div className="space-y-5">
              {loadingDossier ? (
                <div className="py-12 text-center text-sm text-slate-500">Đang tải hồ sơ học tập từ Firestore...</div>
              ) : (
                <>
                  {/* Placement Test & AI Diagnosis Card (Stage 1 P0) */}
                  {(() => {
                    const effectiveUser = dossier?.user || user;
                    const pd = effectiveUser.placementDetails;
                    const ai = pd?.aiAssessment;

                    // Aggregate skill scores across levels
                    const skillAgg = new Map<string, { correct: number; total: number }>();
                    if (Array.isArray(pd?.skillBreakdown)) {
                      pd.skillBreakdown.forEach(lvl => {
                        (lvl.skills || []).forEach(sk => {
                          const cur = skillAgg.get(sk.category) || { correct: 0, total: 0 };
                          cur.correct += Number(sk.correct || 0);
                          cur.total += Number(sk.total || 0);
                          skillAgg.set(sk.category, cur);
                        });
                      });
                    }
                    const skillRows = [...skillAgg.entries()].map(([category, val]) => {
                      const pct = val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0;
                      return {
                        category,
                        label: SKILL_LABELS[category] || category,
                        correct: val.correct,
                        total: val.total,
                        pct,
                        isWeak: pct < 60
                      };
                    }).sort((a, b) => a.pct - b.pct);

                    const weakSkills = skillRows.filter(s => s.isWeak);
                    const confInfo = ai?.confidence ? CONFIDENCE_STYLES[ai.confidence] : null;

                    return (
                      <div className="p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/50 via-white to-emerald-50/30 dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900 space-y-3.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-extrabold uppercase text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                            <Bot className="w-4 h-4 text-indigo-600" /> Kết quả Chẩn đoán AI Placement
                          </span>
                          <Badge variant="outline" className={effectiveUser.placementVerified || pd ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300' : ''}>
                            {pd
                              ? `Đã thẩm định (${pd.percentage ?? effectiveUser.placementScore ?? 0}%)`
                              : effectiveUser.placementVerified
                              ? `Đã thẩm định (${effectiveUser.placementScore || 0}%)`
                              : 'Chưa làm bài test'}
                          </Badge>
                        </div>

                        {/* Top KPIs */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="text-[11px] text-slate-400">Trình độ xếp lớp</div>
                            <div className="text-base font-extrabold text-slate-800 dark:text-white">
                              {pd?.assignedLevel || effectiveUser.level || 'Tân binh'}
                            </div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="text-[11px] text-slate-400">Điểm trắc nghiệm</div>
                            <div className="text-base font-extrabold text-emerald-600">
                              {pd?.answeredCount ? `${pd.correctCount}/${pd.answeredCount} (${pd.percentage}%)` : `${effectiveUser.placementScore ?? 0}%`}
                            </div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="text-[11px] text-slate-400">Tổng kinh nghiệm</div>
                            <div className="text-base font-extrabold text-slate-800 dark:text-white">
                              {(effectiveUser.totalXp || 0).toLocaleString()} XP
                            </div>
                          </div>
                        </div>

                        {/* AI Recommended Milestone & Confidence */}
                        {pd ? (
                          <>
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 space-y-2">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="text-[11px] font-bold uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {ai ? 'Cột mốc Gemini AI đề xuất xuất phát' : 'Cột mốc xuất phát theo bài test'}
                                </div>
                                {confInfo && (
                                  <Badge variant="outline" className={`text-[10px] ${confInfo.cls}`}>
                                    {confInfo.label}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                                {pd.recommendedMilestoneTitle || pd.recommendedMilestoneId || 'Mốc 1 nhập môn'}
                              </div>
                              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                                <span>Chặng: <strong className="text-slate-700 dark:text-slate-300">{pd.recommendedStageTitle || pd.recommendedStageId || 'N5'}</strong></span>
                                {pd.recommendedMilestoneId && (
                                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                                    {pd.recommendedMilestoneId}
                                  </span>
                                )}
                              </div>
                              {ai && (
                                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
                                  <span>Model: <strong className="font-mono text-slate-600 dark:text-slate-300">{ai.model}</strong></span>
                                  <span>•</span>
                                  <span>Latency: <strong className="text-indigo-600">{ai.latencyMs} ms</strong></span>
                                  {pd.questionSetId && (
                                    <>
                                      <span>•</span>
                                      <span>Bộ đề #{String(pd.questionSetId).padStart(2, '0')}</span>
                                    </>
                                  )}
                                  {pd.testedAt && (
                                    <>
                                      <span>•</span>
                                      <span>{new Date(pd.testedAt).toLocaleString('vi-VN')}</span>
                                    </>
                                  )}
                                </div>
                              )}
                              {Array.isArray(pd.passedLevels) && pd.passedLevels.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                  <span className="text-[11px] text-slate-400">Đã vượt tầng:</span>
                                  {pd.passedLevels.map(lvl => (
                                    <span key={lvl} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      {lvl}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Per-skill weakness analysis */}
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1">
                                  <Target className="w-3.5 h-3.5 text-rose-500" /> Phân tích Điểm mạnh / Điểm yếu theo kỹ năng
                                </span>
                                {weakSkills.length > 0 && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                    Yếu: {weakSkills.map(w => w.label).join(', ')}
                                  </span>
                                )}
                              </div>

                              {skillRows.length > 0 ? (
                                <div className="space-y-2">
                                  {skillRows.map(sk => (
                                    <div key={sk.category} className="space-y-1">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                          {sk.label}
                                          {sk.isWeak && (
                                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 rounded">Cần cải thiện</span>
                                          )}
                                        </span>
                                        <span className={`font-extrabold ${sk.isWeak ? 'text-rose-600' : sk.pct >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                          {sk.correct}/{sk.total} ({sk.pct}%)
                                        </span>
                                      </div>
                                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                        <div
                                          style={{ width: `${Math.max(4, sk.pct)}%` }}
                                          className={`h-full rounded-full ${
                                            sk.isWeak ? 'bg-rose-500' : sk.pct >= 75 ? 'bg-emerald-500' : 'bg-amber-500'
                                          }`}
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-400">
                                  Bản ghi xếp lớp này thực hiện trước khi bật chi tiết từng kỹ năng (hoặc học viên chọn nhập môn từ đầu không qua trắc nghiệm).
                                </p>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500 text-center">
                            Học viên chưa hoàn thành bài kiểm tra chẩn đoán AI Placement.
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Roadmap Progress */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">Tiến độ Bản đồ Hành trình (`user_progress`)</h4>
                    {dossier?.progress ? (
                      <div className="space-y-2 text-xs sm:text-sm">
                        <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                          <span className="text-slate-500">Chặng đang học:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {dossier.progress.currentStageTitle || dossier.progress.currentStageId || 'Chặng 1'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                          <span className="text-slate-500">Vùng bản đồ đã mở khóa:</span>
                          <span className="font-bold text-emerald-600">
                            {(dossier.progress.unlockedRegions || ['region_n5']).join(', ')}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500">Cập nhật lần cuối:</span>
                          <span className="text-slate-600 dark:text-slate-400">
                            {dossier.progress.lastStudiedAt ? new Date(dossier.progress.lastStudiedAt).toLocaleString('vi-VN') : 'N/A'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 py-2">
                        Học viên chưa có bản ghi tiến độ riêng trong `user_progress` (đang ở Chặng 1 mặc định).
                      </p>
                    )}
                  </div>

                  {/* SRS Queue */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-orange-500" /> Hàng đợi Ôn tập Ngắt quãng SM-2 (`user_srs_items`)
                      </h4>
                      <Badge variant="secondary">{dossier?.srsItems.length || 0} thẻ</Badge>
                    </div>

                    {dossier && dossier.srsItems.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {dossier.srsItems.map(item => (
                          <div key={item.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-slate-800 dark:text-white text-sm mr-2">
                                {item.term || item.itemId || item.id}
                              </span>
                              {item.reading && <span className="text-slate-500 mr-2">({item.reading})</span>}
                              <span className="text-slate-600 dark:text-slate-300">{item.meaning || ''}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-bold">
                                Chu kỳ: {item.intervalDays ?? 1} ngày
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 py-2">
                        Hiện chưa có thẻ từ vựng/Kanji nào trong hàng đợi ôn tập SM-2 của học viên này.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
