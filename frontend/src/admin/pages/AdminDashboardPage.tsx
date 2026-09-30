import React, { useState, useEffect } from 'react';
import { AdminForbidden403 } from '../exception/AdminForbidden403';
import { useAdminData } from '../hooks/useAdminData';
import { motion, AnimatePresence } from 'framer-motion';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, Bot, LayoutDashboard, Search, LogOut, Settings, 
  Database, ShieldAlert, Menu, Bell, Filter, Moon, Sun, 
  TrendingUp, Activity, CheckCircle, XCircle
} from 'lucide-react';
import { DonutChart, BarList, AreaChart } from '@tremor/react';

export interface AdminDashboardPageProps {
  user: { fullName?: string; username?: string; role?: string } | null;
  onGoHome: () => void;
  onSwitchToAdmin: () => void;
  onLoginDifferent: () => void;
  onLogout?: () => void;
}

const chartData = [
  { date: 'Mon', 'Active Users': 120, 'New Signups': 15 },
  { date: 'Tue', 'Active Users': 132, 'New Signups': 20 },
  { date: 'Wed', 'Active Users': 180, 'New Signups': 45 },
  { date: 'Thu', 'Active Users': 195, 'New Signups': 30 },
  { date: 'Fri', 'Active Users': 240, 'New Signups': 65 },
  { date: 'Sat', 'Active Users': 210, 'New Signups': 50 },
  { date: 'Sun', 'Active Users': 280, 'New Signups': 80 },
];

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  user,
  onGoHome,
  onSwitchToAdmin,
  onLoginDifferent,
  onLogout
}) => {
  const { stats, users, audits, loading } = useAdminData();
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

  if (!user || user.role !== 'ROLE_ADMIN') {
    return (
      <AdminForbidden403
        userRole={user?.role}
        userName={user?.fullName || user?.username}
        onGoHome={onGoHome}
        onSwitchToAdmin={onSwitchToAdmin}
        onLoginDifferent={onLoginDifferent}
      />
    );
  }

  const roleDistribution = [
    { name: 'Admins', value: stats?.totalAdmins || 3, color: 'red-500' },
    { name: 'Learners', value: stats?.totalLearners || 1240, color: 'orange-500' },
  ];

  const contentStats = [
    { name: 'Exams', value: stats?.totalExamsAvailable || 85 },
    { name: 'Stages', value: stats?.totalStages || 34 },
    { name: 'Milestones', value: stats?.totalMilestones || 182 },
  ];

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reusable Bento Box Component with Glassmorphism & Hover effects
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
      
      {/* 1. Welcome Banner */}
      <BentoBox colSpan="md:col-span-8" className="bg-gradient-to-br from-red-500/10 to-transparent dark:from-red-900/20 justify-center">
        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">
          Welcome back, {user.fullName}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
          Your dashboard is looking great today. System activity is up by 12%, and there are {stats?.pendingAiAudits || 5} AI audits waiting for your review.
        </p>
        <div className="mt-6 flex gap-4">
          <motion.button whileTap={{ scale: 0.95 }} className="bg-red-600 text-white px-6 py-2.5 rounded-full font-semibold shadow-lg shadow-red-500/30 hover:bg-red-700 transition-colors">
            Review Audits
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-6 py-2.5 rounded-full font-semibold shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            View Reports
          </motion.button>
        </div>
      </BentoBox>

      {/* 2. Total Users Metric */}
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
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Network</p>
          <h3 className="text-5xl font-black text-slate-800 dark:text-white">
            {((stats?.totalLearners || 1240) + (stats?.totalAdmins || 3)).toLocaleString()}
          </h3>
        </div>
      </BentoBox>

      {/* 3. Main Chart */}
      <BentoBox colSpan="md:col-span-8" className="h-[400px]" delay={0.2}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Platform Activity</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Daily active users & signups over time</p>
          </div>
          <Activity className="w-5 h-5 text-red-500" />
        </div>
        <div className="flex-1 w-full relative">
          <AreaChart
            data={chartData}
            index="date"
            categories={['Active Users', 'New Signups']}
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
        {/* 4. Curriculum Metric */}
        <BentoBox className="flex-1" delay={0.3}>
          <div className="flex justify-between items-start">
            <div className="p-3 bg-orange-100 dark:bg-orange-500/20 rounded-2xl text-orange-600 dark:text-orange-400">
              <Database className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-auto pt-6">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Curriculum Nodes</p>
            <h3 className="text-4xl font-black text-slate-800 dark:text-white">
              {(stats?.totalStages || 34) + (stats?.totalMilestones || 182)}
            </h3>
          </div>
        </BentoBox>

        {/* 5. Audits Metric */}
        <BentoBox className="flex-1" delay={0.4}>
          <div className="flex justify-between items-start">
            <div className="p-3 bg-rose-100 dark:bg-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400">
              <Bot className="w-6 h-6" />
            </div>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
          </div>
          <div className="mt-auto pt-6">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Pending Audits</p>
            <h3 className="text-4xl font-black text-slate-800 dark:text-white">
              {stats?.pendingAiAudits || 5}
            </h3>
          </div>
        </BentoBox>
      </div>

      {/* 6. Demographics */}
      <BentoBox colSpan="md:col-span-5" delay={0.5}>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Demographics</h3>
        <div className="flex-1 flex items-center justify-center">
          <DonutChart data={roleDistribution} category="value" index="name" colors={['red', 'orange']} className="w-48 h-48" showAnimation={true} animationDuration={1000} />
        </div>
      </BentoBox>

      {/* 7. Content Dist */}
      <BentoBox colSpan="md:col-span-7" delay={0.6}>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Content Distribution</h3>
        <BarList data={contentStats} className="mt-4" color="red" />
      </BentoBox>
    </div>
  );

  const renderUsers = () => (
    <BentoBox colSpan="col-span-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">User Management</h2>
          <p className="text-slate-500 dark:text-slate-400">Advanced datatable with seamless filtering.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input placeholder="Search users..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 w-full sm:w-[280px] bg-slate-50 dark:bg-slate-800 border-transparent rounded-xl" />
          </div>
          <motion.button whileTap={{ scale: 0.95 }} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl flex items-center font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition">
            <Filter className="w-4 h-4 mr-2"/> Filter
          </motion.button>
        </div>
      </div>
      
      <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
            <TableRow className="border-slate-100 dark:border-slate-800">
              <TableHead className="py-4 pl-6 text-slate-500 dark:text-slate-400">User Profile</TableHead>
              <TableHead className="text-slate-500 dark:text-slate-400">Role</TableHead>
              <TableHead className="text-slate-500 dark:text-slate-400">Experience</TableHead>
              <TableHead className="text-slate-500 dark:text-slate-400">Status</TableHead>
              <TableHead className="text-right pr-6 text-slate-500 dark:text-slate-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {filteredUsers.map((u) => (
                <motion.tr key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <TableCell className="py-4 pl-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-rose-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-500/20">
                        {u.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{u.fullName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={u.role === 'ROLE_ADMIN' ? 'border-red-200 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 dark:border-red-900' : 'border-slate-200 bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}>
                      {u.role === 'ROLE_ADMIN' ? 'Admin' : 'Learner'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900 dark:text-white">{u.level}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{u.totalXp} XP</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${u.status === 'ACTIVE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-rose-500'}`}></span>
                      <span className={`text-sm font-medium ${u.status === 'ACTIVE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{u.status}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <motion.button whileTap={{ scale: 0.9 }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                      <Settings className="w-4 h-4" />
                    </motion.button>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>
    </BentoBox>
  );

  const renderAudits = () => (
    <div className="grid grid-cols-1 gap-6">
      {audits.map((audit, index) => (
        <BentoBox key={audit.id} delay={index * 0.1}>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-500/20 rounded-2xl text-red-600 dark:text-red-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">{audit.milestoneTitle}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Student: <span className="font-semibold text-slate-700 dark:text-slate-300">@{audit.username}</span> • {audit.submittedAt}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 px-5 py-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">AI Score</div>
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">{audit.aiScore}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="space-y-4">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">User Submission</div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                  "{audit.userSubmission}"
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">AI Reasoning</div>
                <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {audit.aiFeedback}
                </div>
              </div>
              {audit.studentAppealReason && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                  <div className="text-[11px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-2">Appeal Note</div>
                  <div className="text-sm text-amber-900 dark:text-amber-200">
                    {audit.studentAppealReason}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-4">
            <motion.button whileTap={{ scale: 0.95 }} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2">
              <XCircle className="w-4 h-4" /> Reject Appeal
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 text-white font-semibold shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Override & Approve
            </motion.button>
          </div>
        </BentoBox>
      ))}
    </div>
  );

  const menuItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'users', icon: Users, label: 'Datatable' },
    { id: 'audits', icon: Bot, label: 'AI Resolution' },
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
                Main Menu
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

        <div className="p-6 border-t border-slate-200 dark:border-slate-800">
          <button 
            onClick={() => {
              if (onLogout) onLogout();
              else onGoHome();
            }}
            className="w-full flex items-center h-12 px-4 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors group"
          >
            <LogOut className="w-5 h-5 shrink-0 group-hover:-translate-x-1 transition-transform" />
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ml-4 font-semibold text-sm whitespace-nowrap">
                  Exit to User
                </motion.span>
              )}
            </AnimatePresence>
          </button>
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
            {/* Theme Toggle */}
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsDark(!isDark)} className="w-10 h-10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 shadow-sm transition-colors">
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </motion.button>

            {/* Notification */}
            <motion.button whileTap={{ scale: 0.9 }} className="w-10 h-10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 shadow-sm transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
            </motion.button>

            {/* Profile */}
            <div className="flex items-center gap-3 pl-4 ml-2 border-l border-slate-200 dark:border-slate-800">
              <div className="text-right hidden md:block">
                <div className="text-sm font-bold text-slate-800 dark:text-white">{user.fullName}</div>
                <div className="text-xs font-medium text-red-500">{user.role}</div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white flex items-center justify-center font-bold shadow-lg shadow-red-500/20 border-2 border-white dark:border-slate-800 cursor-pointer">
                {user.fullName?.charAt(0) || 'A'}
              </div>
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
                  {activeMenu === 'audits' && renderAudits()}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
