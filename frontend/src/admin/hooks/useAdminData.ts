import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { 
  AdminUser, AiEvaluationAudit, AdminSystemStats,
  Stage, Milestone, VocabularyItem, GrammarItem, KanjiDictionary, JlptExam
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [s, u, a, st, m, v, g, k, e] = await Promise.all([
          adminService.getSystemStats(),
          adminService.getUsers(),
          adminService.getAiAudits(),
          adminService.getStages(),
          adminService.getMilestones(),
          adminService.getVocabulary(),
          adminService.getGrammar(),
          adminService.getKanji(),
          adminService.getExams()
        ]);
        setStats(s);
        setUsers(u);
        setAudits(a);
        setStages(st);
        setMilestones(m);
        setVocabulary(v);
        setGrammar(g);
        setKanji(k);
        setExams(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return {
    stats,
    users,
    audits,
    stages,
    milestones,
    vocabulary,
    grammar,
    kanji,
    exams,
    loading
  };
}
