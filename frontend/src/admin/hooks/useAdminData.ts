import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { AdminUser, AiEvaluationAudit, AdminSystemStats } from '../types/adminTypes';

export function useAdminData() {
  const [stats, setStats] = useState<AdminSystemStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [audits, setAudits] = useState<AiEvaluationAudit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [s, u, a] = await Promise.all([
          adminService.getSystemStats(),
          adminService.getUsers(),
          adminService.getAiAudits()
        ]);
        setStats(s);
        setUsers(u);
        setAudits(a);
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
    loading
  };
}
