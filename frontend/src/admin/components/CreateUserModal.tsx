import React, { useState } from 'react';
import { AdminRole, AdminUser } from '../types/adminTypes';
import { adminService } from '../services/adminService';
import { Button } from '@/admin/components/ui/button';
import { Input } from '@/admin/components/ui/input';
import { Label } from '@/admin/components/ui/label';
import { X, UserPlus, AlertCircle } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: (newUser: AdminUser) => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onUserCreated
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Kizuna@2026');
  const [role, setRole] = useState<AdminRole>('ROLE_USER');
  const [level, setLevel] = useState('Tân binh');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError('Vui lòng nhập đầy đủ họ tên và email.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await adminService.createUser({
        fullName,
        email,
        password,
        role,
        level
      });
      onUserCreated(created);
      setFullName('');
      setEmail('');
      setPassword('Kizuna@2026');
      setRole('ROLE_USER');
      setLevel('Tân binh');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Không thể tạo người dùng mới.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Thêm người dùng mới</h3>
              <p className="text-xs text-slate-500">Tạo trực tiếp trên Firestore `users`</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Họ và tên</Label>
            <Input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn A"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Địa chỉ Email</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="hocvien@kizuna.com"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Mật khẩu khởi tạo</Label>
            <Input
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Phân quyền (Role)</Label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as AdminRole)}
                className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
              >
                <option value="ROLE_USER">ROLE_USER</option>
                <option value="ROLE_ADMIN">ROLE_ADMIN</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Trình độ ban đầu</Label>
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

          <div className="pt-3 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              Hủy
            </Button>
            <Button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-700 text-white cursor-pointer">
              {saving ? 'Đang tạo...' : 'Tạo tài khoản'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
