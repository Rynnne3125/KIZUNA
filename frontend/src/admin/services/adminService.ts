import { AdminUser, AiEvaluationAudit, AdminSystemStats, AdminRole } from '../types/adminTypes';
import { db } from '../../config/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const API_BASE_URL = 'http://localhost:3000/api/v1/admin';

export const adminService = {
  getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('kizuna_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  },

  async getSystemStats(): Promise<AdminSystemStats> {
    const CACHE_KEY = 'kizuna_admin_system_stats';
    const CACHE_TIME_KEY = 'kizuna_admin_system_stats_time';
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      const cachedTime = parseInt(sessionStorage.getItem(CACHE_TIME_KEY) || '0', 10);
      if (cached && (Date.now() - cachedTime < 5 * 60 * 1000)) {
        return JSON.parse(cached);
      }
    } catch {
      // Bỏ qua lỗi cache
    }

    try {
      if (db) {
        const [usersSnap, examsSnap, stagesSnap, milestonesSnap, auditsSnap] = await Promise.allSettled([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'jlpt_exams')),
          getDocs(collection(db, 'stages')),
          getDocs(collection(db, 'milestones')),
          getDocs(collection(db, 'ai_evaluation_audits'))
        ]);

        let totalLearners = 0;
        let totalAdmins = 1;

        if (usersSnap.status === 'fulfilled' && !usersSnap.value.empty) {
          totalAdmins = 0;
          usersSnap.value.forEach(d => {
            const data = d.data();
            const role = data.role;
            if (role === 'ROLE_ADMIN' || role === 'admin') {
              totalAdmins++;
            } else {
              totalLearners++;
            }
          });
          if (totalAdmins === 0) totalAdmins = 1;
        }

        const totalExams = examsSnap.status === 'fulfilled' && !examsSnap.value.empty ? examsSnap.value.size : 85;
        const totalStages = stagesSnap.status === 'fulfilled' && !stagesSnap.value.empty ? stagesSnap.value.size : 4;
        const totalMilestones = milestonesSnap.status === 'fulfilled' && !milestonesSnap.value.empty ? milestonesSnap.value.size : 28;
        
        let pendingAudits = 0;
        if (auditsSnap.status === 'fulfilled' && !auditsSnap.value.empty) {
          auditsSnap.value.forEach(d => {
            const data = d.data();
            if (data.status === 'PENDING') pendingAudits++;
          });
        }

        const stats: AdminSystemStats = {
          totalLearners,
          totalAdmins,
          totalExamsAvailable: totalExams,
          totalStages,
          totalMilestones,
          pendingAiAudits: pendingAudits,
          serverStatus: 'HEALTHY'
        };

        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(stats));
          sessionStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
        } catch {
          // Bỏ qua
        }

        return stats;
      }
    } catch (e) {
      console.warn('Firestore system stats error:', e);
    }

    return {
      totalLearners: 0,
      totalAdmins: 1,
      totalExamsAvailable: 85,
      totalStages: 4,
      totalMilestones: 28,
      pendingAiAudits: 0,
      serverStatus: 'HEALTHY'
    };
  },

  async getUsers(): Promise<AdminUser[]> {
    const CACHE_KEY = 'kizuna_admin_users';
    const CACHE_TIME_KEY = 'kizuna_admin_users_time';
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      const cachedTime = parseInt(sessionStorage.getItem(CACHE_TIME_KEY) || '0', 10);
      if (cached && (Date.now() - cachedTime < 5 * 60 * 1000)) {
        return JSON.parse(cached);
      }
    } catch {
      // Bỏ qua lỗi cache
    }

    // 1. Thử lấy danh sách người dùng thực tế từ Firestore collection 'users'
    try {
      if (db) {
        const snap = await getDocs(collection(db, 'users'));
        if (!snap.empty) {
          const list: AdminUser[] = [];
          snap.forEach(d => {
            const data = d.data();
            const role: AdminRole = (data.role === 'admin' || data.role === 'ROLE_ADMIN') ? 'ROLE_ADMIN' : 'ROLE_USER';
            list.push({
              id: d.id,
              username: data.username || data.email?.split('@')[0] || 'user',
              fullName: data.fullName || data.username || 'Người dùng KIZUNA',
              email: data.email || '',
              role,
              status: data.isDeleted ? 'LOCKED' : (data.enabled === false ? 'LOCKED' : 'ACTIVE'),
              level: data.level || 'Tân binh',
              totalXp: data.totalXp || 0,
              activePoints: data.activePoints || 0,
              createdAt: data.createdAt ? data.createdAt.split('T')[0] : '2026-03-01'
            });
          });

          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(list));
            sessionStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
          } catch {
            // Bỏ qua
          }

          return list;
        }
      }
    } catch (err) {
      console.warn('Firestore getUsers error:', err);
    }

    // 2. Kiểm tra người dùng đã đăng ký cục bộ
    try {
      const localUsers = JSON.parse(localStorage.getItem('kizuna_registered_users') || '[]');
      if (localUsers.length > 0) {
        return localUsers.map((u: any) => ({
          id: u.id,
          username: u.username || u.email?.split('@')[0] || 'user',
          fullName: u.fullName || u.username,
          email: u.email,
          role: (u.role === 'admin' || u.role === 'ROLE_ADMIN') ? 'ROLE_ADMIN' : 'ROLE_USER',
          status: 'ACTIVE',
          level: u.level || 'N5',
          totalXp: u.totalXp || 0,
          activePoints: u.activePoints || 0,
          createdAt: '2026-03-01'
        }));
      }
    } catch {
      // Ignored
    }

    // 3. Fallback mặc định chỉ tài khoản quản trị chính thức
    return [
      { 
        id: 'usr_admin_01', 
        username: 'admin', 
        fullName: 'Kizuna Administrator', 
        email: 'phongtt.23it@vku.udn.vn', 
        role: 'ROLE_ADMIN', 
        status: 'ACTIVE', 
        level: 'N1', 
        totalXp: 15000, 
        activePoints: 9999, 
        createdAt: '2026-01-15' 
      }
    ];
  },

  async updateUserRole(userId: string, newRole: AdminRole): Promise<boolean> {
    try {
      if (db) {
        await updateDoc(doc(db, 'users', userId), {
          role: newRole
        });
        sessionStorage.removeItem('kizuna_admin_users');
        sessionStorage.removeItem('kizuna_admin_system_stats');
        return true;
      }
    } catch (e) {
      console.warn('updateUserRole error:', e);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        sessionStorage.removeItem('kizuna_admin_users');
        sessionStorage.removeItem('kizuna_admin_system_stats');
        return true;
      }
    } catch {
      // Ignored
    }
    return true;
  },

  async getAiAudits(): Promise<AiEvaluationAudit[]> {
    const CACHE_KEY = 'kizuna_admin_ai_audits';
    const CACHE_TIME_KEY = 'kizuna_admin_ai_audits_time';
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      const cachedTime = parseInt(sessionStorage.getItem(CACHE_TIME_KEY) || '0', 10);
      if (cached && (Date.now() - cachedTime < 5 * 60 * 1000)) {
        return JSON.parse(cached);
      }
    } catch {
      // Bỏ qua lỗi cache
    }

    try {
      if (db) {
        const snap = await getDocs(collection(db, 'ai_evaluation_audits'));
        if (!snap.empty) {
          const list: AiEvaluationAudit[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as AiEvaluationAudit));
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(list));
            sessionStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
          } catch {
            // Bỏ qua
          }
          return list;
        }
      }
    } catch (e) {
      console.warn('Firestore getAiAudits error:', e);
    }

    // Không hiển thị dữ liệu giả lập ngoài Firestore
    return [];
  },

  async reviewAiAudit(auditId: string, decision: 'APPROVED' | 'REJECTED'): Promise<boolean> {
    try {
      if (db) {
        await updateDoc(doc(db, 'ai_evaluation_audits', auditId), {
          status: decision,
          reviewedAt: new Date().toISOString()
        });
        sessionStorage.removeItem('kizuna_admin_ai_audits');
        sessionStorage.removeItem('kizuna_admin_system_stats');
        return true;
      }
    } catch (e) {
      console.warn('reviewAiAudit error:', e);
    }
    return true;
  }
};
