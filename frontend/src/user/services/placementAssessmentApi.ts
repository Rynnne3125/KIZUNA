import type { DiagnosticQuestion, PlacementLevel } from '../data/placementQuestionBank';

export interface PlacementTierScore {
  level: PlacementLevel;
  correct: number;
  total: number;
  skills: { category: DiagnosticQuestion['category']; correct: number; total: number }[];
}

export interface PlacementCandidate {
  id: string;
  level: PlacementLevel;
  stageTitle: string;
  title: string;
  goal: string;
}

export interface PlacementAiAssessment {
  confidence: 'LOW' | 'MODERATE' | 'HIGH';
  milestoneId: string;
  model: string;
  latencyMs: number;
}

export const PLACEMENT_CONFIDENCE_LABELS = {
  LOW: 'Thấp',
  MODERATE: 'Vừa',
  HIGH: 'Cao'
} satisfies Record<PlacementAiAssessment['confidence'], string>;

const endpoint = import.meta.env.VITE_PLACEMENT_API_URL || '/api/v1/placement/assessment';

export async function assessPlacement(
  levels: PlacementTierScore[],
  candidates: PlacementCandidate[]
): Promise<PlacementAiAssessment | null> {
  if (!levels.length || !candidates.length || navigator.onLine === false) return null;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ levels, candidates }),
      signal: AbortSignal.timeout(6500)
    });
    if (!response.ok) return null;
    const result = await response.json();
    if (Object.prototype.hasOwnProperty.call(PLACEMENT_CONFIDENCE_LABELS, result?.confidence) &&
        candidates.some(candidate => candidate.id === result.milestoneId) &&
        typeof result.model === 'string' && Number.isFinite(result.latencyMs) && result.latencyMs >= 0) {
      return { confidence: result.confidence, milestoneId: result.milestoneId, model: result.model, latencyMs: result.latencyMs };
    }
  } catch {
    // Placement and local sync still work if the optional assessment API is unavailable.
  }
  return null;
}
