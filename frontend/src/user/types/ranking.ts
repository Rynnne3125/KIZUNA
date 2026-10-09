export interface RankTier {
  id: string;
  name: string;        // Tên bậc rank: "Tân binh", "Tập sự", "Giao tiếp cơ bản", "Tiếng Nhật công sở", "Chuyên nghiệp", "Bản xứ"
  minPoints: number;   // Điểm năng động tối thiểu
  badge: string;       // Huy hiệu/icon
  color: string;       // Theme color
  description: string; // Mô tả năng lực đạt được
}

export interface UserLeaderboardItem {
  id: string;
  fullName: string;
  username: string;
  email: string;
  avatarUrl?: string;
  activePoints: number;
  totalXp: number;
  currentStreak: number;
  rankTier: RankTier;
  position: number;
}
