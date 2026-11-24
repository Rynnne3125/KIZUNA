import { useState, useEffect, useCallback } from 'react';
import { adminService } from '../services/adminService';
import {
  AdminUser, AiEvaluationAudit, AdminSystemStats,
  Stage, Milestone, VocabularyItem, GrammarItem, KanjiDictionary, JlptExam,
  LearningAnalyticsData, AiPlacementMonitorData, AiRuntimeConfig,
  AntiCheatAnomaly, AdminActivityLog, SystemSettings, BackendConnectionStatus
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
  const [placementMonitor, setPlacementMonitor] = useState<AiPlacementMonitorData | null>(null);
  const [aiConfig, setAiConfig] = useState<AiRuntimeConfig | null>(null);
  const [anomalies, setAnomalies] = useState<AntiCheatAnomaly[]>([]);
  const [activityLogs, setActivityLogs] = useState<AdminActivityLog[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [backendStatus, setBackendStatus] = useState<BackendConnectionStatus>(() => adminService.getBackendStatus());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return adminService.subscribeBackendStatus(setBackendStatus);
  }, []);

  const loadAllData = useCallback(async () => {
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
        pendingAiAudits: a.filter(audit => (audit.status || 'PENDING').toUpperCase() === 'PENDING').length,
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

      setLoading(false);

      // Load Analytics, AI Placement Monitor, Anti-Cheat Anomalies, Activity Logs & System Settings asynchronously
      const [analyticsData, monitorData, cfgData, anomalyList, logsList, sysSettings] = await Promise.all([
        adminService.getLearningAnalytics({ users: u, stages: st, milestones: m, vocabulary: v, kanji: k }),
        adminService.getAiPlacementMonitor(u, a),
        adminService.getAiConfig(),
        adminService.scanAntiCheatAnomalies(u),
        adminService.getActivityLogs(100),
        adminService.getSystemSettings()
      ]);

      setAnalytics(analyticsData);
      setPlacementMonitor(monitorData);
      setAiConfig(cfgData);
      setAnomalies(anomalyList);
      setActivityLogs(logsList);
      setSystemSettings(sysSettings);
      setBackendStatus(adminService.getBackendStatus());
    } catch (err) {
      console.error('[useAdminData] Error loading admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const refreshGovernanceData = useCallback(async (overrideUsers?: AdminUser[], overrideAudits?: AiEvaluationAudit[]) => {
    const targetUsers = overrideUsers ?? users;
    const targetAudits = overrideAudits ?? audits;
    const [freshAudits, monitorData, anomalyList, logsList] = await Promise.all([
      overrideAudits ? Promise.resolve(overrideAudits) : adminService.getAiAudits(),
      adminService.getAiPlacementMonitor(targetUsers, targetAudits),
      adminService.scanAntiCheatAnomalies(targetUsers),
      adminService.getActivityLogs(100)
    ]);
    setAudits(freshAudits);
    setPlacementMonitor(monitorData);
    setAnomalies(anomalyList);
    setActivityLogs(logsList);
    setStats(prev =>
      prev
        ? { ...prev, pendingAiAudits: freshAudits.filter(a => (a.status || 'PENDING').toUpperCase() === 'PENDING').length }
        : prev
    );
  }, [users, audits]);

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
    placementMonitor,
    setPlacementMonitor,
    aiConfig,
    setAiConfig,
    anomalies,
    setAnomalies,
    activityLogs,
    setActivityLogs,
    systemSettings,
    setSystemSettings,
    backendStatus,
    loading,
    reloadAll: loadAllData,
    refreshGovernanceData
  };
}
