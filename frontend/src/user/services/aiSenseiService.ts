import { db } from '../../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { authService } from './authService';

export interface AiSenseiEvaluationResult {
  milestoneId?: string;
  milestoneTitle?: string;
  studentInput: string;
  evaluatedScore: number;
  passed: boolean;
  whitelistCompliant: boolean;
  matchedWhitelistTerms?: string[];
  particleErrors: string[];
  pedagogicalFeedback: string;
  naturalExpressionSuggestion: string;
  model: string;
  source: 'GEMINI_LIVE' | 'WHITELIST_FALLBACK' | 'LOCAL_CLIENT';
  latencyMs: number;
}

export interface SubmitAiAppealPayload {
  milestoneId: string;
  milestoneTitle: string;
  questTitle?: string;
  promptText: string;
  studentInput: string;
  aiFeedback: string;
  aiScore: number;
  studentReason: string;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

function evaluateLocally(params: {
  milestoneId?: string;
  milestoneTitle?: string;
  studentInput: string;
  sampleAnswer?: string;
  requiredKeywords?: string[];
  whitelistVocabulary?: string[];
}): AiSenseiEvaluationResult {
  const started = performance.now();
  const input = params.studentInput.trim();
  const particleErrors: string[] = [];
  const matchedWhitelistTerms: string[] = [];

  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(input);
  const hasPolite = /(です|ます|ました|ません|ください|ありがとう|おはよう|こんにちは|よろしく)/.test(input);
  const required = params.requiredKeywords || [];
  const hasRequired = required.length === 0 || required.some(k => k && input.includes(k));

  (params.whitelistVocabulary || []).forEach(term => {
    if (term && term.length >= 1 && input.includes(term) && !matchedWhitelistTerms.includes(term)) {
      matchedWhitelistTerms.push(term);
    }
  });

  if (input.includes('私わ') || input.includes('わたしわ')) {
    particleErrors.push('Lỗi trợ từ chủ đề: dùng 「は」 thay vì 「わ」 sau 「私／わたし」.');
  }
  if (input.includes('行きます') && input.includes('を') && !input.includes('へ') && !input.includes('に')) {
    particleErrors.push('Động từ 「行きます」 đi với trợ từ chỉ hướng 「へ」 hoặc 「に」 thay vì 「を」.');
  }
  if (/(はは|をを|にに)/.test(input)) {
    particleErrors.push('Phát hiện lặp trợ từ liên tiếp chưa tự nhiên.');
  }
  if (
    hasJapanese &&
    input.length >= 6 &&
    !/[はがをにでのへ]/.test(input) &&
    !/(おはよう|初めまして|ありがとう|こんにちは)/.test(input)
  ) {
    particleErrors.push('Câu có thể đang thiếu trợ từ liên kết (は / が / を / に / で).');
  }

  let score = 4;
  if (!hasJapanese) {
    score = 2;
    particleErrors.push('Vui lòng gõ câu bằng chữ tiếng Nhật (Hiragana / Katakana / Kanji).');
  } else {
    if (input.length >= 4) score += 1;
    if (hasPolite) score += 2;
    if (hasRequired) score += 2;
    if (matchedWhitelistTerms.length > 0) score += 1;
    score -= Math.min(3, particleErrors.length * 2);
    score = Math.max(1, Math.min(10, score));
  }

  const passed = score >= 6;
  const feedbackParts: string[] = [];
  if (!hasJapanese) {
    feedbackParts.push('Câu trả lời chưa dùng chữ tiếng Nhật. Hãy chuyển bộ gõ sang tiếng Nhật để AI Sensei đánh giá chính xác.');
  } else if (passed) {
    feedbackParts.push('Tuyệt vời! Câu trả lời lịch sự, đúng bối cảnh tình huống.');
    if (matchedWhitelistTerms.length > 0) {
      feedbackParts.push(`Đã áp dụng chuẩn từ Whitelist: ${matchedWhitelistTerms.slice(0, 3).join(', ')}.`);
    }
  } else {
    feedbackParts.push('Câu viết cần chỉnh sửa thêm.');
    if (!hasRequired && required.length > 0) {
      feedbackParts.push(`Hãy lồng ghép mẫu câu trọng tâm [${required.join(' / ')}].`);
    }
    if (!hasPolite) {
      feedbackParts.push('Nên sử dụng vị ngữ lịch sự (〜です / 〜ます).');
    }
  }

  let suggestion: string;
  if (!hasJapanese) {
    suggestion = params.sampleAnswer || '初めまして、どうぞよろしくお願いします。';
  } else {
    let polished = input
      .replace(/私わ/g, '私は')
      .replace(/わたしわ/g, 'わたしは')
      .replace(/はは/g, 'は')
      .replace(/をを/g, 'を')
      .replace(/にに/g, 'に');
    if (polished.includes('行きます') && polished.includes('を') && !polished.includes('へ') && !polished.includes('に')) {
      polished = polished.replace('を', 'へ');
    }
    if (!hasPolite && !/(です|ます)[。？！?!]?$/.test(polished)) {
      polished = polished.replace(/[。？！?!]+$/, '') + 'です。';
    } else if (!/[。？！?!]$/.test(polished)) {
      polished = `${polished}。`;
    }
    suggestion = polished;
  }

  return {
    milestoneId: params.milestoneId,
    milestoneTitle: params.milestoneTitle,
    studentInput: input,
    evaluatedScore: score,
    passed,
    whitelistCompliant: hasJapanese && (matchedWhitelistTerms.length > 0 || hasRequired),
    matchedWhitelistTerms,
    particleErrors,
    pedagogicalFeedback: feedbackParts.join(' '),
    naturalExpressionSuggestion: suggestion,
    model: 'kizuna-whitelist-local',
    source: 'LOCAL_CLIENT',
    latencyMs: Math.max(10, Math.round(performance.now() - started))
  };
}

export const aiSenseiService = {
  async evaluateSentence(params: {
    milestoneId: string;
    milestoneTitle: string;
    dialogueTitle?: string;
    partnerSpeechJp?: string;
    learnerPrompt?: string;
    sampleAnswer?: string;
    studentInput: string;
    requiredKeywords?: string[];
    whitelistVocabulary?: string[];
    whitelistGrammar?: string[];
  }): Promise<AiSenseiEvaluationResult> {
    if (typeof navigator !== 'undefined' && navigator.onLine !== false) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/ai/sensei/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: AbortSignal.timeout(20000)
        });
        if (res.ok) {
          const envelope = await res.json();
          const data = envelope?.data;
          if (data && typeof data.evaluatedScore === 'number') {
            return {
              milestoneId: data.milestoneId || params.milestoneId,
              milestoneTitle: data.milestoneTitle || params.milestoneTitle,
              studentInput: data.studentInput || params.studentInput,
              evaluatedScore: data.evaluatedScore,
              passed: Boolean(data.passed),
              whitelistCompliant: data.whitelistCompliant !== false,
              matchedWhitelistTerms: Array.isArray(data.matchedWhitelistTerms) ? data.matchedWhitelistTerms : [],
              particleErrors: Array.isArray(data.particleErrors) ? data.particleErrors : [],
              pedagogicalFeedback: data.pedagogicalFeedback || 'Bài làm hợp lệ.',
              naturalExpressionSuggestion: data.naturalExpressionSuggestion || params.sampleAnswer || params.studentInput,
              model: data.model || 'gemini-3.5-flash-lite',
              source: data.source || 'GEMINI_LIVE',
              latencyMs: Number(data.latencyMs || 0)
            };
          }
        }
      } catch {
        // Fallback to local Whitelist evaluator when backend is unreachable
      }
    }

    return evaluateLocally(params);
  },

  async submitAppeal(payload: SubmitAiAppealPayload): Promise<{ ok: boolean; id: string }> {
    const currentUser = authService.getCurrentUser();
    const userId = currentUser?.id || 'anonymous';
    const username = currentUser?.username || currentUser?.fullName || currentUser?.email || 'hocvien';
    const nowIso = new Date().toISOString();
    let auditId = `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    // 1. Gửi lên Backend Spring Boot API
    try {
      const jwt = authService.getBackendJwt();
      const res = await fetch(`${API_BASE_URL}/api/v1/ai/appeals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {})
        },
        body: JSON.stringify({
          userId,
          username,
          milestoneId: payload.milestoneId,
          milestoneTitle: payload.milestoneTitle,
          questTitle: payload.questTitle || 'Quest 4: Thực hành viết câu AI Sensei',
          promptText: payload.promptText,
          studentInput: payload.studentInput,
          aiFeedback: payload.aiFeedback,
          aiScore: payload.aiScore,
          studentReason: payload.studentReason
        }),
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const envelope = await res.json();
        if (envelope?.data?.id) {
          auditId = envelope.data.id;
        }
      }
    } catch {
      // Continue to persist to Firestore so Admin sees the appeal even without backend
    }

    // 2. Đồng bộ trực tiếp vào Firestore `ai_evaluation_audits`
    if (db) {
      try {
        await setDoc(doc(db, 'ai_evaluation_audits', auditId), {
          id: auditId,
          userId,
          username,
          milestoneId: payload.milestoneId,
          milestoneTitle: payload.milestoneTitle,
          questTitle: payload.questTitle || 'Quest 4: Thực hành viết câu AI Sensei',
          promptText: payload.promptText,
          studentInput: payload.studentInput,
          userSubmission: payload.studentInput,
          aiResponse: payload.aiFeedback,
          aiFeedback: payload.aiFeedback,
          aiScore: payload.aiScore,
          studentReason: payload.studentReason,
          studentAppealReason: payload.studentReason,
          status: 'PENDING',
          submittedAt: nowIso,
          createdAt: Date.now()
        });
      } catch (err) {
        console.warn('[AiSenseiService] Firestore appeal write error:', err);
      }
    }

    return { ok: true, id: auditId };
  }
};
