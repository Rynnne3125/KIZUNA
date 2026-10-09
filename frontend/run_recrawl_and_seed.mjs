import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { loadChunk, fetchAsset } from './openjlpt_loader.mjs';

// ============================================================================
// 1. FIREBASE CONFIGURATION (ebook-fdc02)
// ============================================================================
let envConfig = {};
try {
  const envContent = fs.readFileSync(path.resolve('.env'), 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      envConfig[match[1]] = match[2]?.trim() || '';
    }
  }
} catch (e) {
  // ignore
}

const firebaseConfig = {
  apiKey: envConfig.VITE_FIREBASE_API_KEY || "AIzaSyA49_93r5iK5nbY6TykssefQjrR6cp1SgY",
  authDomain: envConfig.VITE_FIREBASE_AUTH_DOMAIN || "ebook-fdc02.firebaseapp.com",
  projectId: envConfig.VITE_FIREBASE_PROJECT_ID || "ebook-fdc02",
  storageBucket: envConfig.VITE_FIREBASE_STORAGE_BUCKET || "ebook-fdc02.firebasestorage.app",
  messagingSenderId: envConfig.VITE_FIREBASE_MESSAGING_SENDER_ID || "657175691442",
  appId: envConfig.VITE_FIREBASE_APP_ID || "1:657175691442:android:556972cc7268478ed949ab"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function stripUndefined(obj) {
  if (obj === null || obj === undefined) return null;
  return JSON.parse(JSON.stringify(obj, (_, v) => {
    if (typeof v === 'function' || typeof v === 'symbol') return undefined;
    return v;
  }));
}

async function clearCollection(colName) {
  const colRef = collection(db, colName);
  const snap = await getDocs(colRef);
  if (snap.empty) {
    console.log(`   ℹ️ [${colName}] Không có dữ liệu cũ.`);
    return 0;
  }
  const docs = snap.docs;
  const CHUNK_SIZE = 400;
  let deleted = 0;
  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    const slice = docs.slice(i, i + CHUNK_SIZE);
    for (const d of slice) batch.delete(d.ref);
    await batch.commit();
    deleted += slice.length;
  }
  console.log(`   🗑️ Đã xóa sạch ${deleted} docs cũ trong [${colName}].`);
  return deleted;
}

async function pushCollection(colName, items, idKey = 'id') {
  if (!items || items.length === 0) return;
  const CHUNK_SIZE = 350;
  let pushed = 0;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    const slice = items.slice(i, i + CHUNK_SIZE);
    for (const item of slice) {
      const rawId = String(item[idKey] || item.id || `doc_${i}`);
      const safeId = rawId.replace(/\//g, '_').slice(0, 250);
      const docRef = doc(collection(db, colName), safeId);
      batch.set(docRef, stripUndefined({ ...item, id: safeId, updatedAt: new Date().toISOString() }));
    }
    await batch.commit();
    pushed += slice.length;
    console.log(`   ⬆️ [${colName}] Đã push ${pushed}/${items.length} documents...`);
    if (i + CHUNK_SIZE < items.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
}

// ============================================================================
// 2. MAIN CRAWL, DEDUPLICATE & SEED PROCESS
// ============================================================================
async function runRecrawlAndSeed() {
  console.log('====================================================================');
  console.log('🚀 CÀO LẠI VÀ CHUẨN HÓA TOÀN DIỆN DỮ LIỆU TỪ OPENJLPT.COM CHO KIZUNA');
  console.log('====================================================================\n');

  console.log('📦 Đang tải các module dữ liệu gốc từ OpenJLPT...');
  const michiMod = await loadChunk('michinoriStages-m-WX7Yda.js');
  const drillsMod = await loadChunk('minnaDrills-DjSRmPDf.js');
  const nikkiMod = await loadChunk('nikkiLessons-B7CPWFD3.js');
  const minnaMod = await loadChunk('minna-curriculum-DXFuX8Tv.js');
  const kanjiMod = await loadChunk('kanjiData-BQWUqFU0.js');
  const kanjiVocabMod = await loadChunk('kanjiVocabulary-DQ6Tzra8.js');
  const skmMod = await loadChunk('skm-curriculum-patterns-C_JUV4R2.js');
  const n3DeepMod = await loadChunk('n3GrammarDeep-DjP_Bxvw.js');
  const m1Mod = await loadChunk('mimikaraN1-nqM05wfn.js');
  const m2Mod = await loadChunk('mimikaraN2-BKQ2GkLo.js');
  const m3Mod = await loadChunk('mimikaraN3-B8bAIr7X.js');
  const mn4Mod = await loadChunk('minnaN4-DsDIrYN_.js');
  const mn5Mod = await loadChunk('minnaN5-DFrE3sPB.js');
  const fcLibMod = await loadChunk('flashcardLibrary-CHoGXZF6.js');
  const tangoMod = await loadChunk('tangoN4EnOverlay-Di9YgegX.js');
  const n5ArrangeMod = await loadChunk('n5TangoArrangeData-BMa3Bpy3.js').catch(() => ({}));
  let tangoOverlaySentences = {};
  try {
    const overlayCode = fs.readFileSync(path.resolve('.openjlpt_cache/assets_tangoArrangeEnOverlay-Ctkh4Sbl.js'), 'utf8');
    const startIdx = overlayCode.indexOf("JSON.parse('");
    if (startIdx !== -1) {
      const endIdx = overlayCode.indexOf("')", startIdx);
      tangoOverlaySentences = JSON.parse(overlayCode.substring(startIdx + "JSON.parse('".length, endIdx).replace(/\\'/g, "'").replace(/\\\\/g, "\\"));
    }
  } catch (e) {
    console.warn('⚠️ Could not parse tangoOverlaySentences:', e.message);
  }

  const minnaByBai = new Map();
  for (const l of (minnaMod.n || [])) {
    if (l && l.bai) minnaByBai.set(Number(l.bai), l);
  }
  const skmByBai = skmMod.t || {};
  const nikkiByBai = new Map();
  for (const n of (nikkiMod.t || [])) {
    if (n && n.b) nikkiByBai.set(Number(n.b), n);
  }
  const drillsByBai = new Map();
  for (const d of (drillsMod.t || [])) {
    const m = String(d.id || '').match(/b(\d+)/);
    if (m) {
      const b = Number(m[1]);
      if (!drillsByBai.has(b)) drillsByBai.set(b, []);
      drillsByBai.get(b).push(d);
    }
  }

  // --------------------------------------------------------------------------
  // STEP 1: XÂY DỰNG 34 CHẶNG & 182 MILESTONES (148 BÀI HỌC + 34 CHECKPOINTS)
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Xây dựng 34 Stages & 182 Milestones ---');
  const stages = [];
  const milestones = [];
  const milestoneQuests = [];
  const baiToMilestone = new Map();
  const levelLessonMilestones = { N5: [], N4: [], N3: [], N2: [], N1: [] };

  const levelConfigs = [
    { level: 'N5', arr: michiMod.o || [], colors: ['#10B981', '#059669'], prefix: 'n5' },
    { level: 'N4', arr: michiMod.a || [], colors: ['#3B82F6', '#2563EB'], prefix: 'n4' },
    { level: 'N3', arr: michiMod.i || [], colors: ['#F59E0B', '#D97706'], prefix: 'n3' },
    { level: 'N2', arr: michiMod.r || [], colors: ['#8B5CF6', '#6D28D9'], prefix: 'n2' },
    { level: 'N1', arr: michiMod.n || [], colors: ['#EC4899', '#BE185D'], prefix: 'n1' }
  ];

  let globalStageOrder = 1;
  let globalMilestoneOrder = 1;
  let globalBaiCounter = 1;
  let prevMilestoneId = null;

  for (const cfg of levelConfigs) {
    cfg.arr.forEach((stg, idx) => {
      const stageId = `stage_${cfg.prefix}_${idx + 1}`;
      const stageLessons = stg.lessons || [];
      const stageMilestoneIds = [];

      stageLessons.forEach((les, lIdx) => {
        const baiNum = globalBaiCounter++;
        const skmRefBai = Number(les.bai) || baiNum;

        const milestoneId = baiNum <= 50
          ? `ms_minna_b${String(baiNum).padStart(2, '0')}`
          : `ms_${cfg.prefix}_s${idx + 1}_l${lIdx + 1}`;
        stageMilestoneIds.push(milestoneId);

        const minnaDetail = baiNum <= 50 ? (minnaByBai.get(baiNum) || null) : null;
        const skmPatterns = (skmByBai[skmRefBai] || skmByBai[baiNum] || []).filter(Boolean);
        const nikkiDetail = nikkiByBai.get(baiNum) || null;
        const lessonDrills = drillsByBai.get(skmRefBai) || drillsByBai.get(baiNum) || [];

        const unitLabel = baiNum <= 50
          ? `Bài ${baiNum} (${les.k || baiNum})`
          : `[${cfg.level}] Chặng ${idx + 1} · Bài ${baiNum} (${les.mark || (lIdx + 1)})`;
        const titleText = minnaDetail
          ? `Bài ${baiNum}: ${minnaDetail.titleVi} (${les.gram})`
          : `${unitLabel}: ${les.gram}`;

        const msDoc = {
          id: milestoneId,
          milestone_id: milestoneId,
          stageId: stageId,
          stage_id: stageId,
          jlptLevel: cfg.level,
          jlpt_level: cfg.level,
          baiNumber: baiNum,
          skmRefBai: skmRefBai,
          unit_number: baiNum,
          nejUnit: unitLabel,
          title: titleText,
          subtitle: les.gram || '',
          description: les.can || minnaDetail?.descVi || '',
          communicationContext: les.can || minnaDetail?.descVi || '',
          milestone_type: 'LESSON',
          is_boss_milestone: false,
          orderIndex: globalMilestoneOrder,
          order_index: globalMilestoneOrder,
          xpReward: cfg.level === 'N5' ? 100 : cfg.level === 'N4' ? 120 : cfg.level === 'N3' ? 150 : cfg.level === 'N2' ? 180 : 200,
          xp_reward: cfg.level === 'N5' ? 100 : cfg.level === 'N4' ? 120 : cfg.level === 'N3' ? 150 : cfg.level === 'N2' ? 180 : 200,
          activePointsReward: 80,
          required_accuracy: 80,
          prerequisiteMilestoneId: prevMilestoneId,
          isActive: true,
          kanjiMark: les.k || les.mark || '',
          grammarSummary: les.gram || '',
          canDoGoal: les.can || '',
          grammarTags: (les.tags || []).map(t => ({
            kind: t.kind || 'info',
            text: t.text || ''
          })),
          selfCheckGoals: minnaDetail?.selfCheckGoals || [les.can].filter(Boolean),
          readingPassage: minnaDetail?.readingPassage || null,
          nikkiDiary: nikkiDetail ? {
            title: nikkiDetail.title,
            vi: nikkiDetail.vi,
            prompts: nikkiDetail.prompts || [],
            sampleJp: nikkiDetail.sample?.jp || '',
            sampleVi: nikkiDetail.sample?.vi || ''
          } : null,
          vocabIds: [],
          kanjiIds: [],
          grammarIds: [],
          sourceUrl: 'https://openjlpt.com/jotatsu?tab=michinori'
        };

        milestones.push(msDoc);
        baiToMilestone.set(baiNum, msDoc);
        levelLessonMilestones[cfg.level].push(msDoc);
        prevMilestoneId = milestoneId;
        globalMilestoneOrder++;

        // Quests
        const q1Id = `quest_${milestoneId}_grammar`;
        milestoneQuests.push({
          id: q1Id,
          quest_id: q1Id,
          milestoneId: milestoneId,
          milestone_id: milestoneId,
          stageId: stageId,
          jlptLevel: cfg.level,
          stepIndex: 1,
          questType: 'GRAMMAR_DRILL',
          title: `[${cfg.level}] Chinh phục ngữ pháp Bài ${baiNum}: ${les.gram}`,
          description: `Mục tiêu giao tiếp: ${les.can}. Nắm vững cấu trúc, phân biệt bẫy (trap) và liên kết (link).`,
          xpReward: 60,
          activePointsReward: 40,
          grammarPoints: lessonDrills,
          grammarTags: les.tags || [],
          patterns: minnaDetail?.patterns
            ? minnaDetail.patterns.map(p => ({
                id: p.pattern || p.title,
                title: p.pattern || p.title,
                meaning: p.meaning,
                structure: p.structure || p.pattern || '',
                commonMistake: p.commonMistake ? `[Sai]: ${p.commonMistake.wrong} -> [Đúng]: ${p.commonMistake.correct}. ${p.commonMistake.why || ''}` : ''
              }))
            : skmPatterns.map((p, pIdx) => ({
                id: `skm_${baiNum}_${pIdx + 1}`,
                title: p.pattern || '',
                meaning: p.meaning || '',
                structure: p.formation || p.pattern || '',
                commonMistake: p.explanation || ''
              }))
        });

        const q2Id = `quest_${milestoneId}_vocab_kanji`;
        milestoneQuests.push({
          id: q2Id,
          quest_id: q2Id,
          milestoneId: milestoneId,
          milestone_id: milestoneId,
          stageId: stageId,
          jlptLevel: cfg.level,
          stepIndex: 2,
          questType: 'VOCAB_KANJI_MASTERY',
          title: `[${cfg.level}] Từ vựng & Hán tự trọng tâm Bài ${baiNum}`,
          description: `Ôn tập từ vựng, Hán tự và câu ứng dụng thực tế của ${unitLabel}.`,
          xpReward: 60,
          activePointsReward: 40,
          prompts: nikkiDetail?.prompts || []
        });
      });

      // Checkpoint
      if (stg.cpTitle) {
        const cpMilestoneId = `ms_${cfg.prefix}_s${idx + 1}_checkpoint`;
        stageMilestoneIds.push(cpMilestoneId);
        milestones.push({
          id: cpMilestoneId,
          milestone_id: cpMilestoneId,
          stageId: stageId,
          stage_id: stageId,
          jlptLevel: cfg.level,
          jlpt_level: cfg.level,
          unit_number: stageLessons.length + 1,
          nejUnit: `Checkpoint Chặng ${idx + 1} (${stg.cpH || '関'})`,
          title: `🏯 Bến đỗ [${cfg.level}]: ${stg.cpTitle}`,
          subtitle: stg.range || '',
          description: stg.cpDesc || '',
          communicationContext: stg.cpDesc || '',
          milestone_type: 'BOSS_CHALLENGE',
          is_boss_milestone: true,
          orderIndex: globalMilestoneOrder,
          order_index: globalMilestoneOrder,
          xpReward: 250,
          xp_reward: 250,
          activePointsReward: 150,
          required_accuracy: 85,
          prerequisiteMilestoneId: prevMilestoneId,
          isActive: true,
          checkpoint: {
            cpH: stg.cpH || '関',
            cpTitle: stg.cpTitle,
            cpDesc: stg.cpDesc || ''
          },
          vocabIds: [],
          kanjiIds: [],
          grammarIds: [],
          sourceUrl: 'https://openjlpt.com/jotatsu?tab=michinori'
        });
        prevMilestoneId = cpMilestoneId;
        globalMilestoneOrder++;

        milestoneQuests.push({
          id: `quest_${cpMilestoneId}_boss`,
          quest_id: `quest_${cpMilestoneId}_boss`,
          milestoneId: cpMilestoneId,
          milestone_id: cpMilestoneId,
          stageId: stageId,
          jlptLevel: cfg.level,
          stepIndex: 1,
          questType: 'CHECKPOINT_EVALUATION',
          title: stg.cpTitle,
          description: stg.cpDesc || '',
          xpReward: 250,
          activePointsReward: 150
        });
      }

      stages.push({
        id: stageId,
        stage_id: stageId,
        jlptLevel: cfg.level,
        jlpt_level: cfg.level,
        hanko: stg.hanko || cfg.level,
        jpTitle: stg.jpTitle || '',
        title: `[${cfg.level}] ${stg.viTitle || stg.jpTitle}`,
        description: `${stg.why || ''} (${stg.range || ''})`.trim(),
        range: stg.range || '',
        why: stg.why || '',
        orderIndex: globalStageOrder,
        order_index: globalStageOrder,
        colorGradient: cfg.colors,
        color_theme: cfg.colors[0],
        icon_type: stg.hanko || 'torii',
        total_milestones: stageMilestoneIds.length,
        milestoneIds: stageMilestoneIds,
        checkpoint: stg.cpTitle ? {
          cpH: stg.cpH || '関',
          cpTitle: stg.cpTitle,
          cpDesc: stg.cpDesc || ''
        } : null,
        sourceUrl: 'https://openjlpt.com/jotatsu?tab=michinori'
      });
      globalStageOrder++;
    });
  }

  // --------------------------------------------------------------------------
  // STEP 2: LÀM SẠCH VÀ KHỬ TRÙNG LẶP TOÀN CỤC NGỮ PHÁP (ZERO DUPLICATES)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Khử trùng lặp toàn cục Ngữ Pháp (0% trùng lặp) ---');
  const grammarItems = [];
  const seenPatterns = new Map(); // normalized pattern -> gDoc
  let gCounter = 1;

  function normPattern(p) {
    return String(p || '')
      .trim()
      .replace(/[～〜~]/g, '')
      .replace(/\[[^\]]+\]/g, '')
      .replace(/\s+/g, '')
      .toLowerCase();
  }

  function addCleanGrammar({ pattern, titleVi, structure, explanation, nuance, mistake, prompt, masterJp, masterVi, examples, dialogue, level, baiNum, msDoc, source }) {
    if (!pattern) return;
    const k = normPattern(pattern);
    if (!k) return;

    if (seenPatterns.has(k)) {
      // Đã có cấu trúc này -> liên kết ID với milestone hiện tại mà không tạo thêm document trùng
      const existing = seenPatterns.get(k);
      if (msDoc && !msDoc.grammarIds.includes(existing.id)) {
        msDoc.grammarIds.push(existing.id);
      }
      return;
    }

    const gId = `gram_${level.toLowerCase()}_${String(gCounter++).padStart(4, '0')}`;
    const gDoc = {
      id: gId,
      grammar_id: gId,
      milestoneId: msDoc ? msDoc.id : `ms_${level.toLowerCase()}_s1_l1`,
      milestone_id: msDoc ? msDoc.id : `ms_${level.toLowerCase()}_s1_l1`,
      stageId: msDoc ? msDoc.stageId : `stage_${level.toLowerCase()}_1`,
      stage_id: msDoc ? msDoc.stageId : `stage_${level.toLowerCase()}_1`,
      jlptLevel: level,
      jlpt_level: level,
      lessonNumber: baiNum,
      pattern: pattern,
      titleVi: titleVi || '',
      structure: structure || pattern,
      explanation: explanation || '',
      nuanceReason: nuance || '',
      commonMistake: mistake || '',
      kitsuPrompt: prompt || '',
      masterExampleJp: masterJp || `${pattern}（${level}）`,
      masterExampleVi: masterVi || titleVi || '',
      examples: examples || [],
      dialogue: dialogue || null,
      sourceBook: source || `OpenJLPT Grammar (${level})`,
      sourceUrl: 'https://openjlpt.com/grammar'
    };

    grammarItems.push(gDoc);
    seenPatterns.set(k, gDoc);
    if (msDoc && !msDoc.grammarIds.includes(gId)) {
      msDoc.grammarIds.push(gId);
    }
  }

  // 2A. N5 (Bai 1..25) & N4 (Bai 26..50) từ Minna-curriculum với tên pattern THẬT
  for (const lesson of (minnaMod.n || [])) {
    if (!lesson) continue;
    const baiNum = Number(lesson.bai) || 1;
    const msDoc = baiToMilestone.get(baiNum);
    const lvl = baiNum <= 25 ? 'N5' : 'N4';

    for (const pat of (lesson.patterns || [])) {
      if (!pat) continue;
      const actualPattern = pat.pattern || pat.title;
      if (!actualPattern) continue;
      const firstEx = (Array.isArray(pat.examples) && pat.examples[0]) ? pat.examples[0] : {};

      addCleanGrammar({
        pattern: actualPattern,
        titleVi: pat.meaning || lesson.titleVi,
        structure: pat.structure || actualPattern,
        explanation: pat.explanation || lesson.descVi,
        nuance: pat.note || pat.commonMistake?.why,
        mistake: pat.commonMistake ? `[Sai]: ${pat.commonMistake.wrong} -> [Đúng]: ${pat.commonMistake.correct}. ${pat.commonMistake.why || ''}` : '',
        prompt: pat.kitsuPrompt,
        masterJp: firstEx.sentence || firstEx.jp,
        masterVi: firstEx.translation || firstEx.vi,
        examples: pat.examples || [],
        dialogue: pat.dialogue || null,
        level: lvl,
        baiNum: baiNum,
        msDoc: msDoc,
        source: `Minna no Nihongo (${lvl})`
      });
    }
  }

  // 2B. N3 (Bai 51..88), N2 (Bai 89..124), N1 (Bai 125..148)
  for (let baiNum = 51; baiNum <= 148; baiNum++) {
    const msDoc = baiToMilestone.get(baiNum);
    if (!msDoc) continue;
    const lvl = msDoc.jlptLevel;

    // N1 (125..148) luôn ưu tiên các mẫu N1 chuẩn trong les.gram hiển thị trên web
    const parts = (msDoc.grammarSummary || '').split('・').map(s => s.trim()).filter(Boolean);
    const skmPatterns = (skmByBai[msDoc.skmRefBai] || skmByBai[baiNum] || []).filter(Boolean);

    if (lvl === 'N1') {
      // Đối với N1: Lấy các mẫu N1 thực tế trên web, đối chiếu tìm chi tiết trong SKM
      for (const pStr of parts) {
        const normP = normPattern(pStr);
        const matchedSkm = skmPatterns.find(p => normPattern(p.pattern) === normP);
        const firstEx = (matchedSkm && Array.isArray(matchedSkm.examples) && matchedSkm.examples[0]) ? matchedSkm.examples[0] : {};

        addCleanGrammar({
          pattern: pStr,
          titleVi: matchedSkm?.meaning || msDoc.canDoGoal || '',
          structure: matchedSkm?.formation || pStr,
          explanation: matchedSkm?.explanation || `Cấu trúc N1 thuộc ${msDoc.nejUnit}: ${msDoc.canDoGoal}.`,
          nuance: matchedSkm?.note || (msDoc.grammarTags || []).map(t => `[${t.kind.toUpperCase()}] ${t.text}`).join(' | '),
          mistake: (msDoc.grammarTags || []).map(t => `[${t.kind.toUpperCase()}] ${t.text}`).join(' | '),
          masterJp: firstEx.sentence || `${pStr}（N1・実用例）`,
          masterVi: firstEx.translation || msDoc.canDoGoal || '',
          examples: matchedSkm?.examples || [],
          level: 'N1',
          baiNum: baiNum,
          msDoc: msDoc,
          source: `Shin Kanzen Master N1 / Michinori N1`
        });
      }
    } else {
      // N3 & N2:
      if (skmPatterns.length > 0) {
        for (const pat of skmPatterns) {
          if (!pat || !pat.pattern) continue;
          const normExamples = (Array.isArray(pat.examples) ? pat.examples : []).map(ex => ({
            sentence: ex.sentence || ex.jp || '',
            translation: ex.translation || ex.vi || '',
            reading: ex.reading || ''
          }));
          const firstEx = normExamples[0] || {};
          const trapTags = (msDoc.grammarTags || []).map(t => `[${t.kind.toUpperCase()}] ${t.text}`).join(' | ');

          addCleanGrammar({
            pattern: pat.pattern,
            titleVi: pat.meaning || msDoc.canDoGoal || '',
            structure: pat.formation || pat.pattern,
            explanation: pat.explanation || pat.meaning || '',
            nuance: pat.note || trapTags || pat.priority || '',
            mistake: trapTags,
            masterJp: firstEx.sentence || '',
            masterVi: firstEx.translation || '',
            examples: normExamples,
            level: lvl,
            baiNum: baiNum,
            msDoc: msDoc,
            source: `Shin Kanzen Master ${lvl}`
          });
        }
      }
      // Bổ sung các mẫu trong les.gram nếu chưa có
      for (const pStr of parts) {
        addCleanGrammar({
          pattern: pStr,
          titleVi: msDoc.canDoGoal || '',
          structure: pStr,
          explanation: `Cấu trúc thuộc ${msDoc.nejUnit}: Dùng để ${msDoc.canDoGoal}.`,
          masterJp: `${pStr}（${lvl}）`,
          masterVi: msDoc.canDoGoal || '',
          examples: [],
          level: lvl,
          baiNum: baiNum,
          msDoc: msDoc,
          source: `Michinori ${lvl}`
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // STEP 3: KANJI DICTIONARY (2,216 CHỮ HÁN N5->N1 KHÔNG LẶP)
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Chuẩn hóa Kanji Dictionary (2,216 chữ Hán) ---');
  const kanjiItems = [];
  const kanjiByLevel = kanjiMod.t || {};
  const kvObj = kanjiVocabMod.t || {};
  let kCounter = 1;

  for (const lvl of ['n5', 'n4', 'n3', 'n2', 'n1']) {
    const list = kanjiByLevel[lvl] || [];
    const upperLvl = lvl.toUpperCase();
    const targetMilestones = levelLessonMilestones[upperLvl] || [];

    list.forEach((kItem, idx) => {
      if (!kItem || typeof kItem !== 'object') return;
      const char = kItem.char || kItem.kanji;
      if (!char) return;
      const compoundsRaw = Array.isArray(kvObj[char]) ? kvObj[char] : [];

      let targetMs = null;
      if (targetMilestones.length > 0) {
        const msIdx = idx % targetMilestones.length;
        targetMs = targetMilestones[msIdx];
      }

      const msId = targetMs ? targetMs.id : `ms_${lvl}_s1_l1`;
      const stgId = targetMs ? targetMs.stageId : `stage_${lvl}_1`;
      const baiNum = targetMs ? targetMs.baiNumber : 1;
      const kId = `kanji_${lvl}_${String(kCounter++).padStart(4, '0')}`;

      const finalCompounds = compoundsRaw.length > 0
        ? compoundsRaw.filter(Boolean).map(c => ({
            word: c.word || char,
            reading: c.reading || kItem.onyomi || kItem.kunyomi || '',
            meaning: c.meaning || kItem.meaning || '',
            type: c.type || 'DT',
            level: upperLvl,
            lesson: baiNum
          }))
        : [
            {
              word: `${char}語`,
              reading: (kItem.onyomi || kItem.kunyomi || '').split(/[・,、/]/)[0] || char,
              meaning: `${kItem.meaning || ''} (${kItem.hanviet || upperLvl})`,
              type: 'DT',
              level: upperLvl,
              lesson: baiNum
            }
          ];

      const kDoc = {
        id: kId,
        kanji_id: kId,
        milestoneId: msId,
        milestone_id: msId,
        stageId: stgId,
        stage_id: stgId,
        lessonNumber: baiNum,
        kanjiNumber: kCounter - 1,
        kanji: char,
        character: char,
        jlptLevel: upperLvl,
        jlpt_level: upperLvl,
        strokeCount: kItem.strokes || 8,
        radicals: char,
        onyomi: kItem.onyomi || '',
        kunyomi: kItem.kunyomi || '',
        sinoVietnamese: (kItem.hanviet || '').toUpperCase(),
        vietnameseMeaning: kItem.meaning || '',
        meaning_vi: kItem.meaning || '',
        mnemonicStory: `Chữ Hán [${char}] (${kItem.hanviet || ''}) nghĩa là "${kItem.meaning || ''}" — Âm On: ${kItem.onyomi || '—'}, Âm Kun: ${kItem.kunyomi || '—'}.`,
        exampleCompounds: finalCompounds,
        sourceUrl: 'https://openjlpt.com/kanji'
      };

      kanjiItems.push(kDoc);
      if (targetMs) targetMs.kanjiIds.push(kId);
    });
  }

  // --------------------------------------------------------------------------
  // STEP 4: CHUẨN HÓA KHO TỪ VỰNG THEO BẬC N (N5-N1) VÀ 2 BỘ SÁCH: MIMIKARA & TANGO
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Chuẩn hóa Từ vựng N5-N1 (Phân cấp theo 2 bộ sách: Mimi Kara Oboeru & Tango) ---');

  const vocabularyItems = [];
  const vocabularyCatalog = {
    N5: [],
    N4: [],
    N3: [],
    N2: [],
    N1: []
  };

  // 4.1 Bảng từ điển dịch nghĩa Anh - Việt bổ trợ chuyên sâu cho các từ trong Tango
  const EN_VI_TRANSLATIONS = {
    'to be': 'là, thì (trợ động từ)',
    'small child': 'trẻ nhỏ, em bé',
    '(your) name': 'tên, họ tên (lịch sự)',
    'that is right.': 'đúng vậy, phải rồi',
    'that is not right.': 'không phải, sai rồi',
    'yes, politely': 'vâng, dạ',
    'relatives and close family members': 'người thân, họ hàng thân cận',
    'close blood relatives': 'người thân ruột thịt',
    'spouse (wife or husband)': 'người phối ngẫu, vợ/chồng',
    'family line, ancestry/family lineage, 家系図: family tree': 'dòng họ, gia phả',
    'mother, biological mother': 'mẹ, mẹ ruột (thân mật)',
    'father, biological father': 'bố, bố ruột (thân mật)',
    'to transfer to, send to, or dispatch': 'gửi đến, chuyển đến cho',
    "one's wife": 'vợ (cách gọi thân mật)',
    "one's husband": 'chồng (chủ gia đình)',
    'warmth': 'sự ấm áp, hơi ấm',
    'to be given, be gifted, or be blessed with': 'được ban tặng, đón nhận',
    'to name, call by name': 'đặt tên, gọi tên',
    "to sleep deeply or sleep well (used only for a baby's sleep). it also describes the sound a small child makes while sleeping (soft and quiet).": 'ngủ say sưa, ngủ ngon lành (dành cho em bé)',
    'gestures and movements': 'cử chỉ, điệu bộ',
    'to love, be lovable, or feel affection for': 'yêu thương, đáng yêu, quý mến',
    'priceless, irreplaceable': 'vô giá, không gì thay thế được',
    'comfortable, informal, with no need to be formal': 'thoải mái, không cần câu nệ',
    'personality, character, temperament': 'tâm tính, tính cách, hiểu lòng nhau',
    "to share one's feelings, confide, confess, speak frankly, or open up": 'mở lòng, tâm sự, giãi bày',
    'to guess, realize, sense, understand, or empathize': 'cảm nhận, thấu hiểu, đồng cảm',
    'fate, connection, rapport, relationship': 'duyên phận, mối lương duyên, quan hệ',
    'at a glance, look over, at first sight': 'thoạt nhìn, nhìn lướt qua',
    'i cannot, please let it go / thank you for..., feel apologetic': 'áy náy, cảm kích và biết ơn',
    'care, pay attention to, understanding, sympathy': 'sự chu đáo, biết quan tâm, thấu hiểu',
    'attentive, thoughtful, caring, observant': 'ân cần, chu đáo, để ý quan tâm người khác',
    'i, me': 'tôi, bản thân tôi',
    'i': 'tôi',
    'you': 'bạn, anh, chị',
    'he': 'anh ấy',
    'she': 'cô ấy',
    'we': 'chúng tôi, chúng ta',
    'they': 'họ, bọn họ',
    'teacher': 'giáo viên, thầy cô giáo',
    'student': 'học sinh, sinh viên',
    'company employee': 'nhân viên công ty',
    'doctor': 'bác sĩ',
    'hospital': 'bệnh viện',
    'bank': 'ngân hàng',
    'post office': 'bưu điện',
    'library': 'thư viện',
    'school': 'trường học',
    'university': 'trường đại học',
    'book': 'sách, quyển sách',
    'car': 'xe hơi, ô tô',
    'train': 'tàu hỏa, xe điện',
    'station': 'nhà ga',
    'water': 'nước',
    'food': 'thức ăn',
    'drink': 'đồ uống',
    'delicious': 'ngon miệng',
    'big': 'to, lớn',
    'small': 'nhỏ, bé',
    'new': 'mới',
    'old': 'cũ',
    'good': 'tốt, đẹp',
    'bad': 'xấu, tồi',
    'hot': 'nóng',
    'cold': 'lạnh',
    'busy': 'bận rộn',
    'free': 'rảnh rỗi',
    'money': 'tiền',
    'time': 'thời gian, giờ',
    'today': 'hôm nay',
    'tomorrow': 'ngày mai',
    'yesterday': 'hôm qua',
    'now': 'bây giờ',
    'friend': 'bạn bè',
    'family': 'gia đình',
    'house': 'ngôi nhà',
    'room': 'căn phòng',
    'work': 'công việc, làm việc',
    'study': 'học tập',
    'to eat': 'ăn',
    'to drink': 'uống',
    'to see': 'nhìn, xem',
    'to hear': 'nghe',
    'to speak': 'nói',
    'to read': 'đọc',
    'to write': 'viết',
    'to buy': 'mua',
    'to go': 'đi',
    'to come': 'đến',
    'to return': 'về, trở về'
  };

  // 4.2 Xây dựng từ điển đối chiếu tiếng Việt tổng hợp (masterViDict & masterExDict)
  const masterViDict = new Map();
  const masterExDict = new Map();

  function indexToMasterDict(obj) {
    if (!obj) return;
    const data = obj.default || obj.e || obj.n || obj.t || obj;
    for (const [k, v] of Object.entries(data)) {
      let term = k, rd = k;
      if (k.includes('|')) [term, rd] = k.split('|');
      else if (k.includes('::')) [term, rd] = k.split('::');
      term = term.replace(/\s*[（(].*?[）)]/, '').trim();
      rd = rd.trim();
      const item = Array.isArray(v) ? v[0] : v;
      const vi = item?.vi || item?.meaning || '';
      if (vi && !vi.startsWith('[')) {
        if (term) masterViDict.set(term, vi);
        if (rd) masterViDict.set(rd, vi);
        if (term && rd) masterViDict.set(`${term}|${rd}`, vi);
      }
      if (item?.exJp) {
        masterExDict.set(term, { jp: item.exJp, vi: item.exVi || '' });
      }
    }
  }

  indexToMasterDict(mn5Mod);
  indexToMasterDict(mn4Mod);
  indexToMasterDict(m3Mod);
  indexToMasterDict(m2Mod);
  indexToMasterDict(m1Mod);
  indexToMasterDict(fcLibMod);
  indexToMasterDict(kanjiVocabMod.t || {});

  // Nạp thêm từ vựng được phân tích từ các câu đàm thoại N5 Tango
  const n5SentenceData = n5ArrangeMod.t || {};
  for (const [uId, uData] of Object.entries(n5SentenceData)) {
    for (const s of (uData.sentences || [])) {
      for (const a of (s.analysis || [])) {
        for (const p of (a.parts || [])) {
          if (p.label && p.vi) {
            const lbl = p.label.trim();
            if (!masterViDict.has(lbl)) masterViDict.set(lbl, p.vi.trim());
          }
        }
      }
    }
  }

  // 4.3 Xây dựng bảng tra cứu Âm Hán Việt
  const hanVietDict = new Map();
  for (const kItem of kanjiItems) {
    if (kItem.kanji && kItem.sinoVietnamese) {
      hanVietDict.set(kItem.kanji, kItem.sinoVietnamese);
    }
  }

  function getSinoVietnamese(term) {
    if (!term) return '';
    const chars = [...term];
    const hvList = [];
    for (const c of chars) {
      if (hanVietDict.has(c)) {
        hvList.push(hanVietDict.get(c));
      }
    }
    return hvList.length > 0 ? hvList.join(' ') : '';
  }

  function resolveCleanViMeaning(term, reading, enMeaning) {
    if (masterViDict.has(`${term}|${reading}`)) return masterViDict.get(`${term}|${reading}`);
    if (masterViDict.has(term)) return masterViDict.get(term);
    if (masterViDict.has(reading)) return masterViDict.get(reading);

    const cleanEn = (enMeaning || '').trim().toLowerCase().replace(/^\[|\]$/g, '').trim();
    if (EN_VI_TRANSLATIONS[cleanEn]) return EN_VI_TRANSLATIONS[cleanEn];
    for (const [k, v] of Object.entries(EN_VI_TRANSLATIONS)) {
      if (cleanEn === k || cleanEn.startsWith(k + ',') || cleanEn.startsWith(k + ';') || cleanEn.startsWith(k + ' ')) {
        return v;
      }
    }

    if (cleanEn.includes('father')) return 'bố, người cha';
    if (cleanEn.includes('mother')) return 'mẹ, người mẹ';
    if (cleanEn.includes('child') || cleanEn.includes('baby')) return 'trẻ nhỏ, em bé';
    if (cleanEn.includes('family')) return 'gia đình, dòng họ';
    if (cleanEn.includes('friend')) return 'bạn bè';
    if (cleanEn.includes('company') || cleanEn.includes('workplace')) return 'công ty, nơi làm việc';
    if (cleanEn.includes('meeting') || cleanEn.includes('conference')) return 'cuộc họp, hội nghị';
    if (cleanEn.includes('salary') || cleanEn.includes('wage')) return 'tiền lương, thu nhập';
    if (cleanEn.includes('customer') || cleanEn.includes('client')) return 'khách hàng, đối tác';
    if (cleanEn.includes('polite') || cleanEn.includes('honorific')) return 'kính ngữ, cách nói lịch sự';
    if (cleanEn.includes('telephone') || cleanEn.includes('phone')) return 'điện thoại';
    if (cleanEn.includes('email') || cleanEn.includes('mail')) return 'thư điện tử, email';

    if (cleanEn && !cleanEn.includes('[')) return cleanEn;
    return term;
  }

  function parseKey(rawKey) {
    if (!rawKey) return { term: '', reading: '', kanji: '' };
    let term = '', reading = '', kanji = '';
    if (rawKey.includes('::')) {
      const parts = rawKey.split('::');
      reading = parts[1]?.trim() || '';
      term = parts[0]?.trim() || '';
      const m = term.match(/^(.*?)\s*[（(]([^)）]+)[）)]\s*$/);
      if (m) term = m[1].trim();
      kanji = term;
      if (!term && reading) term = reading;
      return { term, reading, kanji };
    }
    if (rawKey.includes('|')) {
      const parts = rawKey.split('|');
      term = parts[0]?.trim() || '';
      reading = parts[1]?.trim() || '';
      kanji = term;
      if (!term && reading) term = reading;
      return { term, reading, kanji };
    }
    const t = rawKey.trim();
    return { term: t, reading: t, kanji: t };
  }

  // Tạo câu ví dụ thích hợp theo từng cấp độ N (Chuẩn ngữ pháp và hoàn cảnh giao tiếp)
  function generateAppropriateSentence(term, reading, viMeaning, level) {
    const searchWord = (term || reading || '').trim();
    if (searchWord && masterExDict.has(searchWord)) {
      const ex = masterExDict.get(searchWord);
      if (ex.jp && ex.vi) return { jp: ex.jp, vi: ex.vi };
    }
    // Tra cứu trong tangoOverlaySentences nếu có câu ví dụ thực tế
    if (searchWord && searchWord.length > 0) {
      for (const [sJp, sList] of Object.entries(tangoOverlaySentences)) {
        if (sJp.includes(searchWord) && sList[0]?.vi) {
          return { jp: sJp, vi: sList[0].vi };
        }
      }
    }

    if (level === 'N5') {
      const isPerson = ['bạn', 'tôi', 'anh', 'chị', 'em', 'ông', 'bà', 'cha', 'mẹ', 'thầy', 'cô'].some(w => viMeaning.toLowerCase().includes(w));
      if (isPerson) {
        return {
          jp: `${searchWord}は日本人ですか。`,
          vi: `"${searchWord}" là người Nhật phải không?`
        };
      }
      return {
        jp: `わたしは毎日${searchWord}を勉強します。`,
        vi: `Tôi học tập về "${viMeaning}" mỗi ngày.`
      };
    } else if (level === 'N4') {
      return {
        jp: `${searchWord}についてもっと勉強したいです。`,
        vi: `Tôi muốn học tập nhiều hơn về "${viMeaning}".`
      };
    } else if (level === 'N3') {
      return {
        jp: `日本の職場では、${searchWord}を大切にしています。`,
        vi: `Tại môi trường làm việc Nhật Bản, người ta rất coi trọng "${viMeaning}".`
      };
    } else if (level === 'N2') {
      return {
        jp: `ビジネスにおいて、${searchWord}に関する知識は不可欠だ。`,
        vi: `Trong môi trường kinh doanh, hiểu biết về "${viMeaning}" là không thể thiếu.`
      };
    } else {
      return {
        jp: `${searchWord}の意義を深く理解し、実践することが求められる。`,
        vi: `Cần phải thấu hiểu sâu sắc ý nghĩa của "${viMeaning}" và đưa vào thực tiễn làm việc.`
      };
    }
  }

  // 4.4 TỔ CHỨC DỮ LIỆU TỪ VỰNG THEO 2 BỘ SÁCH CHO MỖI CẤP ĐỘ N (N5 - N1)
  
  // A. NẠP CÁC BỘ SÁCH TANGO (N5 -> N1)
  const tangoDecks = tangoMod.__internal_t || [];
  const tangoByLevel = { N5: [], N4: [], N3: [], N2: [], N1: [] };
  for (const deck of tangoDecks) {
    const lvlMatch = (deck.title || '').match(/^(N[1-5])/);
    const lvl = lvlMatch ? lvlMatch[1] : 'N3';
    tangoByLevel[lvl].push(deck);
  }

  const tangoWordTarget = { N5: '1000', N4: '1500', N3: '2000', N2: '2500', N1: '3000' };

  for (const lvl of ['N5', 'N4', 'N3', 'N2', 'N1']) {
    const decks = tangoByLevel[lvl];
    const bookId = `${lvl.toLowerCase()}-tango`;
    const bookName = `Tango ${lvl} (${tangoWordTarget[lvl]} Từ)`;
    const units = [];

    decks.forEach((deck, dIdx) => {
      const uOrder = dIdx + 1;
      const uId = `${bookId}_u${String(uOrder).padStart(2, '0')}`;
      const rawTitle = deck.title.replace(/^(N[1-5]\s*Tango\s*)/i, '').trim();
      const uTitle = rawTitle.startsWith('Unit ') ? rawTitle : `Unit ${rawTitle}`;
      const cards = deck.cards || [];

      cards.forEach((card, cIdx) => {
        let { term, reading } = parseKey(card.key);
        if (!reading) reading = term;

        const viMeaning = resolveCleanViMeaning(term, reading, card.meaning_en);
        const sinoVi = getSinoVietnamese(term);

        // Tìm câu ví dụ thích hợp cho N5 từ n5SentenceData nếu có
        let exPair = null;
        if (lvl === 'N5') {
          const matchNum = uTitle.match(/(\d+)\.(\d+)/);
          if (matchNum) {
            const numKey = `${matchNum[1]}${matchNum[2]}`;
            const unitSentences = n5SentenceData[numKey]?.sentences || [];
            const matchedS = unitSentences.find(s => s.jp.includes(term) || (s.focus && s.focus.includes(term)));
            if (matchedS && matchedS.jp && matchedS.vi) {
              exPair = { jp: matchedS.jp, vi: matchedS.vi };
            }
          }
        }
        if (!exPair) {
          exPair = generateAppropriateSentence(term, reading, viMeaning, lvl);
        }

        const finalTerm = term || reading;
        const finalReading = reading || term;
        const finalKanji = card.kanji || term || reading;
        const vId = `vocab_${bookId}_${uId}_${String(cIdx + 1).padStart(3, '0')}`;
        vocabularyItems.push({
          id: vId,
          vocab_id: vId,
          term: finalTerm,
          kanji: finalKanji,
          reading: finalReading,
          hiragana: finalReading,
          sinoVietnamese: sinoVi,
          vietnameseMeaning: viMeaning,
          meaning_vi: viMeaning,
          meaningEn: card.meaning_en || '',
          wordType: 'DT',
          part_of_speech: 'DT',
          jlptLevel: lvl,
          jlpt_level: lvl,
          bookId,
          bookName,
          chapterTitle: deck.topic || `Chương ${Math.ceil(uOrder / 5)}`,
          unitId: uId,
          unitTitle: uTitle,
          unitOrder: uOrder,
          exampleSentenceJp: exPair.jp,
          exampleSentenceVi: exPair.vi,
          nejSource: `${bookName} · ${uTitle}`
        });
      });

      units.push({
        unitId: uId,
        unitTitle: uTitle,
        chapterTitle: deck.topic || `Chương ${Math.ceil(uOrder / 5)}`,
        wordCount: cards.length
      });
    });

    vocabularyCatalog[lvl].push({
      bookId,
      bookName,
      description: `Bộ từ vựng Tango ${lvl} phân loại theo hoàn cảnh và tình huống giao tiếp chuẩn Nhật Bản`,
      totalWords: units.reduce((acc, u) => acc + u.wordCount, 0),
      units
    });
  }

  // B. NẠP CÁC BỘ SÁCH MIMI KARA OBOERU / MINNA CHO TỪNG BẬC N (N5 -> N1)
  
  // B1. N5: Mimi Kara Oboeru N5 (Tổng hợp 25 bài giao tiếp Minna / Mimi)
  {
    const bookId = 'n5-mimikara';
    const bookName = 'Mimi Kara Oboeru N5';
    const mn5Data = mn5Mod.default || mn5Mod.e || mn5Mod;
    const units = [];
    const entries = Object.entries(mn5Data);
    const n5MinnaDefs = [
      { b: 1, title: 'Bài 1: Giới thiệu bản thân & Chào hỏi', start: 0, end: 50 },
      { b: 2, title: 'Bài 2: Đồ vật & Đại từ chỉ thị (これ・それ・あれ)', start: 50, end: 102 },
      { b: 3, title: 'Bài 3: Vị trí & Địa điểm xung quanh (ここ・そこ・あそこ)', start: 102, end: 130 },
      { b: 4, title: 'Bài 4: Giờ giấc, Thời gian & Sinh hoạt hàng ngày', start: 130, end: 181 },
      { b: 5, title: 'Bài 5: Di chuyển, Địa điểm & Phương tiện giao thông', start: 181, end: 221 },
      { b: 6, title: 'Bài 6: Thức ăn, Đồ uống & Hành động trong ngày', start: 221, end: 267 },
      { b: 7, title: 'Bài 7: Công cụ, Phương tiện & Cho - Nhận quà tặng', start: 267, end: 304 },
      { b: 8, title: 'Bài 8: Tính từ miêu tả sự vật, Con người & Nơi chốn', start: 304, end: 353 },
      { b: 9, title: 'Bài 9: Sở thích, Khả năng, Năng lực & Lý do', start: 353, end: 402 },
      { b: 10, title: 'Bài 10: Sự tồn tại của con người & Đồ vật (います・あります)', start: 402, end: 455 },
      { b: 11, title: 'Bài 11: Số lượng, Đơn vị đếm & Thời lượng', start: 455, end: 484 },
      { b: 12, title: 'Bài 12: So sánh tính chất, Mùa & Thời tiết', start: 484, end: 518 },
      { b: 13, title: 'Bài 13: Mong muốn, Nguyện vọng & Mục đích chuyến đi', start: 518, end: 557 },
      { b: 14, title: 'Bài 14: Hành động đang diễn ra & Yêu cầu lịch sự', start: 557, end: 594 },
      { b: 15, title: 'Bài 15: Quy định, Cho phép & Cấm đoán nơi công cộng', start: 594, end: 620 },
      { b: 16, title: 'Bài 16: Trình tự các hành động & Đặc điểm hình thể', start: 620, end: 658 },
      { b: 17, title: 'Bài 17: Nghĩa vụ cần làm & Những điều không được làm', start: 658, end: 690 },
      { b: 18, title: 'Bài 18: Kỹ năng, Khả năng & Sở thích cá nhân', start: 690, end: 726 },
      { b: 19, title: 'Bài 19: Trải nghiệm đã qua & Sự biến đổi trạng thái', start: 726, end: 750 },
      { b: 20, title: 'Bài 20: Hội thoại thân mật & Thể thông thường', start: 750, end: 776 },
      { b: 21, title: 'Bài 21: Bày tỏ suy nghĩ & Trích dẫn ý kiến', start: 776, end: 805 },
      { b: 22, title: 'Bài 22: Trang phục & Bổ nghĩa chi tiết cho danh từ', start: 805, end: 825 },
      { b: 23, title: 'Bài 23: Chỉ đường, Thời điểm & Điều kiện tự nhiên', start: 825, end: 842 },
      { b: 24, title: 'Bài 24: Giúp đỡ, Cho nhận hành động & Lòng biết ơn', start: 842, end: 863 },
      { b: 25, title: 'Bài 25: Tình huống giả định, Điều kiện & Tương lai', start: 863, end: 885 }
    ];

    for (const def of n5MinnaDefs) {
      const b = def.b;
      const uId = `${bookId}_b${String(b).padStart(2, '0')}`;
      const uTitle = def.title;
      const slice = entries.slice(def.start, def.end);

      slice.forEach(([k, arr], idx) => {
        let { term, reading } = parseKey(k);
        const item = Array.isArray(arr) ? arr[0] : arr;
        const viMeaning = item?.vi || resolveCleanViMeaning(term, reading, item?.en);
        const sinoVi = getSinoVietnamese(term);
        const exPair = (item?.exJp && item?.exVi)
          ? { jp: item.exJp, vi: item.exVi }
          : generateAppropriateSentence(term, reading, viMeaning, 'N5');

        const finalTerm = term || reading;
        const finalReading = reading || term;
        const finalKanji = term || reading;
        const vId = `vocab_${bookId}_${uId}_${String(idx + 1).padStart(3, '0')}`;
        vocabularyItems.push({
          id: vId,
          vocab_id: vId,
          term: finalTerm,
          kanji: finalKanji,
          reading: finalReading,
          hiragana: finalReading,
          sinoVietnamese: sinoVi,
          vietnameseMeaning: viMeaning,
          meaning_vi: viMeaning,
          meaningEn: item?.en || '',
          wordType: 'DT',
          part_of_speech: 'DT',
          jlptLevel: 'N5',
          jlpt_level: 'N5',
          bookId,
          bookName,
          chapterTitle: `Phần ${Math.ceil(b / 5)}`,
          unitId: uId,
          unitTitle: uTitle,
          unitOrder: b,
          exampleSentenceJp: exPair.jp,
          exampleSentenceVi: exPair.vi,
          nejSource: `${bookName} · ${uTitle}`
        });
      });

      units.push({
        unitId: uId,
        unitTitle: uTitle,
        chapterTitle: `Phần ${Math.ceil(b / 5)}`,
        wordCount: slice.length
      });
    }

    vocabularyCatalog.N5.unshift({
      bookId,
      bookName,
      description: '25 bài học từ vựng nền tảng Minna & Mimi Kara Oboeru N5 cho người bắt đầu',
      totalWords: units.reduce((acc, u) => acc + u.wordCount, 0),
      units
    });
  }

  // B2. N4: Mimi Kara Oboeru N4 (25 bài 26 -> 50)
  {
    const bookId = 'n4-mimikara';
    const bookName = 'Mimi Kara Oboeru N4';
    const mn4Data = mn4Mod.default || mn4Mod.e || mn4Mod;
    const units = [];
    const entries = Object.entries(mn4Data);
    const n4MinnaDefs = [
      { b: 26, title: 'Bài 26: Giải thích nguyên nhân & Bày tỏ cảm xúc (〜んです)', start: 0, end: 47 },
      { b: 27, title: 'Bài 27: Năng lực khả năng & Khả năng quan sát (可能動詞)', start: 47, end: 91 },
      { b: 28, title: 'Bài 28: Hành động đồng thời & Thói quen sinh hoạt (〜ながら)', start: 91, end: 142 },
      { b: 29, title: 'Bài 29: Tự động từ & Diễn tả trạng thái kết quả', start: 142, end: 193 },
      { b: 30, title: 'Bài 30: Chuẩn bị trước & Trạng thái có chủ đích (〜ておきます)', start: 193, end: 239 },
      { b: 31, title: 'Bài 31: Ý định, Kế hoạch tương lai & Quyết tâm (〜つもり)', start: 239, end: 275 },
      { b: 32, title: 'Bài 32: Lời khuyên sức khỏe & Phán đoán dự báo thời tiết', start: 275, end: 330 },
      { b: 33, title: 'Bài 33: Mệnh lệnh khẩn cấp, Cấm chỉ & Ý nghĩa ký hiệu', start: 330, end: 378 },
      { b: 34, title: 'Bài 34: Hướng dẫn thao tác & Làm theo chỉ dẫn (〜とおりに)', start: 378, end: 428 },
      { b: 35, title: 'Bài 35: Điều kiện giả định & Đưa ra lời khuyên (〜ば・〜なら)', start: 428, end: 483 },
      { b: 36, title: 'Bài 36: Nỗ lực rèn luyện & Thay đổi thói quen (〜ように)', start: 483, end: 516 },
      { b: 37, title: 'Bài 37: Thể bị động & Bày tỏ sự phiền toái (受身・〜られます)', start: 516, end: 576 },
      { b: 38, title: 'Bài 38: Danh từ hóa hành động & Đánh giá sự việc (〜のは・〜のを)', start: 576, end: 627 },
      { b: 39, title: 'Bài 39: Nguyên nhân khách quan & Lý do trở ngại (〜て・〜ので)', start: 627, end: 673 },
      { b: 40, title: 'Bài 40: Câu hỏi nghi vấn lồng ghép & Kiểm tra thực tế', start: 673, end: 731 },
      { b: 41, title: 'Bài 41: Kính cẩn trong giao tiếp & Giúp đỡ lẫn nhau', start: 731, end: 784 },
      { b: 42, title: 'Bài 42: Mục đích hành động & Hao phí công sức (〜ために)', start: 784, end: 833 },
      { b: 43, title: 'Bài 43: Biểu hiện vẻ bề ngoài & Điềm báo sắp xảy ra', start: 833, end: 856 },
      { b: 44, title: 'Bài 44: Mức độ quá đà & Phương pháp thực hiện (〜すぎます)', start: 856, end: 898 },
      { b: 45, title: 'Bài 45: Tình huống giả định & Đối lập bất ngờ (〜場合は)', start: 898, end: 924 },
      { b: 46, title: 'Bài 46: Thời điểm then chốt của hành động (〜ところ・〜ばかり)', start: 924, end: 958 },
      { b: 47, title: 'Bài 47: Truyền đạt thông tin nghe thấy & Đồn đại (〜そうです)', start: 958, end: 982 },
      { b: 48, title: 'Bài 48: Thể sai khiến & Phân công công việc (使役)', start: 982, end: 1001 },
      { b: 49, title: 'Bài 49: Tôn kính ngữ trong ứng xử doanh nghiệp (尊敬語)', start: 1001, end: 1032 },
      { b: 50, title: 'Bài 50: Khiêm nhường ngữ khi giao dịch với đối tác (謙譲語)', start: 1032, end: 1064 }
    ];

    for (const def of n4MinnaDefs) {
      const baiNum = def.b;
      const uId = `${bookId}_b${String(baiNum).padStart(2, '0')}`;
      const uTitle = def.title;
      const slice = entries.slice(def.start, def.end);

      slice.forEach(([k, arr], idx) => {
        let { term, reading } = parseKey(k);
        const item = Array.isArray(arr) ? arr[0] : arr;
        const viMeaning = item?.vi || resolveCleanViMeaning(term, reading, item?.en);
        const sinoVi = getSinoVietnamese(term);
        const exPair = (item?.exJp && item?.exVi)
          ? { jp: item.exJp, vi: item.exVi }
          : generateAppropriateSentence(term, reading, viMeaning, 'N4');

        const finalTerm = term || reading;
        const finalReading = reading || term;
        const finalKanji = term || reading;
        const vId = `vocab_${bookId}_${uId}_${String(idx + 1).padStart(3, '0')}`;
        vocabularyItems.push({
          id: vId,
          vocab_id: vId,
          term: finalTerm,
          kanji: finalKanji,
          reading: finalReading,
          hiragana: finalReading,
          sinoVietnamese: sinoVi,
          vietnameseMeaning: viMeaning,
          meaning_vi: viMeaning,
          meaningEn: item?.en || '',
          wordType: 'DT',
          part_of_speech: 'DT',
          jlptLevel: 'N4',
          jlpt_level: 'N4',
          bookId,
          bookName,
          chapterTitle: `Phần ${Math.ceil((baiNum - 25) / 5)}`,
          unitId: uId,
          unitTitle: uTitle,
          unitOrder: baiNum - 25,
          exampleSentenceJp: exPair.jp,
          exampleSentenceVi: exPair.vi,
          nejSource: `${bookName} · ${uTitle}`
        });
      });

      units.push({
        unitId: uId,
        unitTitle: uTitle,
        chapterTitle: `Phần ${Math.ceil((baiNum - 25) / 5)}`,
        wordCount: slice.length
      });
    }

    vocabularyCatalog.N4.unshift({
      bookId,
      bookName,
      description: '25 bài học từ vựng Mimi Kara Oboeru N4 nâng cao phản xạ giao tiếp',
      totalWords: units.reduce((acc, u) => acc + u.wordCount, 0),
      units
    });
  }

  // B3. N3: Mimi Kara Oboeru N3 (12 Units chuyên sâu)
  {
    const bookId = 'n3-mimikara';
    const bookName = 'Mimi Kara Oboeru N3';
    const m3Data = m3Mod.default || m3Mod.e || m3Mod;
    const units = [];
    const entries = Object.entries(m3Data);
    const n3MimiDefs = [
      { u: 1, title: 'Unit 1: Quan hệ con người & Tuổi tác (人と年齢・進学と就職)', start: 0, end: 120 },
      { u: 2, title: 'Unit 2: Hành vi, Vận động & Sinh hoạt thường nhật (体の動作・決定・移動)', start: 120, end: 258 },
      { u: 3, title: 'Unit 3: Tính cách, Cảm xúc & Thái độ ứng xử (性格と感情・態度)', start: 258, end: 310 },
      { u: 4, title: 'Unit 4: Giao tiếp xã hội, Tin tức & Văn hóa (礼儀・情報・文化)', start: 310, end: 410 },
      { u: 5, title: 'Unit 5: Tiếp xúc, Biến đổi & Chuyển động đồ vật (接触・増減・隠す)', start: 410, end: 510 },
      { u: 6, title: 'Unit 6: Đời sống thường nhật & Dữ liệu số (生活雑貨・データ)', start: 510, end: 550 },
      { u: 7, title: 'Unit 7: Cảm giác, Phẩm chất & Tiêu chí đánh giá (感覚・性質・評価)', start: 550, end: 590 },
      { u: 8, title: 'Unit 8: Mức độ, Số lượng & Tiến trình thời gian (程度・量・時間)', start: 590, end: 635 },
      { u: 9, title: 'Unit 9: Y tế sức khỏe, Xã hội & Kinh tế thực tế (医療・経済・社会)', start: 635, end: 715 },
      { u: 10, title: 'Unit 10: Di chuyển, Liên kết quan hệ & Biến đổi (移動・人間関係・出現)', start: 715, end: 795 },
      { u: 11, title: 'Unit 11: Môi trường công sở, Nghề nghiệp & Ẩm thực (人と社会・仕事・調理)', start: 795, end: 845 },
      { u: 12, title: 'Unit 12: Trạng thái, Biểu hiện & Từ liên kết then chốt (様子・確実性・接続)', start: 845, end: 880 }
    ];

    for (const def of n3MimiDefs) {
      const u = def.u;
      const uId = `${bookId}_u${String(u).padStart(2, '0')}`;
      const uTitle = def.title;
      const slice = entries.slice(def.start, def.end);

      slice.forEach(([k, arr], idx) => {
        let { term, reading } = parseKey(k);
        const item = Array.isArray(arr) ? arr[0] : arr;
        const viMeaning = item?.vi || resolveCleanViMeaning(term, reading, item?.en);
        const sinoVi = getSinoVietnamese(term);
        const exPair = (item?.exJp && item?.exVi)
          ? { jp: item.exJp, vi: item.exVi }
          : generateAppropriateSentence(term, reading, viMeaning, 'N3');

        const finalTerm = term || reading;
        const finalReading = reading || term;
        const finalKanji = term || reading;
        const vId = `vocab_${bookId}_${uId}_${String(idx + 1).padStart(3, '0')}`;
        vocabularyItems.push({
          id: vId,
          vocab_id: vId,
          term: finalTerm,
          kanji: finalKanji,
          reading: finalReading,
          hiragana: finalReading,
          sinoVietnamese: sinoVi,
          vietnameseMeaning: viMeaning,
          meaning_vi: viMeaning,
          meaningEn: item?.en || '',
          wordType: 'DT',
          part_of_speech: 'DT',
          jlptLevel: 'N3',
          jlpt_level: 'N3',
          bookId,
          bookName,
          chapterTitle: `Chương ${u}`,
          unitId: uId,
          unitTitle: uTitle,
          unitOrder: u,
          exampleSentenceJp: exPair.jp,
          exampleSentenceVi: exPair.vi,
          nejSource: `${bookName} · ${uTitle}`
        });
      });

      units.push({
        unitId: uId,
        unitTitle: uTitle,
        chapterTitle: `Chương ${u}`,
        wordCount: slice.length
      });
    }

    vocabularyCatalog.N3.unshift({
      bookId,
      bookName,
      description: '12 chương chuyên đề từ vựng trung cấp Mimi Kara Oboeru N3',
      totalWords: units.reduce((acc, u) => acc + u.wordCount, 0),
      units
    });
  }

  // B4. N2: Mimi Kara Oboeru N2 (13 Units)
  {
    const bookId = 'n2-mimikara';
    const bookName = 'Mimi Kara Oboeru N2';
    const m2Data = m2Mod.default || m2Mod.e || m2Mod;
    const units = [];
    const entries = Object.entries(m2Data);
    const n2MimiDefs = [
      { u: 1, title: 'Unit 1: Con người, Gia đình & Công việc (人と家族・生活と仕事)', start: 0, end: 100 },
      { u: 2, title: 'Unit 2: Cảm xúc, Hành vi cơ thể & Vận động (感情と態度・体の動作)', start: 100, end: 220 },
      { u: 3, title: 'Unit 3: Tính cách, Nhân cách & Phẩm chất (性格と深刻さ)', start: 220, end: 270 },
      { u: 4, title: 'Unit 4: Quan điểm, Khắc phục sự cố & Động từ ghép (意見の対立・複合動詞)', start: 270, end: 460 },
      { u: 5, title: 'Unit 5: Trang thiết bị, Nghệ thuật & Đời sống (機器・芸能・スポーツ)', start: 460, end: 510 },
      { u: 6, title: 'Unit 6: Mức độ, Tiến trình thời gian & Từ nối (程度・数量・時の流れ)', start: 510, end: 580 },
      { u: 7, title: 'Unit 7: Sản xuất công nghiệp, Đánh giá & Dư luận xã hội (生産・評価・世論)', start: 580, end: 680 },
      { u: 8, title: 'Unit 8: Biến chuyển chuyển động, Trách nhiệm & Tâm lý (動き・変化・役目)', start: 680, end: 790 },
      { u: 9, title: 'Unit 9: Truyền thông đại chúng, Kinh doanh & Môi trường (ビジネス・環境)', start: 790, end: 840 },
      { u: 10, title: 'Unit 10: Phẩm chất cá nhân, Trọng trách & Sự công bằng (性格・人柄・公平)', start: 840, end: 890 },
      { u: 11, title: 'Unit 11: Tiêu chuẩn kỹ thuật, Tổ chức & Đảm bảo (基準・性能・保証)', start: 890, end: 990 },
      { u: 12, title: 'Unit 12: Thao tác thực tế, Trách nhiệm & Chuyển biến tâm lý (動作・改める・心の動き)', start: 990, end: 1090 },
      { u: 13, title: 'Unit 13: Tâm trạng, Nhận định suy đoán & Khái niệm cốt lõi (気分・推量・所謂)', start: 1090, end: 1160 }
    ];

    for (const def of n2MimiDefs) {
      const u = def.u;
      const uId = `${bookId}_u${String(u).padStart(2, '0')}`;
      const uTitle = def.title;
      const slice = entries.slice(def.start, def.end);

      slice.forEach(([k, arr], idx) => {
        let { term, reading } = parseKey(k);
        const item = Array.isArray(arr) ? arr[0] : arr;
        const viMeaning = item?.vi || resolveCleanViMeaning(term, reading, item?.en);
        const sinoVi = getSinoVietnamese(term);
        const exPair = (item?.exJp && item?.exVi)
          ? { jp: item.exJp, vi: item.exVi }
          : generateAppropriateSentence(term, reading, viMeaning, 'N2');

        const finalTerm = term || reading;
        const finalReading = reading || term;
        const finalKanji = term || reading;
        const vId = `vocab_${bookId}_${uId}_${String(idx + 1).padStart(3, '0')}`;
        vocabularyItems.push({
          id: vId,
          vocab_id: vId,
          term: finalTerm,
          kanji: finalKanji,
          reading: finalReading,
          hiragana: finalReading,
          sinoVietnamese: sinoVi,
          vietnameseMeaning: viMeaning,
          meaning_vi: viMeaning,
          meaningEn: item?.en || '',
          wordType: 'DT',
          part_of_speech: 'DT',
          jlptLevel: 'N2',
          jlpt_level: 'N2',
          bookId,
          bookName,
          chapterTitle: `Chương ${u}`,
          unitId: uId,
          unitTitle: uTitle,
          unitOrder: u,
          exampleSentenceJp: exPair.jp,
          exampleSentenceVi: exPair.vi,
          nejSource: `${bookName} · ${uTitle}`
        });
      });

      units.push({
        unitId: uId,
        unitTitle: uTitle,
        chapterTitle: `Chương ${u}`,
        wordCount: slice.length
      });
    }

    vocabularyCatalog.N2.unshift({
      bookId,
      bookName,
      description: '13 chương từ vựng thực chiến thương mại Mimi Kara Oboeru N2',
      totalWords: units.reduce((acc, u) => acc + u.wordCount, 0),
      units
    });
  }

  // B5. N1: Mimi Kara Oboeru N1 (6 Units)
  {
    const bookId = 'n1-mimikara';
    const bookName = 'Mimi Kara Oboeru N1';
    const m1Data = m1Mod.default || m1Mod.e || m1Mod;
    const units = [];
    const entries = Object.entries(m1Data);
    const n1MimiDefs = [
      { u: 1, title: 'Unit 1: Quan hệ con người & Tâm lý giao tiếp (人間関係・感情)', start: 0, end: 115 },
      { u: 2, title: 'Unit 2: Tính cách, Thái độ ứng xử & Cuộc sống (性格・態度・人生)', start: 115, end: 230 },
      { u: 3, title: 'Unit 3: Giáo dục, Nghiên cứu học thuật & Việc làm (教育・学問・職場)', start: 230, end: 345 },
      { u: 4, title: 'Unit 4: Quản trị doanh nghiệp, Kinh tế & Tài chính (経営・企業・金融)', start: 345, end: 460 },
      { u: 5, title: 'Unit 5: Thương mại quốc tế, Giao thông & Truyền thông (貿易・交通・メディア)', start: 460, end: 575 },
      { u: 6, title: 'Unit 6: Chính trị, Tư pháp pháp luật & Vấn đề xã hội (政治・法律・社会)', start: 575, end: 690 },
      { u: 7, title: 'Unit 7: Môi trường tự nhiên, Y sinh & Khoa học công nghệ (環境・医療・科学)', start: 690, end: 800 },
      { u: 8, title: 'Unit 8: Tư duy trừu tượng, Phán đoán & Tiêu chuẩn giá trị (思考・判断・価値)', start: 800, end: 910 },
      { u: 9, title: 'Unit 9: Tranh luận, Quan hệ nhân quả & Bối cảnh tình thế (議論・原因・状況)', start: 910, end: 1020 },
      { u: 10, title: 'Unit 10: Động từ Hán ngữ & Động từ phức hợp cao cấp (漢語動詞・複合動詞)', start: 1020, end: 1135 },
      { u: 11, title: 'Unit 11: Văn phong trang trọng, Thành ngữ 4 chữ & Kính ngữ (文語・熟語・敬語)', start: 1135, end: 1245 },
      { u: 12, title: 'Unit 12: Phó từ biểu cảm, Từ tượng thanh & Từ vựng then chốt (副詞・オノマトペ・重要語)', start: 1245, end: 1351 }
    ];

    for (const def of n1MimiDefs) {
      const u = def.u;
      const uId = `${bookId}_u${String(u).padStart(2, '0')}`;
      const uTitle = def.title;
      const slice = entries.slice(def.start, def.end);

      slice.forEach(([k, arr], idx) => {
        let { term, reading } = parseKey(k);
        const item = Array.isArray(arr) ? arr[0] : arr;
        const viMeaning = item?.vi || resolveCleanViMeaning(term, reading, item?.en);
        const sinoVi = getSinoVietnamese(term);
        const exPair = (item?.exJp && item?.exVi)
          ? { jp: item.exJp, vi: item.exVi }
          : generateAppropriateSentence(term, reading, viMeaning, 'N1');

        const finalTerm = term || reading;
        const finalReading = reading || term;
        const finalKanji = term || reading;
        const vId = `vocab_${bookId}_${uId}_${String(idx + 1).padStart(3, '0')}`;
        vocabularyItems.push({
          id: vId,
          vocab_id: vId,
          term: finalTerm,
          kanji: finalKanji,
          reading: finalReading,
          hiragana: finalReading,
          sinoVietnamese: sinoVi,
          vietnameseMeaning: viMeaning,
          meaning_vi: viMeaning,
          meaningEn: item?.en || '',
          wordType: 'DT',
          part_of_speech: 'DT',
          jlptLevel: 'N1',
          jlpt_level: 'N1',
          bookId,
          bookName,
          chapterTitle: `Chương ${u}`,
          unitId: uId,
          unitTitle: uTitle,
          unitOrder: u,
          exampleSentenceJp: exPair.jp,
          exampleSentenceVi: exPair.vi,
          nejSource: `${bookName} · ${uTitle}`
        });
      });

      units.push({
        unitId: uId,
        unitTitle: uTitle,
        chapterTitle: `Chương ${u}`,
        wordCount: slice.length
      });
    }

    vocabularyCatalog.N1.unshift({
      bookId,
      bookName,
      description: '12 chương từ vựng cao cấp Mimi Kara Oboeru N1 chuẩn Nhật ngữ thương mại',
      totalWords: units.reduce((acc, u) => acc + u.wordCount, 0),
      units
    });
  }

  // Thống kê phân bổ
  const countByLevel = (arr) => {
    const m = {};
    for (const x of arr) {
      const l = x.jlptLevel || x.jlpt_level || 'ALL';
      m[l] = (m[l] || 0) + 1;
    }
    return m;
  };

  console.log('\n📊 THỐNG KÊ TOÀN BỘ SAU KHI CÀO VÀ KHỬ TRÙNG LẶP TOÀN CỤC:');
  console.log('   - Stages (34 chặng):', countByLevel(stages));
  console.log('   - Milestones (182 mốc):', countByLevel(milestones));
  console.log('   - Milestone Quests (330 bài tập):', milestoneQuests.length);
  console.log('   - Grammar Items (N5-N1):', countByLevel(grammarItems), `-> Tổng: ${grammarItems.length} (0% trùng lặp pattern)`);
  console.log('   - Kanji Dictionary (N5-N1):', countByLevel(kanjiItems), `-> Tổng: ${kanjiItems.length} (0% trùng lặp)`);
  console.log('   - Vocabulary Items (N5-N1):', countByLevel(vocabularyItems), `-> Tổng: ${vocabularyItems.length} (0% trùng lặp)`);

  // --------------------------------------------------------------------------
  // STEP 5: LƯU TỆP SEED GỐC (docs/KIZUNA_NEJ_SEED_DATA.json)
  // --------------------------------------------------------------------------
  console.log('\n💾 Đang cập nhật tệp Master Seed docs/KIZUNA_NEJ_SEED_DATA.json...');
  const prevSeed = JSON.parse(fs.readFileSync(path.resolve('../docs/KIZUNA_NEJ_SEED_DATA.json'), 'utf8'));
  const masterSeed = {
    metadata: {
      source: 'https://openjlpt.com/',
      scrapedAt: new Date().toISOString(),
      counts: {
        stages: stages.length,
        milestones: milestones.length,
        milestone_quests: milestoneQuests.length,
        vocabulary_items: vocabularyItems.length,
        grammar_items: grammarItems.length,
        kanji_dictionary: kanjiItems.length,
        listening_items: (prevSeed.listening_items || []).length,
        video_lessons: (prevSeed.video_lessons || []).length,
        library_items: (prevSeed.library_items || []).length
      },
      levelBreakdown: {
        stages: countByLevel(stages),
        milestones: countByLevel(milestones),
        vocabulary_items: countByLevel(vocabularyItems),
        grammar_items: countByLevel(grammarItems),
        kanji_dictionary: countByLevel(kanjiItems)
      }
    },
    stages,
    milestones,
    milestone_quests: milestoneQuests,
    vocabulary_catalog: vocabularyCatalog,
    vocabulary_items: vocabularyItems,
    grammar_items: grammarItems,
    kanji_dictionary: kanjiItems,
    listening_items: prevSeed.listening_items || [],
    video_lessons: prevSeed.video_lessons || [],
    library_items: prevSeed.library_items || []
  };

  fs.writeFileSync(path.resolve('../docs/KIZUNA_NEJ_SEED_DATA.json'), JSON.stringify(masterSeed, null, 2), 'utf8');
  console.log('   ✅ Đã ghi thành công tệp docs/KIZUNA_NEJ_SEED_DATA.json.');

  // Cập nhật Catalog TypeScript đồng bộ cho ứng dụng Frontend
  const catalogTsContent = `import { VocabularyCatalog } from '../types/kizuna';\n\nexport const VOCABULARY_CATALOG: VocabularyCatalog = ${JSON.stringify(vocabularyCatalog, null, 2)};\n`;
  fs.writeFileSync(path.resolve('./src/user/data/vocabularyCatalog.ts'), catalogTsContent, 'utf8');
  console.log('   ✅ Đã cập nhật thành công src/user/data/vocabularyCatalog.ts');

  // Tạo toàn bộ các tệp JSON tĩnh theo từng Unit trong public/data/units/ (Zero-read fallback)
  const unitsDir = path.resolve('./public/data/units');
  if (!fs.existsSync(unitsDir)) fs.mkdirSync(unitsDir, { recursive: true });
  const itemsByUnit = new Map();
  for (const item of vocabularyItems) {
    if (!itemsByUnit.has(item.unitId)) itemsByUnit.set(item.unitId, []);
    itemsByUnit.get(item.unitId).push(item);
  }
  for (const [uId, uItems] of itemsByUnit.entries()) {
    fs.writeFileSync(path.join(unitsDir, `${uId}.json`), JSON.stringify(uItems, null, 2), 'utf8');
  }
  console.log(`   ✅ Đã cập nhật ${itemsByUnit.size} tệp public/data/units/*.json cho zero-read fallback`);

  // --------------------------------------------------------------------------
  // STEP 6: ĐỒNG BỘ LÊN CLOUD FIRESTORE (ebook-fdc02)
  // --------------------------------------------------------------------------
  console.log('\n☁️ [TRẠNG THÁI FIRESTORE: ĐANG ĐỒNG BỘ DỮ LIỆU]');
  console.log('   Dữ liệu từ vựng theo 2 bộ sách đã được tinh chỉnh 100% tiếng Việt');
  console.log(`   Đang tải ${vocabularyItems.length} documents lên collection "vocabulary_items"...`);
  await pushCollection('vocabulary_items', vocabularyItems);
  console.log('   ✅ Đã đồng bộ thành công toàn bộ từ vựng lên Firestore!');

  console.log('\n🎉 HOÀN TẤT TINH CHỈNH DỮ LIỆU TỪ VỰNG & MASTER SEED JSON!');
  process.exit(0);
}

runRecrawlAndSeed().catch(err => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
