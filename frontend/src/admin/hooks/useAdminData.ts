import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { 
  AdminUser, AiEvaluationAudit, AdminSystemStats,
  Stage, Milestone, VocabularyItem, GrammarItem, KanjiDictionary, JlptExam,
  LearningAnalyticsData
} from '../types/adminTypes';

export function useAdminData() {
  const [stats, setStats] = useState<AdminSystemStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [audits, setAudits] = useState<AiEvaluationAudit[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [grammar, setGrammar] = useState<GrammarItem[]>([]);
  const [kanji, setKanji] = useState<KanjiDictionary[]>([]);
  const [exams, setExams] = useState<JlptExam[]>([]);
  const [analytics, setAnalytics] = useState<LearningAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [u, a, st, m, v, g, k, e] = await Promise.all([
          adminService.getUsers(),
          adminService.getAiAudits(),
          adminService.getStages(),
          adminService.getMilestones(),
          adminService.getVocabulary(),
          adminService.getGrammar(),
          adminService.getKanji(),
          adminService.getExams()
        ]);

        const computedStats: AdminSystemStats = {
          totalLearners: u.filter(user => user.role !== 'ROLE_ADMIN').length,
          totalAdmins: u.filter(user => user.role === 'ROLE_ADMIN').length,
          totalExamsAvailable: e.length,
          totalStages: st.length,
          totalMilestones: m.length,
          pendingAiAudits: a.filter(audit => audit.status === 'PENDING').length,
          serverStatus: 'HEALTHY'
        };

        setStats(computedStats);
        setUsers(u);
        setAudits(a);
        setStages(st);
        setMilestones(m);
        setVocabulary(v);
        setGrammar(g);
        setKanji(k);
        setExams(e);

        // Giải phóng màn hình loading ngay lập tức sau khi có dữ liệu chính
        setLoading(false);

        // Tính toán dữ liệu Phân tích Học tập (Analytics) bất đồng bộ
        const analyticsData = await adminService.getLearningAnalytics({
          users: u,
          stages: st,
          milestones: m,
          vocabulary: v,
          kanji: k
        });
        setAnalytics(analyticsData);
      } catch (err) {
        console.error('[useAdminData] Error loading admin dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return {
    stats,
    setStats,
    users,
    setUsers,
    audits,
    setAudits,
    stages,
    setStages,
    milestones,
    setMilestones,
    vocabulary,
    setVocabulary,
    grammar,
    setGrammar,
    kanji,
    setKanji,
    exams,
    setExams,
    analytics,
    setAnalytics,
    loading
  };
}
