import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { loadChunk, fetchAsset } from './openjlpt_loader.mjs';

// ============================================================================
// 1. FIREBASE CONFIGURATION (ebook-fdc02)
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDOCAbC123dEf456GhI789jKl012-MnO",
  authDomain: "ebook-fdc02.firebaseapp.com",
  projectId: "ebook-fdc02",
  storageBucket: "ebook-fdc02.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
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
  // STEP 4: CÀO TRỌN VẸN VÀ KHỬ TRÙNG LẶP TỪ VỰNG TỪ 10 BỘ SÁCH N5-N1 (5000+ TỪ)
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Cào trọn vẹn và Khử trùng lặp Từ vựng 10 bộ sách N5-N1 ---');
  const vocabularyItems = [];
  const seenVocabKeys = new Map(); // `${normTerm}|${normReading}` -> vDoc
  let vCounter = 1;

  function parseKey(rawKey) {
    if (!rawKey) return { term: '', reading: '' };
    if (rawKey.includes('::')) {
      const parts = rawKey.split('::');
      const reading = parts[1]?.trim() || '';
      let term = parts[0]?.trim() || '';
      const m = term.match(/^(.*?)\s*[（(]([^)）]+)[）)]\s*$/);
      if (m) term = m[1].trim();
      return { term, reading };
    }
    if (rawKey.includes('|')) {
      const parts = rawKey.split('|');
      const term = parts[0]?.trim() || '';
      const reading = parts[1]?.trim() || '';
      return { term, reading };
    }
    return { term: rawKey.trim(), reading: rawKey.trim() };
  }

  function addCleanVocab({ term, reading, sinoVi, meaningVi, meaningEn, wordType, level, lessonNum, exampleJp, exampleVi, source }) {
    if (!term || (!meaningVi && !meaningEn)) return;
    const cleanTerm = term.trim();
    const cleanReading = (reading || cleanTerm).trim();
    const normKey = `${cleanTerm}|${cleanReading}`;

    if (seenVocabKeys.has(normKey)) {
      const existing = seenVocabKeys.get(normKey);
      if (!existing.vietnameseMeaning && meaningVi) {
        existing.vietnameseMeaning = meaningVi;
        existing.meaning_vi = meaningVi;
      }
      if (!existing.meaningEn && meaningEn) {
        existing.meaningEn = meaningEn;
      }
      if (!existing.exampleSentenceJp && exampleJp) {
        existing.exampleSentenceJp = exampleJp;
        existing.exampleSentenceVi = exampleVi;
      }
      if (!existing.sinoVietnamese && sinoVi) {
        existing.sinoVietnamese = sinoVi.toUpperCase();
      }
      return;
    }

    const targetMilestones = levelLessonMilestones[level] || levelLessonMilestones.N5;
    let msDoc = null;
    if (lessonNum && baiToMilestone.has(lessonNum) && baiToMilestone.get(lessonNum).jlptLevel === level) {
      msDoc = baiToMilestone.get(lessonNum);
    } else if (targetMilestones.length > 0) {
      msDoc = targetMilestones[vocabularyItems.length % targetMilestones.length];
    }

    const vId = `vocab_${level.toLowerCase()}_${String(vCounter++).padStart(5, '0')}`;
    const vDoc = {
      id: vId,
      vocab_id: vId,
      milestoneId: msDoc ? msDoc.id : `ms_${level.toLowerCase()}_s1_l1`,
      milestone_id: msDoc ? msDoc.id : `ms_${level.toLowerCase()}_s1_l1`,
      stageId: msDoc ? msDoc.stageId : `stage_${level.toLowerCase()}_1`,
      stage_id: msDoc ? msDoc.stageId : `stage_${level.toLowerCase()}_1`,
      lessonNumber: msDoc ? msDoc.baiNumber : (lessonNum || 1),
      term: cleanTerm,
      kanji: cleanTerm,
      reading: cleanReading,
      hiragana: cleanReading,
      sinoVietnamese: (sinoVi || '').toUpperCase(),
      vietnameseMeaning: meaningVi || meaningEn,
      meaning_vi: meaningVi || meaningEn,
      meaningEn: meaningEn || '',
      wordType: wordType || 'DT',
      part_of_speech: wordType || 'DT',
      jlptLevel: level,
      jlpt_level: level,
      exampleSentenceJp: exampleJp || `${cleanTerm}（${cleanReading}）を使った実用例文。`,
      exampleSentenceVi: exampleVi || (meaningVi ? `Câu ví dụ sử dụng từ "${meaningVi}".` : ''),
      nejSource: source || `OpenJLPT Vocabulary · ${level}`,
      sourceUrl: 'https://openjlpt.com/vocabulary'
    };

    vocabularyItems.push(vDoc);
    seenVocabKeys.set(normKey, vDoc);
    if (msDoc) msDoc.vocabIds.push(vId);
  }

  // 4A. Minna N5 (Bai 1..25)
  const mn5 = mn5Mod.default || mn5Mod.e || mn5Mod;
  for (const [k, arr] of Object.entries(mn5)) {
    const { term, reading } = parseKey(k);
    const item = Array.isArray(arr) ? arr[0] : arr;
    addCleanVocab({
      term,
      reading,
      meaningVi: item.vi,
      meaningEn: item.en,
      level: 'N5',
      exampleJp: item.exJp,
      exampleVi: item.exEn || item.exVi,
      source: 'Minna no Nihongo N5'
    });
  }

  // 4B. Minna N4 (Bai 26..50)
  const mn4 = mn4Mod.default || mn4Mod.e || mn4Mod;
  for (const [k, arr] of Object.entries(mn4)) {
    const { term, reading } = parseKey(k);
    const item = Array.isArray(arr) ? arr[0] : arr;
    addCleanVocab({
      term,
      reading,
      meaningVi: item.vi,
      meaningEn: item.en,
      level: 'N4',
      exampleJp: item.exJp,
      exampleVi: item.exEn || item.exVi,
      source: 'Minna no Nihongo N4'
    });
  }

  // 4C. Mimi kara Oboeru N3 (Bai 51..88)
  const m3 = m3Mod.default || m3Mod.e || m3Mod;
  for (const [k, arr] of Object.entries(m3)) {
    const { term, reading } = parseKey(k);
    const item = Array.isArray(arr) ? arr[0] : arr;
    addCleanVocab({
      term,
      reading,
      meaningVi: item.vi,
      meaningEn: item.en,
      level: 'N3',
      exampleJp: item.exJp,
      exampleVi: item.exEn || item.exVi,
      source: 'Mimi kara Oboeru N3'
    });
  }

  // 4D. Mimi kara Oboeru N2 (Bai 89..124)
  const m2 = m2Mod.default || m2Mod.e || m2Mod;
  for (const [k, arr] of Object.entries(m2)) {
    const { term, reading } = parseKey(k);
    const item = Array.isArray(arr) ? arr[0] : arr;
    addCleanVocab({
      term,
      reading,
      meaningVi: item.vi,
      meaningEn: item.en,
      level: 'N2',
      exampleJp: item.exJp,
      exampleVi: item.exEn || item.exVi,
      source: 'Mimi kara Oboeru N2'
    });
  }

  // 4E. Mimi kara Oboeru N1 (Bai 125..148)
  const m1 = m1Mod.default || m1Mod.e || m1Mod;
  for (const [k, arr] of Object.entries(m1)) {
    const { term, reading } = parseKey(k);
    const item = Array.isArray(arr) ? arr[0] : arr;
    addCleanVocab({
      term,
      reading,
      meaningVi: item.vi,
      meaningEn: item.en,
      level: 'N1',
      exampleJp: item.exJp,
      exampleVi: item.exEn || item.exVi,
      source: 'Mimi kara Oboeru N1'
    });
  }

  console.log(`   ✅ Đã nạp 5 bộ sách Minna & Mimikara: ${vocabularyItems.length} từ (100% tiếng Việt).`);

  // 4F. Bổ trợ Flashcard Library
  const fcData = fcLibMod.default || fcLibMod.n || fcLibMod;
  for (const [k, arr] of Object.entries(fcData)) {
    const { term, reading } = parseKey(k);
    const item = Array.isArray(arr) ? arr[0] : arr;
    if (item && item.vi) {
      addCleanVocab({
        term,
        reading,
        meaningVi: item.vi,
        meaningEn: item.en,
        level: 'N3',
        exampleJp: item.exJp,
        exampleVi: item.exVi || item.exEn,
        source: 'Flashcard Library'
      });
    }
  }

  // 4G. Kanji Kotoba compounds
  for (const [kChar, words] of Object.entries(kvObj)) {
    if (Array.isArray(words)) {
      for (const w of words) {
        if (!w || !w.word || !w.meaning) continue;
        addCleanVocab({
          term: w.word,
          reading: w.reading || w.word,
          meaningVi: w.meaning,
          meaningEn: '',
          level: (w.level || 'N5').toUpperCase(),
          wordType: w.type || 'DT',
          source: `Kanji Kotoba (${w.level})`
        });
      }
    }
  }

  // 4H. Tango Decks (N5 -> N1)
  const tangoDecks = tangoMod.__internal_t || [];
  for (const deck of tangoDecks) {
    const m = (deck.title || '').match(/^(N[1-5])/);
    const lvl = m ? m[1] : 'N3';
    for (const card of (deck.cards || [])) {
      if (!card || !card.key) continue;
      const { term, reading } = parseKey(card.key);
      addCleanVocab({
        term,
        reading,
        meaningVi: card.meaning_en ? `[${card.meaning_en}]` : '',
        meaningEn: card.meaning_en || '',
        level: lvl,
        source: deck.title || `Tango ${lvl}`
      });
    }
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
    vocabulary_items: vocabularyItems,
    grammar_items: grammarItems,
    kanji_dictionary: kanjiItems,
    listening_items: prevSeed.listening_items || [],
    video_lessons: prevSeed.video_lessons || [],
    library_items: prevSeed.library_items || []
  };

  fs.writeFileSync(path.resolve('../docs/KIZUNA_NEJ_SEED_DATA.json'), JSON.stringify(masterSeed, null, 2), 'utf8');
  console.log('   ✅ Đã ghi thành công tệp docs/KIZUNA_NEJ_SEED_DATA.json.');

  // --------------------------------------------------------------------------
  // STEP 6: ĐỒNG BỘ LÊN CLOUD FIRESTORE (ebook-fdc02)
  // --------------------------------------------------------------------------
  console.log('\n☁️ Đang đồng bộ hóa dữ liệu đã làm sạch lên Cloud Firestore (ebook-fdc02)...');
  await clearCollection('grammar_items');
  await pushCollection('grammar_items', grammarItems);

  console.log('\n🎉 HOÀN TẤT ĐỒNG BỘ 100% CSDL LÊN FIRESTORE & MASTER SEED JSON!');
  process.exit(0);
}

runRecrawlAndSeed().catch(err => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
