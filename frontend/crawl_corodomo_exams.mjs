import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DOCS_DIR = path.resolve(__dirname, '../docs');
const EXAMS_DIR = path.resolve(DOCS_DIR, 'exams');

if (!fs.existsSync(EXAMS_DIR)) {
  fs.mkdirSync(EXAMS_DIR, { recursive: true });
}

// HTTP request helper with browser headers and retry
function fetchJson(url, referer = 'https://corodomo.com/practice/exams?id=jlpt-n3', retries = 3) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': referer,
        'Cache-Control': 'no-cache'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`JSON parse error from ${url}: ${e.message}`));
          }
        } else if (retries > 0 && res.statusCode >= 500) {
          console.warn(`[Retry ${retries}] Status ${res.statusCode} for ${url}`);
          setTimeout(() => {
            fetchJson(url, referer, retries - 1).then(resolve).catch(reject);
          }, 1500);
        } else {
          reject(new Error(`HTTP ${res.statusCode} from ${url}: ${data.slice(0, 150)}`));
        }
      });
    });

    req.on('error', (err) => {
      if (retries > 0) {
        console.warn(`[Retry ${retries}] Network error for ${url}: ${err.message}`);
        setTimeout(() => {
          fetchJson(url, referer, retries - 1).then(resolve).catch(reject);
        }, 1500);
      } else {
        reject(err);
      }
    });

    req.setTimeout(15000, () => {
      req.destroy(new Error(`Timeout fetching ${url}`));
    });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Parse year and month from label, e.g. "JLPT-N3 07 2024" or "JLPT N4 Đề 1"
function parseExamMetadata(exam) {
  const label = exam.label || '';
  const type = exam.type || '';
  const levelMatch = type.match(/jlpt-n([1-5])/i) || label.match(/N([1-5])/i);
  const level = levelMatch ? `N${levelMatch[1]}` : 'UNKNOWN';

  let year = null;
  let month = null;
  let testNumber = null;

  const ymMatch = label.match(/(\d{2})\s+(\d{4})/);
  if (ymMatch) {
    month = parseInt(ymMatch[1], 10);
    year = parseInt(ymMatch[2], 10);
  } else {
    const yMatch = label.match(/(20\d{2})/);
    if (yMatch) year = parseInt(yMatch[1], 10);
    const deMatch = label.match(/Đề\s*(\d+)/i) || label.match(/Ôn\s*tập\s*(\d+)/i);
    if (deMatch) testNumber = parseInt(deMatch[1], 10);
  }

  return {
    id: exam.id,
    label: exam.label,
    level,
    type: exam.type,
    year,
    month,
    testNumber,
    durationMinutes: exam.time,
    totalQuestions: exam.totalQuestion,
    parts: exam.part,
    audioUrl: exam.audio || null,
    createdAt: exam.createdAt
  };
}

// Clean and normalize HTML tags if necessary, preserving tags like <u> or formatting
function cleanHtml(str) {
  if (!str) return '';
  return str.trim();
}

async function main() {
  console.log('====================================================');
  console.log('🚀 CRAWLING JLPT EXAMS FROM CORODOMO.COM (N5 -> N1)');
  console.log('====================================================\n');

  console.log('1. Fetching complete exam catalog...');
  const catalogRes = await fetchJson('https://corodomo.com/api/exam?page=1&limit=100');
  const rawExams = catalogRes.data || [];
  console.log(`Found ${rawExams.length} total exams in catalog.\n`);

  // Group by level
  const levelOrder = ['jlpt-n5', 'jlpt-n4', 'jlpt-n3', 'jlpt-n2', 'jlpt-n1'];
  const examsByLevel = {
    N5: [],
    N4: [],
    N3: [],
    N2: [],
    N1: []
  };

  const allExamsDetailed = [];
  const summaryList = [];

  let overallStats = {
    totalExams: 0,
    totalQuestionSets: 0,
    totalQuestions: 0,
    questionsWithExplanation: 0,
    questionsWithScript: 0,
    examsWithAudio: 0
  };

  for (const rawExam of rawExams) {
    const meta = parseExamMetadata(rawExam);
    if (!examsByLevel[meta.level]) {
      examsByLevel[meta.level] = [];
    }
  }

  console.log('2. Crawling full question sets and answer details for each exam...');

  let processedCount = 0;
  for (const rawExam of rawExams) {
    processedCount++;
    const meta = parseExamMetadata(rawExam);
    const examUrlReferer = `https://corodomo.com/practice/exams/jlpt?id=${rawExam.id}`;

    process.stdout.write(`[${processedCount}/${rawExams.length}] Fetching ${meta.level} - "${meta.label}"... `);

    let qSets = [];
    try {
      const qRes = await fetchJson(`https://corodomo.com/api/exam/question?examId=${rawExam.id}`, examUrlReferer);
      qSets = qRes.data || [];
    } catch (err) {
      console.error(`\n❌ Error fetching questions for ${rawExam.id}:`, err.message);
      continue;
    }

    let examTotalQuestions = 0;
    let examExpCount = 0;
    let examScriptCount = 0;

    const normalizedQuestionSets = qSets.map((qs, setIdx) => {
      const questions = (qs.questions || []).map((q, qIdx) => {
        examTotalQuestions++;
        const hasExp = q.explanation && q.explanation.trim().length > 0;
        const hasScr = q.script && q.script.trim().length > 0;
        if (hasExp) examExpCount++;
        if (hasScr) examScriptCount++;

        return {
          id: q.id,
          index: q.index ?? (qIdx + 1),
          question: cleanHtml(q.question),
          content: cleanHtml(q.content),
          options: (q.options || []).map(opt => ({
            id: String(opt.id),
            value: cleanHtml(opt.value)
          })),
          correctAnswer: String(q.correctAnswer || '').trim(),
          explanation: cleanHtml(q.explanation),
          script: cleanHtml(q.script),
          score: q.score ?? 1
        };
      });

      return {
        id: qs.id,
        index: qs.index ?? (setIdx + 1),
        title: cleanHtml(qs.question),
        part: qs.part ?? 1, // 1: Knowledge/Reading, 2: Listening
        audioUrl: qs.audio || null,
        content: cleanHtml(qs.content),
        questionCount: questions.length,
        questions
      };
    });

    const fullExamData = {
      ...meta,
      questionSetCount: normalizedQuestionSets.length,
      actualQuestionCount: examTotalQuestions,
      explanationCount: examExpCount,
      scriptCount: examScriptCount,
      questionSets: normalizedQuestionSets
    };

    examsByLevel[meta.level].push(fullExamData);
    allExamsDetailed.push(fullExamData);

    const summaryItem = {
      id: meta.id,
      level: meta.level,
      label: meta.label,
      year: meta.year,
      month: meta.month,
      testNumber: meta.testNumber,
      durationMinutes: meta.durationMinutes,
      questionSets: normalizedQuestionSets.length,
      questions: examTotalQuestions,
      explanations: examExpCount,
      scripts: examScriptCount,
      hasAudio: !!meta.audioUrl
    };
    summaryList.push(summaryItem);

    overallStats.totalExams++;
    overallStats.totalQuestionSets += normalizedQuestionSets.length;
    overallStats.totalQuestions += examTotalQuestions;
    overallStats.questionsWithExplanation += examExpCount;
    overallStats.questionsWithScript += examScriptCount;
    if (meta.audioUrl) overallStats.examsWithAudio++;

    console.log(`OK! (${normalizedQuestionSets.length} sets, ${examTotalQuestions} qs, ${examExpCount} exp, ${examScriptCount} scripts)`);

    // Polite rate limit delay
    await sleep(250);
  }

  console.log('\n3. Saving structured JSON files to disk...');

  // Sort exams inside each level chronologically or by test number
  for (const [lvl, list] of Object.entries(examsByLevel)) {
    list.sort((a, b) => {
      if (a.year && b.year) {
        if (a.year !== b.year) return b.year - a.year; // newest year first
        return (b.month || 0) - (a.month || 0); // Dec then July
      }
      if (a.testNumber && b.testNumber) {
        return a.testNumber - b.testNumber;
      }
      return a.label.localeCompare(b.label);
    });

    const filePath = path.join(EXAMS_DIR, `jlpt_${lvl.toLowerCase()}.json`);
    fs.writeFileSync(filePath, JSON.stringify({
      level: lvl,
      totalExams: list.length,
      totalQuestions: list.reduce((sum, e) => sum + e.actualQuestionCount, 0),
      exams: list
    }, null, 2), 'utf-8');

    console.log(` Saved ${filePath} (${list.length} exams)`);
  }

  // Save summary catalog
  const summaryPath = path.join(EXAMS_DIR, 'corodomo_jlpt_exams_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    stats: overallStats,
    exams: summaryList
  }, null, 2), 'utf-8');
  console.log(` Saved ${summaryPath}`);

  // Save full consolidated dataset
  const fullPath = path.join(DOCS_DIR, 'CORODOMO_JLPT_EXAMS_FULL.json');
  fs.writeFileSync(fullPath, JSON.stringify({
    metadata: {
      source: 'https://corodomo.com/practice/exams',
      scrapedAt: new Date().toISOString(),
      stats: overallStats
    },
    exams: allExamsDetailed
  }, null, 2), 'utf-8');
  console.log(` Saved ${fullPath}`);

  console.log('\n====================================================');
  console.log('✅ ALL CRAWLING & COMPILATION COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
  console.log(`- Total Exams: ${overallStats.totalExams}`);
  console.log(`- Total Question Sets (Mondai): ${overallStats.totalQuestionSets}`);
  console.log(`- Total Questions: ${overallStats.totalQuestions}`);
  console.log(`- Questions with Detailed Explanations: ${overallStats.questionsWithExplanation}`);
  console.log(`- Questions with Audio Scripts / Translations: ${overallStats.questionsWithScript}`);
  console.log(`- Exams with Audio: ${overallStats.examsWithAudio}`);
  console.log('====================================================\n');
}

main().catch(err => {
  console.error('Fatal error during crawling:', err);
  process.exit(1);
});
