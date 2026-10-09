import { db } from '../../config/firebase';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { RankTier, UserLeaderboardItem } from '../types/ranking';

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

    if (!db) return DEFAULT_RANK_TIERS;
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
      console.warn('[Ranking] Không thể tải mốc rank từ Firestore, dùng mặc định:', e);
      return DEFAULT_RANK_TIERS;
    }
  },

  /**
   * Admin lưu hoặc chỉnh sửa các mốc điểm xếp hạng lên Firestore
   */
  async saveRankTiers(tiers: RankTier[]): Promise<boolean> {
    if (!db) return false;
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
   * QUY TẮC BẮT BUỘC: CHỈ người dùng role user mới tham gia xếp hạng (loại bỏ admin)
   * TỐI ƯU HÓA: Dùng cache sessionStorage (TTL 5 phút) để tránh đọc Firestore liên tục mỗi khi chuyển tab.
   */
  async getLearnerLeaderboard(tiers: RankTier[] = DEFAULT_RANK_TIERS): Promise<UserLeaderboardItem[]> {
    const CACHE_KEY = 'kizuna_leaderboard_cache';
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

    if (!db) return [];
    try {
      const snap = await getDocs(collection(db, 'users'));
      const items: UserLeaderboardItem[] = [];

      snap.forEach(d => {
        const u = d.data();
        const role = String(u.role || '').trim().toLowerCase();
        
        // CHỈ LẤY HỌC VIÊN (ROLE_USER), KHÔNG XẾP HẠNG TÀI KHOẢN ADMIN
        if (role.includes('admin')) {
          return;
        }

        const activePoints = typeof u.activePoints === 'number' ? u.activePoints : 0;
        const totalXp = typeof u.totalXp === 'number' ? u.totalXp : 0;
        const currentStreak = typeof u.currentStreak === 'number' ? u.currentStreak : 0;
        const rankTier = this.calculateRank(activePoints, tiers);

        items.push({
          id: d.id,
          fullName: u.fullName || u.username || 'Học viên KIZUNA',
          username: u.username || 'learner',
          email: u.email || '',
          avatarUrl: u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username || d.id}`,
          activePoints,
          totalXp,
          currentStreak,
          rankTier,
          position: 0
        });
      });

      // Sắp xếp giảm dần theo điểm năng động (activePoints)
      items.sort((a, b) => b.activePoints - a.activePoints);

      // Gán thứ hạng position: #1, #2, #3...
      items.forEach((item, index) => {
        item.position = index + 1;
      });

      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: items, exp: Date.now() + 5 * 60 * 1000 }));
      } catch {}

      return items;
    } catch (e) {
      console.warn('[Ranking] Lỗi tải bảng xếp hạng từ Firestore:', e);
      return [];
    }
  }
};
