import { 
  AdminUser, AiEvaluationAudit, AdminSystemStats, AdminRole,
  Stage, Milestone, VocabularyItem, GrammarItem, KanjiDictionary, JlptExam
} from '../types/adminTypes';
import { db } from '../../config/firebase';
import { collection, getDocs, doc, updateDoc, query, limit } from 'firebase/firestore';

export const adminService = {
  async fetchCollectionData<T>(collectionName: string, queryLimit: number = 100): Promise<T[]> {
    try {
      const q = query(collection(db, collectionName), limit(queryLimit));
      const snap = await getDocs(q);
      const list: T[] = [];
      if (!snap.empty) {
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as unknown as T));
      }
      return list;
    } catch (e) {
      console.error(`Error fetching collection ${collectionName}`, e);
      return [];
    }
  },

  async getSystemStats(): Promise<AdminSystemStats> {
    try {
      const users = await this.fetchCollectionData<AdminUser>('users');
      const audits = await this.fetchCollectionData<AiEvaluationAudit>('ai_evaluation_audits');
      const stages = await this.fetchCollectionData<Stage>('stages');
      const milestones = await this.fetchCollectionData<Milestone>('milestones');
      const exams = await this.fetchCollectionData<JlptExam>('jlpt_exam_catalog');

      const totalAdmins = users.filter(u => u.role === 'ROLE_ADMIN').length;
      const totalLearners = users.filter(u => u.role !== 'ROLE_ADMIN').length;
      const pendingAudits = audits.filter(a => a.status === 'PENDING').length;

      return {
        totalLearners,
        totalAdmins,
        totalExamsAvailable: exams.length,
        totalStages: stages.length,
        totalMilestones: milestones.length,
        pendingAiAudits: pendingAudits,
        serverStatus: 'HEALTHY'
      };
    } catch (e) {
      console.error("Error fetching stats", e);
      return {
        totalLearners: 0,
        totalAdmins: 0,
        totalExamsAvailable: 0,
        totalStages: 0,
        totalMilestones: 0,
        pendingAiAudits: 0,
        serverStatus: 'HEALTHY'
      };
    }
  },

  async getUsers(): Promise<AdminUser[]> {
    return this.fetchCollectionData<AdminUser>('users');
  },

  async updateUserRole(userId: string, newRole: AdminRole): Promise<boolean> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch {
      return false;
    }
  },

  async getAiAudits(): Promise<AiEvaluationAudit[]> {
    return this.fetchCollectionData<AiEvaluationAudit>('ai_evaluation_audits');
  },

  async getStages(): Promise<Stage[]> {
    return this.fetchCollectionData<Stage>('stages');
  },

  async getMilestones(): Promise<Milestone[]> {
    return this.fetchCollectionData<Milestone>('milestones');
  },

  async getVocabulary(): Promise<VocabularyItem[]> {
    return this.fetchCollectionData<VocabularyItem>('vocabulary_items');
  },

  async getGrammar(): Promise<GrammarItem[]> {
    return this.fetchCollectionData<GrammarItem>('grammar_items');
  },

  async getKanji(): Promise<KanjiDictionary[]> {
    return this.fetchCollectionData<KanjiDictionary>('kanji_dictionary');
  },

  async getExams(): Promise<JlptExam[]> {
    return this.fetchCollectionData<JlptExam>('jlpt_exam_catalog');
  },

  async reviewAiAudit(auditId: string, decision: 'APPROVED' | 'REJECTED'): Promise<boolean> {
    try {
      await updateDoc(doc(db, 'ai_evaluation_audits', auditId), {
        status: decision,
        reviewedAt: new Date().toISOString()
      });
      return true;
    } catch {
      return false;
    }
    return true;
  }
};
