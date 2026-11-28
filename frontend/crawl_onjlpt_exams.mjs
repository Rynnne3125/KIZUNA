import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DOCS_DIR = path.resolve(__dirname, '../docs');
const EXAMS_DIR = path.resolve(DOCS_DIR, 'exams');

if (!fs.existsSync(EXAMS_DIR)) {
  fs.mkdirSync(EXAMS_DIR, { recursive: true });
}

const BASE_URL = 'https://onjlpt.com';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

const STANDARD_DURATIONS = {
  N5: 105,
  N4: 125,
  N3: 140,
  N2: 155,
  N1: 170
};

async function fetchText(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
      clearTimeout(timer);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 800 * attempt));
    }
  }
  return null;
}

// Parse Next.js Flight RSC self.__next_f.push([1,"..."]) chunks and resolve $<hex> refs
function parseRsc(html) {
  const pushes = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)].map(m => {
    try {
      return JSON.parse('"' + m[1] + '"');
    } catch {
      return m[1];
    }
  });
  const stream = pushes.join('');
  const map = new Map();
  let i = 0;
  while (i < stream.length) {
    const colon = stream.indexOf(':', i);
    if (colon < 0) break;
    const id = stream.slice(i, colon);
    if (!/^[0-9a-fA-F]+$/.test(id)) {
      const nl = stream.indexOf('\n', i);
      if (nl < 0) break;
      i = nl + 1;
      continue;
    }
    const restStart = colon + 1;
    if (stream[restStart] === 'T') {
      const comma = stream.indexOf(',', restStart);
      if (comma < 0) break;
      const byteLen = parseInt(stream.slice(restStart + 1, comma), 16);
      const textStart = comma + 1;
      const buf = Buffer.from(stream.slice(textStart), 'utf8');
      const text = buf.subarray(0, byteLen).toString('utf8');
      map.set(id, text);
      i = textStart + text.length;
      if (stream[i] === '\n') i++;
    } else {
      const nl = stream.indexOf('\n', restStart);
      const line = nl < 0 ? stream.slice(restStart) : stream.slice(restStart, nl);
      map.set(id, line);
      i = nl < 0 ? stream.length : nl + 1;
    }
  }
  return { stream, map };
}

function resolveRefs(val, map) {
  if (typeof val === 'string') {
    const m = val.match(/^\$([0-9a-fA-F]+)$/);
    if (m && map.has(m[1])) return map.get(m[1]);
    return val;
  }
  if (Array.isArray(val)) return val.map(v => resolveRefs(v, map));
  if (val && typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      out[k] = resolveRefs(v, map);
    }
    return out;
  }
  return val;
}

function extractBalancedJson(stream, marker) {
  const idx = stream.indexOf(marker);
  if (idx < 0) return null;
  let start = stream.lastIndexOf('{"exam":', idx);
  if (start < 0) start = stream.lastIndexOf('{"levelCode":', idx);
  if (start < 0) start = stream.lastIndexOf('{', idx);
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  let end = -1;
  for (let i = start; i < stream.length; i++) {
    const ch = stream[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (!inStr) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }
  }
  if (end < 0) return null;
  return JSON.parse(stream.slice(start, end));
}

function extractBalancedArray(stream, marker) {
  const idx = stream.indexOf(marker);
  if (idx < 0) return [];
  const start = stream.indexOf('[', idx);
  if (start < 0) return [];
  let depth = 0;
  let inStr = false;
  let esc = false;
  let end = -1;
  for (let i = start; i < stream.length; i++) {
    const ch = stream[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (!inStr) {
      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }
  }
  if (end < 0) return [];
  return JSON.parse(stream.slice(start, end));
}

function extractBalancedObjectAfter(stream, marker) {
  const idx = stream.indexOf(marker);
  if (idx < 0) return {};
  const start = stream.indexOf('{', idx);
  if (start < 0) return {};
  let depth = 0;
  let inStr = false;
  let esc = false;
  let end = -1;
  for (let i = start; i < stream.length; i++) {
    const ch = stream[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (!inStr) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }
  }
  if (end < 0) return {};
  return JSON.parse(stream.slice(start, end));
}

function stripChoicePrefix(choice, num) {
  if (choice == null) return '';
  const s = String(choice).trim();
  const re = new RegExp(`^[\\s]*${num}\\s*[\\.\\)．。）:：]\\s*`);
  const stripped = s.replace(re, '').trim();
  if (stripped === String(num)) return '';
  return stripped;
}

function stripRubyForText(html) {
  if (!html) return '';
  return String(html)
    .replace(/<rp>.*?<\/rp>/gi, '')
    .replace(/<rt>.*?<\/rt>/gi, '')
    .replace(/<\/?ruby>/gi, '');
}

function formatTranscript(transcriptObj) {
  const segs = transcriptObj?.transcript;
  if (!Array.isArray(segs) || segs.length === 0) return '';
  const lines = [];
  for (const seg of segs) {
    const speaker = seg.speaker ? `<strong>${seg.speaker}:</strong> ` : '';
    const jp = (seg.text || '').trim();
    const vi = (seg.text_vi || '').trim();
    if (!jp && !vi) continue;
    lines.push(`${speaker}${jp}${vi ? `<br/><span style="color:#0f766e">→ ${vi}</span>` : ''}`);
  }
  return lines.join('<br/>');
}

// Cache public grammar point explanations from /ngu-phap/{level}/{slug}
const grammarPointCache = new Map();
async function fetchGrammarPointDetail(href) {
  if (!href) return null;
  if (grammarPointCache.has(href)) return grammarPointCache.get(href);
  try {
    const html = await fetchText(`${BASE_URL}${href}`);
    if (!html) {
      grammarPointCache.set(href, null);
      return null;
    }
    const { stream, map } = parseRsc(html);
    const pointObj = extractBalancedJson(stream, '"structure"');
    if (pointObj) {
      const resolved = resolveRefs(pointObj, map);
      const detail = {
        title: resolved.title || resolved.pointTitle || '',
        meaning: resolved.meaning || resolved.meaning_vi || '',
        structure: resolved.structure || '',
        usage: resolved.usage || resolved.note || ''
      };
      grammarPointCache.set(href, detail);
      return detail;
    }
  } catch {
    // fallback below
  }
  grammarPointCache.set(href, null);
  return null;
}

async function discoverExamUrls() {
  const levels = ['n5', 'n4', 'n3', 'n2', 'n1'];
  const urlSet = new Set();

  for (const lvl of levels) {
    const html = await fetchText(`${BASE_URL}/${lvl}`);
    if (!html) continue;
    const matches = [...html.matchAll(/href=["'](\/(?:n[1-5]\/\d{6}|try\/n[45]\/[^"'/?#]+))["']/gi)];
    for (const m of matches) {
      urlSet.add(m[1]);
    }
  }

  // Also cross-check sitemap-0.xml to ensure zero exams are missed
  const sm = await fetchText(`${BASE_URL}/sitemap-0.xml`);
  if (sm) {
    const locs = [...sm.matchAll(/<loc>https:\/\/onjlpt\.com(\/(?:n[1-5]\/\d{6}|try\/n[45]\/[^/<]+))<\/loc>/gi)];
    for (const m of locs) {
      urlSet.add(m[1]);
    }
  }

  return [...urlSet].sort();
}

async function crawlSingleExam(examPath) {
  const html = await fetchText(`${BASE_URL}${examPath}`);
  if (!html) return null;

  const { stream, map } = parseRsc(html);
  const overview = resolveRefs(extractBalancedJson(stream, '"parts":'), map);
  if (!overview || !overview.exam || !Array.isArray(overview.parts)) {
    console.warn(`⚠️ Skipping ${examPath}: missing exam overview payload`);
    return null;
  }

  const level = (overview.levelCode || 'N3').toUpperCase();
  const examMeta = overview.exam;
  const isMock = Boolean(examMeta.is_mock || examPath.startsWith('/try/'));
  const year = examMeta.year ? Number(examMeta.year) : null;
  const month = examMeta.month ? Number(examMeta.month) : null;

  let testNumber = null;
  if (isMock) {
    const numMatch = (examMeta.slug || examPath).match(/(\d+)/g);
    testNumber = numMatch ? Number(numMatch[numMatch.length - 1]) : null;
  }

  const slugPart = isMock
    ? (examMeta.slug || examPath.split('/').pop()).replace(/[^a-zA-Z0-9_-]/g, '_')
    : `${year}${String(month || 12).padStart(2, '0')}`;

  const examId = `onjlpt_${level.toLowerCase()}_${slugPart}`;
  const label = isMock
    ? `JLPT ${level} - Đề chuẩn ${testNumber || 1}`
    : `JLPT ${level} - ${String(month || 12).padStart(2, '0')}/${year}`;

  // Fetch optional tu-vung & ngu-phap enrichment pages if present
  const vocabByQuestionId = new Map();
  const grammarByQuestionId = new Map();

  if ((overview.vocabTotal || 0) > 0 && !isMock) {
    try {
      const tvHtml = await fetchText(`${BASE_URL}${examPath}/tu-vung`);
      if (tvHtml) {
        const tvRsc = parseRsc(tvHtml);
        const words = resolveRefs(extractBalancedArray(tvRsc.stream, '"words":'), tvRsc.map);
        for (const w of words) {
          if (!w || !w.questionId) continue;
          if (!vocabByQuestionId.has(w.questionId)) vocabByQuestionId.set(w.questionId, []);
          vocabByQuestionId.get(w.questionId).push(w);
        }
      }
    } catch {
      // ignore optional enrichment error
    }
  }

  if ((overview.grammarTotal || 0) > 0 && !isMock) {
    try {
      const npHtml = await fetchText(`${BASE_URL}${examPath}/ngu-phap`);
      if (npHtml) {
        const npRsc = parseRsc(npHtml);
        const points = resolveRefs(extractBalancedArray(npRsc.stream, '"grammarPoints":'), npRsc.map);
        const altPoints = points.length > 0 ? points : resolveRefs(extractBalancedArray(npRsc.stream, '"points":'), npRsc.map);
        const uniqueHrefs = [...new Set(altPoints.map(gp => gp?.href).filter(Boolean))];
        await Promise.all(uniqueHrefs.map(h => fetchGrammarPointDetail(h)));
        for (const gp of altPoints) {
          if (!gp || !gp.questionId) continue;
          if (!grammarByQuestionId.has(gp.questionId)) grammarByQuestionId.set(gp.questionId, []);
          grammarByQuestionId.get(gp.questionId).push(gp);
        }
      }
    } catch {
      // ignore optional enrichment error
    }
  }

  const questionSets = [];
  let setIndex = 1;
  let totalQuestions = 0;
  let explanationCount = 0;
  let scriptCount = 0;
  let totalSeconds = 0;
  let firstListeningAudio = null;

  for (const part of overview.parts) {
    totalSeconds += Number(part.time_limit_seconds || 0);
    const partHtml = await fetchText(`${BASE_URL}${examPath}/${part.slug}`);
    if (!partHtml) continue;

    const partRsc = parseRsc(partHtml);
    const partPayload = resolveRefs(extractBalancedJson(partRsc.stream, '"mondaiList":'), partRsc.map);
    if (!partPayload || !Array.isArray(partPayload.mondaiList)) continue;

    const rpMap = partPayload.readingPassages || {};
    const supMap = partPayload.supplementaryContent || {};
    const qMap = partPayload.questions || {};

    for (const m of partPayload.mondaiList) {
      const rawQs = Array.isArray(qMap[m.id]) ? qMap[m.id] : [];
      if (rawQs.length === 0) continue;

      const isListening = m.section_code === 'listening' || part.slug === 'chokai';
      const mondaiAudio = m.audio_url || null;
      if (isListening && mondaiAudio && !firstListeningAudio) {
        firstListeningAudio = mondaiAudio;
      }

      const mondaiScript = isListening ? formatTranscript(m.transcript) : '';
      const passages = [
        ...(Array.isArray(rpMap[m.id]) ? rpMap[m.id] : []),
        ...(Array.isArray(supMap[m.id]) ? supMap[m.id] : [])
      ];

      // Determine passage attachment without duplicating large HTML/script blocks across every question:
      // - If 1 passage: put content on QuestionSet.content and Vietnamese translation on QuestionSet.script
      // - If multiple passages: attach each passage + its Vietnamese translation on the anchor question only
      let setContent = m.passage || '';
      let setReadingScript = '';
      const questionPassageMap = new Map();
      const questionPassageViMap = new Map();

      if (passages.length === 1) {
        setContent = passages[0].content || passages[0].content_raw || setContent;
        setReadingScript = passages[0].content_vi || '';
      } else if (passages.length > 1) {
        const byAnchor = new Map();
        for (const p of passages) {
          if (p.display_above_question_id) {
            byAnchor.set(Number(p.display_above_question_id), p);
          }
        }
        if (byAnchor.size > 0) {
          for (const q of rawQs) {
            const matched = byAnchor.get(Number(q.id));
            if (matched) {
              questionPassageMap.set(q.id, matched.content || matched.content_raw || '');
              if (matched.content_vi) questionPassageViMap.set(q.id, matched.content_vi);
            }
          }
        } else {
          setContent = passages.map(p => p.content || p.content_raw || '').filter(Boolean).join('<hr/>');
          setReadingScript = passages.map(p => p.content_vi || '').filter(Boolean).join('<hr/>');
        }
      }

      const normalizedQuestions = [];
      for (let qIdx = 0; qIdx < rawQs.length; qIdx++) {
        const q = rawQs[qIdx];
        totalQuestions++;

        const rawChoices = Array.isArray(q.choices) ? q.choices : [];
        const options = rawChoices.length > 0
          ? rawChoices.map((c, idx) => ({
              id: String(idx + 1),
              value: stripChoicePrefix(c, idx + 1)
            }))
          : [1, 2, 3, 4].map(n => ({ id: String(n), value: '' }));

        const correctIdx = q.correct_answer_index != null ? Number(q.correct_answer_index) : 0;
        const correctAnswer = String(correctIdx + 1);
        const correctOptionText = options[correctIdx]?.value || '';

        // Build rich explanation from onjlpt's public tu-vung, ngu-phap & answer key
        const expParts = [];
        const vList = vocabByQuestionId.get(q.id) || [];
        if (vList.length > 0) {
          const vLines = vList.map(v => {
            const hv = v.hanViet ? ` [${v.hanViet}]` : '';
            const ex = v.example?.jp ? `<br/><em>VD: ${v.example.jp}${v.example.vi ? ` — ${v.example.vi}` : ''}</em>` : '';
            return `• <strong>${v.word}</strong> (${v.reading || ''})${hv}: ${v.meaningVi || ''}${ex}`;
          });
          expParts.push(vLines.join('<br/>'));
        }

        const gList = grammarByQuestionId.get(q.id) || [];
        if (gList.length > 0) {
          const gLines = gList.map(g => {
            const tag = g.isAnswer ? '✅ ' : '• ';
            const expr = Array.isArray(g.expressions) && g.expressions.length ? ` (${g.expressions.join(' / ')})` : '';
            const gpDetail = g.href ? grammarPointCache.get(g.href) : null;
            const detailStr = gpDetail?.meaning
              ? ` — ${gpDetail.meaning}${gpDetail.structure ? ` | Cấu trúc: ${gpDetail.structure}` : ''}`
              : '';
            return `${tag}<strong>${g.pointTitle}</strong>${expr} [${g.level || level}]${detailStr}`;
          });
          expParts.push(gLines.join('<br/>'));
        }

        if (expParts.length === 0) {
          expParts.push(
            correctOptionText
              ? `Đáp án chính xác là phương án <strong>(${correctAnswer})</strong>: ${correctOptionText}.`
              : `Đáp án chính xác là phương án <strong>(${correctAnswer})</strong>.`
          );
        }

        const explanation = expParts.join('<br/>');
        const script = isListening ? '' : (questionPassageViMap.get(q.id) || '');

        if (explanation) explanationCount++;
        if (script || (!isListening && setReadingScript) || (isListening && mondaiScript)) scriptCount++;

        normalizedQuestions.push({
          id: `onjlpt_q_${q.id}`,
          index: qIdx + 1,
          question: (q.question_text || '').trim(),
          content: questionPassageMap.get(q.id) || '',
          imageUrl: q.image_url || null,
          audioUrl: q.audio_url || null,
          options,
          correctAnswer,
          explanation,
          script,
          score: Number(q.score) || 1
        });
      }

      questionSets.push({
        id: `onjlpt_m_${m.id}`,
        index: setIndex++,
        title: (m.title || '').trim(),
        part: isListening ? 2 : 1,
        sectionCode: m.section_code || (isListening ? 'listening' : 'vocabulary'),
        audioUrl: mondaiAudio,
        imageUrl: m.image_url || null,
        content: setContent,
        script: (isListening ? mondaiScript : setReadingScript) || null,
        questionCount: normalizedQuestions.length,
        questions: normalizedQuestions
      });
    }
  }

  if (questionSets.length === 0 || totalQuestions === 0) {
    console.warn(`⚠️ Skipping ${examPath}: 0 questions parsed`);
    return null;
  }

  const durationMinutes = totalSeconds > 0
    ? Math.round(totalSeconds / 60)
    : (STANDARD_DURATIONS[level] || 120);

  return {
    id: examId,
    label,
    level,
    type: `jlpt-${level.toLowerCase()}`,
    year,
    month,
    testNumber,
    isMock,
    durationMinutes,
    totalQuestions,
    actualQuestionCount: totalQuestions,
    parts: overview.parts.length,
    audioUrl: firstListeningAudio,
    questionSetCount: questionSets.length,
    explanationCount,
    scriptCount,
    sourceUrl: `${BASE_URL}${examPath}`,
    createdAt: examMeta.content_published_at || examMeta.content_analyzed_at || new Date().toISOString(),
    questionSets
  };
}

async function main() {
  console.log('====================================================');
  console.log('🚀 CRAWLING FULL JLPT EXAMS FROM ONJLPT.COM (N5 -> N1)');
  console.log('====================================================\n');

  const examUrls = await discoverExamUrls();
  console.log(`Discovered ${examUrls.length} exam URLs across N5 -> N1.\n`);

  const examsByLevel = { N5: [], N4: [], N3: [], N2: [], N1: [] };
  const summaryList = [];
  const overallStats = {
    totalExams: 0,
    totalQuestionSets: 0,
    totalQuestions: 0,
    questionsWithExplanation: 0,
    questionsWithScript: 0,
    examsWithAudio: 0
  };

  // Process in small concurrent batches (4 at a time) for speed + politeness
  const CONCURRENCY = 4;
  for (let i = 0; i < examUrls.length; i += CONCURRENCY) {
    const batch = examUrls.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (urlPath, offset) => {
      const idx = i + offset + 1;
      try {
        const exam = await crawlSingleExam(urlPath);
        if (exam) {
          console.log(`[${idx}/${examUrls.length}] ✅ ${exam.level} "${exam.label}" -> ${exam.questionSetCount} sets, ${exam.actualQuestionCount} qs, exp=${exam.explanationCount}, script=${exam.scriptCount}, audio=${!!exam.audioUrl}`);
        }
        return exam;
      } catch (err) {
        console.error(`[${idx}/${examUrls.length}] ❌ Error crawling ${urlPath}:`, err.message);
        return null;
      }
    }));

    for (const exam of results) {
      if (!exam) continue;
      if (!examsByLevel[exam.level]) examsByLevel[exam.level] = [];
      examsByLevel[exam.level].push(exam);

      summaryList.push({
        id: exam.id,
        level: exam.level,
        label: exam.label,
        year: exam.year,
        month: exam.month,
        testNumber: exam.testNumber,
        durationMinutes: exam.durationMinutes,
        questionSets: exam.questionSetCount,
        questions: exam.actualQuestionCount,
        explanations: exam.explanationCount,
        scripts: exam.scriptCount,
        hasAudio: !!exam.audioUrl,
        sourceUrl: exam.sourceUrl
      });

      overallStats.totalExams++;
      overallStats.totalQuestionSets += exam.questionSetCount;
      overallStats.totalQuestions += exam.actualQuestionCount;
      overallStats.questionsWithExplanation += exam.explanationCount;
      overallStats.questionsWithScript += exam.scriptCount;
      if (exam.audioUrl) overallStats.examsWithAudio++;
    }
  }

  console.log('\nSaving structured JSON files to docs/exams/ ...');
  for (const [lvl, list] of Object.entries(examsByLevel)) {
    list.sort((a, b) => {
      if (a.year && b.year) {
        if (a.year !== b.year) return b.year - a.year;
        return (b.month || 0) - (a.month || 0);
      }
      if (a.year && !b.year) return -1;
      if (!a.year && b.year) return 1;
      if (a.testNumber && b.testNumber) return a.testNumber - b.testNumber;
      return a.label.localeCompare(b.label);
    });

    const filePath = path.join(EXAMS_DIR, `jlpt_${lvl.toLowerCase()}.json`);
    fs.writeFileSync(filePath, JSON.stringify({
      source: BASE_URL,
      level: lvl,
      totalExams: list.length,
      totalQuestions: list.reduce((sum, e) => sum + e.actualQuestionCount, 0),
      exams: list
    }, null, 2), 'utf-8');
    console.log(`  Saved ${filePath} (${list.length} exams)`);
  }

  summaryList.sort((a, b) => a.level.localeCompare(b.level) || (b.year || 0) - (a.year || 0) || (b.month || 0) - (a.month || 0));
  const summaryPath = path.join(EXAMS_DIR, 'onjlpt_exams_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    source: BASE_URL,
    scrapedAt: new Date().toISOString(),
    stats: overallStats,
    exams: summaryList
  }, null, 2), 'utf-8');
  console.log(`  Saved ${summaryPath}`);

  // Also keep corodomo_jlpt_exams_summary.json updated? Leave summary clean at onjlpt_exams_summary.json
  console.log('\n====================================================');
  console.log('✅ ONJLPT.COM CRAWLING COMPLETED SUCCESSFULLY!');
  console.log(`- Total Exams: ${overallStats.totalExams}`);
  console.log(`- Total Question Sets (Mondai): ${overallStats.totalQuestionSets}`);
  console.log(`- Total Questions: ${overallStats.totalQuestions}`);
  console.log(`- Questions with Explanations: ${overallStats.questionsWithExplanation}`);
  console.log(`- Questions with Translations/Scripts: ${overallStats.questionsWithScript}`);
  console.log(`- Exams with Audio: ${overallStats.examsWithAudio}`);
  console.log('====================================================\n');
}

main().catch(err => {
  console.error('Fatal crawl error:', err);
  process.exit(1);
});
