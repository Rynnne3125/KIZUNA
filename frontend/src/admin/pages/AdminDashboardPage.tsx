import React, { useState, useEffect } from 'react';
import { AdminForbidden403 } from '../exception/AdminForbidden403';
import { useAdminData } from '../hooks/useAdminData';
import { motion, AnimatePresence } from 'framer-motion';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/admin/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/admin/components/ui/table';
import { Badge } from '@/admin/components/ui/badge';
import { Button } from '@/admin/components/ui/button';
import { Input } from '@/admin/components/ui/input';
import { 
  Users, Bot, LayoutDashboard, Search, LogOut, Settings, 
  Database, ShieldAlert, Menu, Bell, Filter, Moon, Sun, 
  TrendingUp, Activity, CheckCircle, XCircle, BookOpen, 
  GraduationCap, FileText, Layers, Map
} from 'lucide-react';
import { DonutChart, BarList, AreaChart } from '@tremor/react';
import { rankingService } from '@/user/services/rankingService';
import { RankTier, UserLeaderboardItem } from '@/user/types/ranking';

export interface AdminDashboardPageProps {
  user: { fullName?: string; username?: string; role?: string } | null;
  onGoHome: () => void;
  onLogout?: () => void;
}

const chartData = [
  { date: 'T2', 'Người dùng HĐ': 120, 'Đăng ký mới': 15 },
  { date: 'T3', 'Người dùng HĐ': 132, 'Đăng ký mới': 20 },
  { date: 'T4', 'Người dùng HĐ': 180, 'Đăng ký mới': 45 },
  { date: 'T5', 'Người dùng HĐ': 195, 'Đăng ký mới': 30 },
  { date: 'T6', 'Người dùng HĐ': 240, 'Đăng ký mới': 65 },
  { date: 'T7', 'Người dùng HĐ': 210, 'Đăng ký mới': 50 },
  { date: 'CN', 'Người dùng HĐ': 280, 'Đăng ký mới': 80 },
];

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  user,
  onGoHome,
  onLogout
}) => {
  const { 
    stats, users, audits, stages, milestones, vocabulary, grammar, kanji, exams, loading 
  } = useAdminData();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Ranking System States & Handlers
  const [rankTiers, setRankTiers] = useState<RankTier[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserLeaderboardItem[]>([]);
  const [savingTiers, setSavingTiers] = useState(false);
  const [rankSaveMsg, setRankSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadRankingData() {
      const tiers = await rankingService.getRankTiers();
      setRankTiers(tiers);
      const lb = await rankingService.getLearnerLeaderboard(tiers);
      setLeaderboard(lb);
    }
    loadRankingData();
  }, []);

  const handleTierChange = (index: number, field: keyof RankTier, value: any) => {
    setRankTiers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddTier = () => {
    const nextMin = rankTiers.length > 0 ? Math.max(...rankTiers.map(t => t.minPoints)) + 500 : 0;
    const newTier: RankTier = {
      id: `tier_${Date.now()}`,
      name: `Bậc mới ${rankTiers.length + 1}`,
      minPoints: nextMin,
      badge: '⭐',
      color: '#059669',
      description: 'Mô tả năng lực chuẩn giao tiếp...'
    };
    setRankTiers(prev => [...prev, newTier]);
  };

  const handleDeleteTier = (index: number) => {
    if (rankTiers.length <= 1) return;
    setRankTiers(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveTiers = async () => {
    setSavingTiers(true);
    setRankSaveMsg(null);
    try {
      const ok = await rankingService.saveRankTiers(rankTiers);
      if (ok) {
        setRankSaveMsg('Đã lưu cấu hình mốc điểm xếp hạng lên Firestore thành công!');
        const lb = await rankingService.getLearnerLeaderboard(rankTiers);
        setLeaderboard(lb);
      } else {
        setRankSaveMsg('Không thể lưu mốc rank. Vui lòng thử lại.');
      }
    } catch {
      setRankSaveMsg('Lỗi khi lưu lên Firestore.');
    } finally {
      setSavingTiers(false);
      setTimeout(() => setRankSaveMsg(null), 4000);
    }
  };

  if (!user || user.role !== 'ROLE_ADMIN') {
    return (
      <AdminForbidden403
        userRole={user?.role}
        userName={user?.fullName || user?.username}
        onGoHome={onGoHome}
        onLogout={onLogout}
      />
    );
  }

  const roleDistribution = [
    { name: 'Quản trị viên', value: stats?.totalAdmins || 0, color: 'red-500' },
    { name: 'Học viên', value: stats?.totalLearners || 0, color: 'orange-500' },
  ];

  const contentStats = [
    { name: 'Đề thi', value: exams.length },
    { name: 'Chặng học', value: stages.length },
    { name: 'Cột mốc', value: milestones.length },
    { name: 'Từ vựng', value: vocabulary.length },
    { name: 'Ngữ pháp', value: grammar.length },
    { name: 'Kanji', value: kanji.length },
  ];

  const filteredUsers = users.filter(u => 
    (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const BentoBox = ({ children, className = '', colSpan = 'col-span-12', delay = 0 }: { children: React.ReactNode, className?: string, colSpan?: string, delay?: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5, scale: 1.01 }}
      className={`${colSpan} relative rounded-3xl overflow-hidden p-[1px] bg-gradient-to-br from-white/40 to-white/5 dark:from-white/10 dark:to-white/5`}
      style={{ backdropFilter: 'blur(16px)' }}
    >
      <div className={`h-full w-full rounded-[23px] bg-white/70 dark:bg-slate-900/70 shadow-xl dark:shadow-2xl flex flex-col p-6 ${className}`}>
        {children}
      </div>
    </motion.div>
  );

  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-12">
      <BentoBox colSpan="md:col-span-8" className="bg-gradient-to-br from-red-500/10 to-transparent dark:from-red-900/20 justify-center">
        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">
          Chào mừng trở lại, {user.fullName}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
          Bảng điều khiển của bạn hôm nay trông rất tuyệt. Hoạt động hệ thống tăng 12%, và có {stats?.pendingAiAudits || 0} bài kiểm tra AI đang chờ đánh giá.
        </p>
        <div className="mt-6 flex gap-4">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setActiveMenu('audits')} className="bg-red-600 text-white px-6 py-2.5 rounded-full font-semibold shadow-lg shadow-red-500/30 hover:bg-red-700 transition-colors">
            Xem bài kiểm tra
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-6 py-2.5 rounded-full font-semibold shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Xem báo cáo
          </motion.button>
        </div>
      </BentoBox>

      <BentoBox colSpan="md:col-span-4" delay={0.1}>
        <div className="flex justify-between items-start mb-6">
          <div className="p-3 bg-red-100 dark:bg-red-500/20 rounded-2xl text-red-600 dark:text-red-400">
            <Users className="w-6 h-6" />
          </div>
          <Badge variant="outline" className="text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-800">
            <TrendingUp className="w-3 h-3 mr-1" /> +12%
          </Badge>
        </div>
        <div className="mt-auto">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Tổng thành viên</p>
          <h3 className="text-5xl font-black text-slate-800 dark:text-white">
            {((stats?.totalLearners || 0) + (stats?.totalAdmins || 0)).toLocaleString()}
          </h3>
        </div>
      </BentoBox>

      <BentoBox colSpan="md:col-span-8" className="h-[400px]" delay={0.2}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Hoạt động nền tảng</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Số người dùng hoạt động & đăng ký mới hàng ngày</p>
          </div>
          <Activity className="w-5 h-5 text-red-500" />
        </div>
        <div className="flex-1 w-full relative">
          <AreaChart
            data={chartData}
            index="date"
            categories={['Người dùng HĐ', 'Đăng ký mới']}
            colors={['red', 'amber']}
            valueFormatter={(num) => num.toString()}
            showLegend={true}
            showGridLines={false}
            showAnimation={true}
            animationDuration={1500}
            curveType="monotone"
            className="h-full w-full"
          />
        </div>
      </BentoBox>

      <div className="col-span-12 md:col-span-4 flex flex-col gap-6">
        <BentoBox className="flex-1" delay={0.3}>
          <div className="flex justify-between items-start">
            <div className="p-3 bg-orange-100 dark:bg-orange-500/20 rounded-2xl text-orange-600 dark:text-orange-400">
              <Database className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-auto pt-6">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Dữ liệu học tập</p>
            <h3 className="text-4xl font-black text-slate-800 dark:text-white">
              {stages.length + milestones.length}
            </h3>
          </div>
        </BentoBox>

        <BentoBox className="flex-1" delay={0.4}>
          <div className="flex justify-between items-start">
            <div className="p-3 bg-rose-100 dark:bg-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400">
              <Bot className="w-6 h-6" />
            </div>
            {stats?.pendingAiAudits && stats.pendingAiAudits > 0 ? (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
            ) : null}
          </div>
          <div className="mt-auto pt-6">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Chờ duyệt AI</p>
            <h3 className="text-4xl font-black text-slate-800 dark:text-white">
              {stats?.pendingAiAudits || 0}
            </h3>
          </div>
        </BentoBox>
      </div>

      <BentoBox colSpan="md:col-span-5" delay={0.5}>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Thành phần người dùng</h3>
        <div className="flex-1 flex items-center justify-center">
          <DonutChart data={roleDistribution} category="value" index="name" colors={['red', 'orange']} className="w-48 h-48" showAnimation={true} animationDuration={1000} />
        </div>
      </BentoBox>

      <BentoBox colSpan="md:col-span-7" delay={0.6}>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Phân bố nội dung</h3>
        <BarList data={contentStats} className="mt-4" color="red" />
      </BentoBox>
    </div>
  );

  const renderUsers = () => (
    <BentoBox colSpan="col-span-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Quản lý người dùng</h2>
          <p className="text-slate-500 dark:text-slate-400">Quản lý danh sách người dùng, phân quyền và trạng thái.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input placeholder="Tìm kiếm người dùng..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 w-full sm:w-[280px] bg-slate-50 dark:bg-slate-800 border-transparent rounded-xl" />
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
            <TableRow className="border-slate-100 dark:border-slate-800">
              <TableHead className="py-4 pl-6 text-slate-500 dark:text-slate-400">Hồ sơ người dùng</TableHead>
              <TableHead className="text-slate-500 dark:text-slate-400">Vai trò</TableHead>
              <TableHead className="text-slate-500 dark:text-slate-400">Kinh nghiệm</TableHead>
              <TableHead className="text-slate-500 dark:text-slate-400">Trạng thái</TableHead>
              <TableHead className="text-right pr-6 text-slate-500 dark:text-slate-400">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {filteredUsers.map((u) => (
                <motion.tr key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <TableCell className="py-4 pl-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-rose-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-500/20">
                        {u.fullName ? u.fullName.charAt(0) : 'U'}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{u.fullName || 'Người dùng ẩn danh'}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{u.email || 'Không có email'}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={u.role === 'ROLE_ADMIN' ? 'border-red-200 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 dark:border-red-900' : 'border-slate-200 bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}>
                      {u.role === 'ROLE_ADMIN' ? 'Admin' : 'Học viên'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900 dark:text-white">{u.level || 'N/A'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{u.totalXp || 0} XP</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${u.status === 'ACTIVE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-rose-500'}`}></span>
                      <span className={`text-sm font-medium ${u.status === 'ACTIVE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {u.status === 'ACTIVE' ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <motion.button whileTap={{ scale: 0.9 }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                      <Settings className="w-4 h-4" />
                    </motion.button>
                  </TableCell>
                </motion.tr>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Không tìm thấy người dùng nào
                  </TableCell>
                </TableRow>
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>
    </BentoBox>
  );

  const renderAudits = () => (
    <div className="grid grid-cols-1 gap-6">
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Kiểm duyệt AI</h2>
        <p className="text-slate-500 dark:text-slate-400">Đánh giá các bài nộp của học viên bị AI chấm điểm thấp hoặc có khiếu nại.</p>
      </div>
      {audits.length === 0 ? (
         <BentoBox>
           <p className="text-center py-8 text-slate-500">Không có bài nào cần kiểm duyệt.</p>
         </BentoBox>
      ) : audits.map((audit, index) => (
        <BentoBox key={audit.id} delay={index * 0.1}>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-500/20 rounded-2xl text-red-600 dark:text-red-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">{audit.milestoneTitle}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Học viên: <span className="font-semibold text-slate-700 dark:text-slate-300">@{audit.username}</span> • {audit.submittedAt}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 px-5 py-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">Điểm AI</div>
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">{audit.aiScore}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="space-y-4">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Bài làm của học viên</div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                  "{audit.userSubmission}"
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Lý do của AI</div>
                <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {audit.aiFeedback}
                </div>
              </div>
              {audit.studentAppealReason && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                  <div className="text-[11px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-2">Ghi chú khiếu nại</div>
                  <div className="text-sm text-amber-900 dark:text-amber-200">
                    {audit.studentAppealReason}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-4">
            <motion.button whileTap={{ scale: 0.95 }} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2">
              <XCircle className="w-4 h-4" /> Từ chối
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 text-white font-semibold shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Phê duyệt
            </motion.button>
          </div>
        </BentoBox>
      ))}
    </div>
    );
  };

  const renderRanking = () => {
    return (
      <div className="space-y-6 pb-12">
        {/* Header alert / notification */}
        {rankSaveMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-sm">{rankSaveMsg}</span>
            </div>
            <button onClick={() => setRankSaveMsg(null)} className="text-xs underline text-emerald-700 cursor-pointer">Đóng</button>
          </motion.div>
        )}

        {/* Section 1: Cấu hình mốc rank */}
        <BentoBox colSpan="col-span-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2.5">
                <Trophy className="w-6 h-6 text-amber-500" />
                <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                  Cấu Hình Mốc Điểm Bảng Xếp Hạng (Rank Tiers)
                </h3>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
                Admin tùy chỉnh tên bậc, mốc Điểm Năng Động (Active Points) tối thiểu và mô tả. Lưu trực tiếp lên Firestore.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleAddTier}
                className="rounded-xl border-dashed border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Thêm Bậc
              </Button>
              <Button
                onClick={handleSaveTiers}
                disabled={savingTiers}
                className="rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold shadow-md shadow-red-500/20 cursor-pointer"
              >
                <Save className="w-4 h-4 mr-1.5" /> {savingTiers ? 'Đang lưu Firestore...' : 'Lưu Cấu Hình Mốc Rank'}
              </Button>
            </div>
          </div>

          {/* List of tiers editable */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rankTiers.map((tier, idx) => (
              <div 
                key={tier.id || idx}
                className="bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{tier.badge || '🌱'}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cấp {idx + 1}</span>
                  </div>
                  {rankTiers.length > 1 && (
                    <button
                      onClick={() => handleDeleteTier(idx)}
                      title="Xóa bậc rank này"
                      className="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Tên Bậc Rank</label>
                  <Input
                    value={tier.name}
                    onChange={e => handleTierChange(idx, 'name', e.target.value)}
                    placeholder="VD: Tân binh"
                    className="h-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-semibold text-sm rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Điểm tối thiểu</label>
                    <Input
                      type="number"
                      min={0}
                      value={tier.minPoints}
                      onChange={e => handleTierChange(idx, 'minPoints', parseInt(e.target.value) || 0)}
                      className="h-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-bold text-sm rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Biểu tượng / Icon</label>
                    <Input
                      value={tier.badge}
                      onChange={e => handleTierChange(idx, 'badge', e.target.value)}
                      className="h-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm rounded-xl text-center"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Mô tả năng lực</label>
                  <Input
                    value={tier.description}
                    onChange={e => handleTierChange(idx, 'description', e.target.value)}
                    placeholder="Mô tả mục tiêu năng lực..."
                    className="h-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs rounded-xl"
                  />
                </div>
              </div>
            ))}
          </div>
        </BentoBox>

        {/* Section 2: Bảng Xếp Hạng Học Viên Thực Tế (Live Preview - Only role user) */}
        <BentoBox colSpan="col-span-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>Bảng Xếp Hạng Học Viên Thực Tế (Từ Firestore)</span>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                  {leaderboard.length} Học Viên
                </Badge>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Chỉ người dùng role học viên (ROLE_USER) mới được tham gia xếp hạng. Tài khoản Admin đã được lọc bỏ.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200 dark:border-slate-800">
                  <TableHead className="w-16 font-bold text-xs uppercase">Hạng</TableHead>
                  <TableHead className="font-bold text-xs uppercase">Học Viên</TableHead>
                  <TableHead className="font-bold text-xs uppercase">Bậc Xếp Hạng</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-right">Điểm Năng Động</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-right">Streak</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-right">Kinh Nghiệm</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                      Chưa có học viên nào trong hệ thống.
                    </TableCell>
                  </TableRow>
                ) : (
                  leaderboard.map(item => (
                    <TableRow key={item.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <TableCell className="font-black text-slate-700 dark:text-slate-300">
                        {item.position === 1 && <span className="text-xl">🥇</span>}
                        {item.position === 2 && <span className="text-xl">🥈</span>}
                        {item.position === 3 && <span className="text-xl">🥉</span>}
                        {item.position > 3 && <span className="text-slate-500 font-mono">#{item.position}</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img
                            src={item.avatarUrl}
                            alt={item.fullName}
                            className="w-9 h-9 rounded-xl object-cover bg-emerald-50 border border-emerald-200"
                          />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{item.fullName}</div>
                            <div className="text-xs text-slate-400">@{item.username} • {item.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          <span>{item.rankTier.badge}</span>
                          <span>{item.rankTier.name}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        ⭐ {item.activePoints.toLocaleString()} pts
                      </TableCell>
                      <TableCell className="text-right text-xs text-slate-600 dark:text-slate-300 font-bold">
                        🔥 {item.currentStreak} ngày
                      </TableCell>
                      <TableCell className="text-right text-xs text-slate-500 font-mono">
                        {item.totalXp.toLocaleString()} XP
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </BentoBox>
      </div>
    );
  };

  const renderStages = () => (
    <BentoBox colSpan="col-span-12">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Quản lý Chặng học (Stages)</h2>
        <p className="text-slate-500 dark:text-slate-400">Quản lý lộ trình học tổng thể, màu sắc và thứ tự (Tổng: {stages.length})</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stages.map((stage, idx) => {
          const colors = stage.colorGradient || ['#cbd5e1', '#94a3b8'];
          return (
            <motion.div key={stage.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition">
              <div className="h-2 w-full" style={{ background: `linear-gradient(to right, ${colors[0]}, ${colors[1] || colors[0]})` }}></div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">{stage.title || `Chặng ${stage.order_index || stage.orderIndex}`}</h3>
                  <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    Thứ tự: {stage.order_index || stage.orderIndex || 0}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">{stage.description || 'Chưa có mô tả'}</p>
                <div className="flex gap-2">
                  <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">ID: {stage.id}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">Chỉnh sửa</Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </BentoBox>
  );

  const renderMilestones = () => (
    <BentoBox colSpan="col-span-12">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Quản lý Cột mốc (Milestones)</h2>
        <p className="text-slate-500 dark:text-slate-400">Các bài học và thử thách cụ thể trong từng chặng (Tổng: {milestones.length})</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
            <TableRow>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Chặng / Ngữ cảnh</TableHead>
              <TableHead>Phần thưởng (XP)</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {milestones.map((m, idx) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium text-slate-800 dark:text-white">
                  <div>{m.title || `Cột mốc ${m.order_index || m.orderIndex}`}</div>
                  <div className="text-xs text-slate-400 font-normal">ID: {m.id}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-slate-600 dark:text-slate-300">{m.stage_id || m.stageId}</div>
                  <div className="text-xs text-slate-400">{m.communicationContext || 'N/A'}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-orange-200 text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400">{m.xpReward || 0} XP</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500"><Settings className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </BentoBox>
  );

  const renderVocabulary = () => (
    <BentoBox colSpan="col-span-12">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Kho Từ vựng</h2>
          <p className="text-slate-500 dark:text-slate-400">Quản lý từ vựng, kanji, nghĩa tiếng Việt (Tổng: {vocabulary.length})</p>
        </div>
        <Button className="bg-red-500 hover:bg-red-600 text-white">Thêm từ mới</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
            <TableRow>
              <TableHead>Từ (Kanji)</TableHead>
              <TableHead>Cách đọc (Kana)</TableHead>
              <TableHead>Nghĩa Tiếng Việt</TableHead>
              <TableHead>Loại từ</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vocabulary.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-bold text-lg text-slate-800 dark:text-white">{v.term || v.kanji}</TableCell>
                <TableCell className="text-slate-600 dark:text-slate-300">{v.reading || v.kana}</TableCell>
                <TableCell className="text-slate-600 dark:text-slate-300">{v.vietnameseMeaning || v.meaning}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">{v.wordType || 'N/A'}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500"><Settings className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </BentoBox>
  );

  const renderGrammar = () => (
    <BentoBox colSpan="col-span-12">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Ngữ pháp</h2>
          <p className="text-slate-500 dark:text-slate-400">Quản lý cấu trúc ngữ pháp (Tổng: {grammar.length})</p>
        </div>
        <Button className="bg-red-500 hover:bg-red-600 text-white">Thêm ngữ pháp</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
            <TableRow>
              <TableHead>Mẫu câu</TableHead>
              <TableHead>Ý nghĩa</TableHead>
              <TableHead>Cấp độ</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grammar.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-bold text-slate-800 dark:text-white">{g.pattern || g.title}</TableCell>
                <TableCell className="text-slate-600 dark:text-slate-300 max-w-xs truncate">{g.titleVi || g.meaning || g.explanation}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-purple-200 text-purple-600 bg-purple-50 dark:bg-purple-500/10 dark:text-purple-400">{g.level || 'N/A'}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500"><Settings className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </BentoBox>
  );

  const renderExams = () => (
    <BentoBox colSpan="col-span-12">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Đề thi JLPT</h2>
          <p className="text-slate-500 dark:text-slate-400">Quản lý kho đề thi (Tổng: {exams.length})</p>
        </div>
        <Button className="bg-red-500 hover:bg-red-600 text-white">Upload Đề thi</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
            <TableRow>
              <TableHead>Tên đề thi</TableHead>
              <TableHead>Cấp độ</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Số câu hỏi</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exams.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-bold text-slate-800 dark:text-white">{e.label || e.title || e.id}</TableCell>
                <TableCell>
                  <Badge className="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 border border-red-200 dark:border-red-800">{e.level || 'N/A'}</Badge>
                </TableCell>
                <TableCell className="text-slate-600 dark:text-slate-300">{e.durationMinutes ? `${e.durationMinutes} phút` : 'N/A'}</TableCell>
                <TableCell className="text-slate-600 dark:text-slate-300">{e.totalQuestions || e.questionCount || 0} câu</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-500 mr-2">Chi tiết</Button>
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500"><Settings className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </BentoBox>
  );

  const renderKanji = () => (
    <BentoBox colSpan="col-span-12">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Từ điển Kanji</h2>
          <p className="text-slate-500 dark:text-slate-400">Quản lý Hán tự (Tổng: {kanji.length})</p>
        </div>
        <Button className="bg-red-500 hover:bg-red-600 text-white">Thêm Kanji</Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {kanji.map((k) => (
          <motion.div key={k.id} whileHover={{ y: -5 }} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
            <div className="text-4xl font-serif text-slate-800 dark:text-white mb-2">{k.kanji || k.id}</div>
            <div className="text-sm font-bold text-red-500 mb-1">{k.sinoVietnamese || k.hanviet || 'N/A'}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{k.vietnameseMeaning || k.meaning || 'N/A'}</div>
          </motion.div>
        ))}
      </div>
    </BentoBox>
  );

  const menuItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Tổng quan' },
    { id: 'users', icon: Users, label: 'Người dùng' },
    { id: 'audits', icon: Bot, label: 'Kiểm duyệt AI' },
    { id: 'stages', icon: Map, label: 'Chặng học' },
    { id: 'milestones', icon: Layers, label: 'Cột mốc' },
    { id: 'vocabulary', icon: BookOpen, label: 'Từ vựng' },
    { id: 'grammar', icon: FileText, label: 'Ngữ pháp' },
    { id: 'kanji', icon: FileText, label: 'Kanji' },
    { id: 'exams', icon: GraduationCap, label: 'Đề thi JLPT' },
  ];

  return (
    <div className={`flex h-screen w-full overflow-hidden font-sans transition-colors duration-300 ${isDark ? 'dark bg-slate-950' : 'bg-[#f8fafc]'}`}>
      
      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-red-400/10 dark:bg-red-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-orange-400/10 dark:bg-orange-900/20 blur-[120px]" />
      </div>

      {/* SIDEBAR */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 88 }}
        className="h-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 flex flex-col relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
      >
        <div className="h-20 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-red-500/30">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="font-extrabold text-xl text-slate-800 dark:text-white whitespace-nowrap tracking-tight">
                  KIZUNA OS
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex-1 py-8 px-4 space-y-3 overflow-y-auto">
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-3 text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                Menu Chính
              </motion.div>
            )}
          </AnimatePresence>

          {menuItems.map(item => {
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center h-12 px-4 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                  isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {isActive && (
                  <motion.div layoutId="activeMenu" className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-500 rounded-xl" />
                )}
                <item.icon className={`w-5 h-5 shrink-0 relative z-10 transition-transform duration-300 ${isActive ? '' : 'group-hover:scale-110'}`} />
                <AnimatePresence>
                  {isSidebarOpen && (
                    <motion.span initial={{ opacity: 0, w: 0 }} animate={{ opacity: 1, w: 'auto' }} exit={{ opacity: 0, w: 0 }} className="ml-4 font-semibold text-sm whitespace-nowrap relative z-10">
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            )
          })}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <button 
            onClick={onGoHome}
            title="Chuyển sang giao diện Học viên"
            className="w-full flex items-center h-11 px-3.5 rounded-xl text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors group cursor-pointer"
          >
            <Home className="w-5 h-5 shrink-0" />
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ml-4 font-semibold text-sm whitespace-nowrap">
                  Trở lại
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {onLogout && (
            <button 
              onClick={onLogout}
              title="Đăng xuất khỏi hệ thống"
              className="w-full flex items-center h-11 px-3.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors group cursor-pointer"
            >
              <LogOut className="w-5 h-5 shrink-0 group-hover:-translate-x-1 transition-transform" />
              <AnimatePresence>
                {isSidebarOpen && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ml-3 font-semibold text-xs whitespace-nowrap">
                    Đăng xuất
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )}
        </div>
      </motion.aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 z-10 relative">
        
        {/* TOP HEADER */}
        <header className="h-20 bg-transparent flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-10 h-10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 shadow-sm transition-colors">
              <Menu className="w-5 h-5" />
            </motion.button>
            <AnimatePresence mode="wait">
              <motion.h1 key={activeMenu} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="text-2xl font-black text-slate-800 dark:text-white capitalize hidden sm:block tracking-tight">
                {menuItems.find(m => m.id === activeMenu)?.label}
              </motion.h1>
            </AnimatePresence>
          </div>
          
          <div className="flex items-center gap-4">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsDark(!isDark)} className="w-10 h-10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 shadow-sm transition-colors">
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </motion.button>

            <motion.button whileTap={{ scale: 0.9 }} className="w-10 h-10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 shadow-sm transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
            </motion.button>

            <div className="flex items-center gap-3 pl-4 ml-2 border-l border-slate-200 dark:border-slate-800">
              <div className="text-right hidden md:block">
                <div className="text-sm font-bold text-slate-800 dark:text-white">{user.fullName || user.username || 'Admin'}</div>
                <div className="text-xs font-medium text-red-500">{user.role}</div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white flex items-center justify-center font-bold shadow-lg shadow-red-500/20 border-2 border-white dark:border-slate-800 cursor-pointer">
                {(user.fullName || user.username || 'A').charAt(0).toUpperCase()}
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Đăng xuất khỏi hệ thống"
                  className="w-10 h-10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 shadow-sm transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* SCROLLABLE PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 pb-12">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-10 h-10 border-4 border-slate-200 dark:border-slate-800 border-t-red-500 rounded-full" />
            </div>
          ) : (
            <div className="max-w-7xl mx-auto">
              <AnimatePresence mode="wait">
                <motion.div key={activeMenu} initial={{ opacity: 0, filter: 'blur(10px)', scale: 0.98 }} animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }} exit={{ opacity: 0, filter: 'blur(10px)', scale: 0.98 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
                  {activeMenu === 'overview' && renderOverview()}
                  {activeMenu === 'users' && renderUsers()}
                  {activeMenu === 'ranking' && renderRanking()}
                  {activeMenu === 'audits' && renderAudits()}
                  {activeMenu === 'stages' && renderStages()}
                  {activeMenu === 'milestones' && renderMilestones()}
                  {activeMenu === 'vocabulary' && renderVocabulary()}
                  {activeMenu === 'grammar' && renderGrammar()}
                  {activeMenu === 'kanji' && renderKanji()}
                  {activeMenu === 'exams' && renderExams()}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
