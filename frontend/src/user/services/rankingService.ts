import { db } from '../../config/firebase';
import { collection, getDocs, doc, getDoc, setDoc, query, limit } from 'firebase/firestore';
import { RankTier, UserLeaderboardItem, LeaderboardMode } from '../types/ranking';
import { shouldSkipFirestore, handleFirestoreError } from '../utils/firestoreGuard';
import { getCurrentIsoWeekKey } from './dailyQuestService';

export const DEFAULT_RANK_TIERS: RankTier[] = [
  {
    id: 'tier_tan_binh',
    name: 'Tân binh',
    minPoints: 0,
    badge: '🌱',
    color: '#10b981',
    description: 'Bắt đầu từ con số 0, làm quen bảng chữ cái & chào hỏi cơ bản'
  },
  {
    id: 'tier_tap_su',
    name: 'Tập sự',
    minPoints: 100,
    badge: '🥉',
    color: '#0d9488',
    description: 'Tích lũy vốn từ vựng ban đầu, tự giới thiệu và phát âm chuẩn'
  },
  {
    id: 'tier_giao_tiep',
    name: 'Giao tiếp cơ bản',
    minPoints: 300,
    badge: '🥈',
    color: '#0284c7',
    description: 'Hội thoại thường nhật, tự tin mua sắm, hỏi đường, đặt món'
  },
  {
    id: 'tier_cong_so',
    name: 'Tiếng Nhật công sở',
    minPoints: 600,
    badge: '🥇',
    color: '#f59e0b',
    description: 'Sử dụng tốt trong môi trường làm việc, trao đổi email, báo cáo cấp trên'
  },
  {
    id: 'tier_chuyen_nghiep',
    name: 'Chuyên nghiệp',
    minPoints: 1200,
    badge: '💎',
    color: '#6366f1',
    description: 'Thành thạo kính ngữ, tự tin phỏng vấn và đàm phán công việc'
  },
  {
    id: 'tier_ban_xu',
    name: 'Bản xứ',
    minPoints: 2500,
    badge: '👑',
    color: '#8b5cf6',
    description: 'Phản xạ tự nhiên chuẩn người Nhật, am hiểu văn hóa doanh nghiệp sâu sắc'
  }
];

const CONFIG_DOC_PATH = 'system_config';
const CONFIG_DOC_ID = 'ranking';

export const rankingService = {
  /**
   * Lấy danh sách các mốc xếp hạng (Rank Tiers) từ Firestore.
   * TỐI ƯU HÓA: Dùng cache localStorage với TTL 30 phút để không truy vấn Firestore liên tục.
   */
  async getRankTiers(): Promise<RankTier[]> {
    const CACHE_KEY = 'kizuna_rank_tiers_cache';
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { data, exp } = JSON.parse(raw);
        if (Date.now() < exp && Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch {
      // ignore
    }

    if (!db || shouldSkipFirestore()) return DEFAULT_RANK_TIERS;
    try {
      const snap = await getDoc(doc(db, CONFIG_DOC_PATH, CONFIG_DOC_ID));
      if (snap.exists()) {
        const data = snap.data();
        if (data && Array.isArray(data.tiers) && data.tiers.length > 0) {
          const sorted = data.tiers.sort((a: RankTier, b: RankTier) => a.minPoints - b.minPoints);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ data: sorted, exp: Date.now() + 30 * 60 * 1000 }));
          } catch {}
          return sorted;
        }
      }
      // Khởi tạo mốc rank mặc định lên Firestore
      await this.saveRankTiers(DEFAULT_RANK_TIERS);
      return DEFAULT_RANK_TIERS;
    } catch (e) {
      handleFirestoreError(e);
      console.warn('[Ranking] Không thể tải mốc rank từ Firestore, dùng mặc định:', e);
      return DEFAULT_RANK_TIERS;
    }
  },

  /**
   * Admin lưu hoặc chỉnh sửa các mốc điểm xếp hạng lên Firestore
   */
  async saveRankTiers(tiers: RankTier[]): Promise<boolean> {
    if (!db || shouldSkipFirestore()) return false;
    try {
      const sorted = [...tiers].sort((a, b) => a.minPoints - b.minPoints);
      await setDoc(doc(db, CONFIG_DOC_PATH, CONFIG_DOC_ID), {
        tiers: sorted,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Xóa cache cũ để dữ liệu mới có hiệu lực ngay
      localStorage.removeItem('kizuna_rank_tiers_cache');
      sessionStorage.removeItem('kizuna_leaderboard_cache');
      return true;
    } catch (e) {
      handleFirestoreError(e);
      console.error('[Ranking] Lỗi lưu cấu hình rank lên Firestore:', e);
      return false;
    }
  },

  /**
   * Tính bậc rank dựa trên điểm năng động (activePoints)
   */
  calculateRank(activePoints = 0, tiers: RankTier[] = DEFAULT_RANK_TIERS): RankTier {
    const sorted = [...tiers].sort((a, b) => b.minPoints - a.minPoints);
    for (const tier of sorted) {
      if (activePoints >= tier.minPoints) {
        return tier;
      }
    }
    return tiers[0] || DEFAULT_RANK_TIERS[0];
  },

  /**
   * Tính mốc rank tiếp theo và số điểm cần đạt để thăng hạng
   */
  getNextRankTier(activePoints = 0, tiers: RankTier[] = DEFAULT_RANK_TIERS): { nextTier: RankTier | null; pointsNeeded: number } {
    const sorted = [...tiers].sort((a, b) => a.minPoints - b.minPoints);
    for (const tier of sorted) {
      if (tier.minPoints > activePoints) {
        return {
          nextTier: tier,
          pointsNeeded: tier.minPoints - activePoints
        };
      }
    }
    return { nextTier: null, pointsNeeded: 0 };
  },

  /**
   * Lấy danh sách bảng xếp hạng học viên từ Firestore
   * - mode = 'weekly': xếp hạng theo điểm năng động kiếm được trong tuần ISO hiện tại (reset mỗi tuần)
   * - mode = 'all_time': xếp hạng theo tổng XP vĩnh viễn (không bị ảnh hưởng khi tiêu activePoints mua Khiên)
   */
  async getLearnerLeaderboard(
    tiers: RankTier[] = DEFAULT_RANK_TIERS,
    mode: LeaderboardMode = 'weekly'
  ): Promise<UserLeaderboardItem[]> {
    const currentWeekKey = getCurrentIsoWeekKey(new Date());
    const CACHE_KEY = `kizuna_leaderboard_cache_${mode}_${currentWeekKey}`;
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const { data, exp } = JSON.parse(raw);
        if (Date.now() < exp && Array.isArray(data)) {
          return data;
        }
      }
    } catch {
      // ignore
    }

    const sortItems = (list: UserLeaderboardItem[]): UserLeaderboardItem[] => {
      list.sort((a, b) => {
        if (mode === 'weekly') {
          if (b.weeklyActivePoints !== a.weeklyActivePoints) {
            return b.weeklyActivePoints - a.weeklyActivePoints;
          }
          if (b.totalXp !== a.totalXp) return b.totalXp - a.totalXp;
          return b.activePoints - a.activePoints;
        }
        if (b.totalXp !== a.totalXp) return b.totalXp - a.totalXp;
        return b.activePoints - a.activePoints;
      });
      list.forEach((item, index) => {
        item.position = index + 1;
      });
      return list;
    };

    const buildLocalLeaderboard = (): UserLeaderboardItem[] => {
      try {
        const raw = localStorage.getItem('kizuna_registered_users');
        const users: any[] = raw ? JSON.parse(raw) : [];
        const curRaw = localStorage.getItem('kizuna_user');
        if (curRaw) {
          const cur = JSON.parse(curRaw);
          const idx = users.findIndex(u => u.id === cur.id || u.email === cur.email);
          if (idx >= 0) {
            users[idx] = { ...users[idx], ...cur };
          } else {
            users.push(cur);
          }
        }
        const validLearners = users
          .filter(u => !String(u.role || '').toLowerCase().includes('admin') && !u.isDeleted)
          .map((u, idx) => {
            const ap = typeof u.activePoints === 'number' ? u.activePoints : 0;
            const totalXp = typeof u.totalXp === 'number' ? u.totalXp : 0;
            const weeklyPts = (u.weeklyPointsWeek === currentWeekKey && typeof u.weeklyActivePoints === 'number')
              ? u.weeklyActivePoints
              : 0;
            return {
              id: u.id || `local_user_${idx}`,
              fullName: u.fullName || u.username || 'Học viên KIZUNA',
              username: u.username || 'learner',
              email: u.email || '',
              avatarUrl: u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username || idx}`,
              activePoints: ap,
              weeklyActivePoints: weeklyPts,
              weeklyPointsWeek: currentWeekKey,
              totalXp,
              currentStreak: typeof u.currentStreak === 'number' ? u.currentStreak : 0,
              streakFreezes: typeof u.streakFreezes === 'number' ? u.streakFreezes : 0,
              rankTier: this.calculateRank(totalXp > 0 ? Math.max(ap, Math.floor(totalXp / 2)) : ap, tiers),
              position: 0
            };
          });
        return sortItems(validLearners);
      } catch {
        return [];
      }
    };

    if (!db || shouldSkipFirestore()) {
      return buildLocalLeaderboard();
    }

    try {
      const q = query(collection(db, 'users'), limit(60));
      const snap = await getDocs(q);
      const items: UserLeaderboardItem[] = [];

      snap.forEach(d => {
        const u = d.data();
        const role = String(u.role || '').trim().toLowerCase();

        // CHỈ LẤY HỌC VIÊN (ROLE_USER), KHÔNG XẾP HẠNG TÀI KHOẢN ADMIN
        if (role.includes('admin') || u.isDeleted) {
          return;
        }

        const activePoints = typeof u.activePoints === 'number' ? u.activePoints : 0;
        const totalXp = typeof u.totalXp === 'number' ? u.totalXp : 0;
        const currentStreak = typeof u.currentStreak === 'number' ? u.currentStreak : 0;
        const weeklyActivePoints = (u.weeklyPointsWeek === currentWeekKey && typeof u.weeklyActivePoints === 'number')
          ? u.weeklyActivePoints
          : 0;
        const rankTier = this.calculateRank(totalXp > 0 ? Math.max(activePoints, Math.floor(totalXp / 2)) : activePoints, tiers);

        items.push({
          id: d.id,
          fullName: u.fullName || u.username || 'Học viên KIZUNA',
          username: u.username || 'learner',
          email: u.email || '',
          avatarUrl: u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username || d.id}`,
          activePoints,
          weeklyActivePoints,
          weeklyPointsWeek: currentWeekKey,
          totalXp,
          currentStreak,
          streakFreezes: typeof u.streakFreezes === 'number' ? u.streakFreezes : 0,
          rankTier,
          position: 0
        });
      });

      sortItems(items);

      if (items.length > 0) {
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: items, exp: Date.now() + 5 * 60 * 1000 }));
        } catch {}
        return items;
      }

      return buildLocalLeaderboard();
    } catch (e) {
      handleFirestoreError(e);
      console.warn('[Ranking] Lỗi tải bảng xếp hạng từ Firestore, chuyển sang bộ nhớ cục bộ:', e);
      return buildLocalLeaderboard();
    }
  }
};

