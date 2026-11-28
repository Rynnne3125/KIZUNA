import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const DOCS_DIR = path.resolve(process.cwd(), '../docs');
const EXAMS_DIR = path.join(DOCS_DIR, 'exams');
const SEED_PATH = path.join(DOCS_DIR, 'KIZUNA_NEJ_SEED_DATA.json');
const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

const escHtml = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const stripRubyTags = (html = '') =>
  String(html)
    .replace(/<rp>[^<]*<\/rp>/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const stripToPlain = (html = '') =>
  String(html)
    .replace(/<rt>[\s\S]*?<\/rt>/gi, '')
    .replace(/<rp>[\s\S]*?<\/rp>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();

const normMatchKey = (html = '') =>
  stripToPlain(html)
    .replace(/^[0-9０-９]+[.)．、\s]+/, '')
    .replace(/[＿_★（）\(\)\s　。、．，・！？「」『』\[\]【】]/g, '');

const cleanSurface = (s = '') =>
  stripToPlain(s)
    .replace(/^[0-9０-９]+[.)．、\s]+/, '')
    .replace(/[～〜\(\)（）・\s　。、！？「」『』＿_★\[\]【】]/g, '')
    .trim();

const hasKanji = (s = '') => /[\u4e00-\u9faf々]/.test(s);
const isMostlyJapanese = (s = '') => /[\u3040-\u30ff\u4e00-\u9faf]/.test(s);

function decodeHtmlEntities(s = '') {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTagsText(s = '') {
  return decodeHtmlEntities(s.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchPublicOnjlptGrammar() {
  const grammarEntries = [];
  const allUrls = [];

  for (const lv of LEVELS) {
    try {
      const res = await fetch(`https://onjlpt.com/ngu-phap/${lv}`);
      if (!res.ok) continue;
      const html = await res.text();
      const slugs = [
        ...new Set(
          [...html.matchAll(new RegExp(`ngu-phap/${lv}/[a-z0-9-]+`, 'gi'))].map(
            (m) => `/${m[0]}`
          )
        ),
      ];
      for (const s of slugs) allUrls.push({ lv, path: s });
    } catch {
      // skip if unreachable
    }
  }

  console.log(`Discovered ${allUrls.length} public grammar pages on onjlpt.com...`);
  const BATCH = 15;
  for (let i = 0; i < allUrls.length; i += BATCH) {
    const chunk = allUrls.slice(i, i + BATCH);
    const results = await Promise.all(
      chunk.map(async ({ lv, path: p }) => {
        try {
          const res = await fetch(`https://onjlpt.com${p}`);
          if (!res.ok) return null;
          const html = await res.text();
          const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
          const descMatch = html.match(
            /<meta[^>]+property="og:description"[^>]+content="([^"]*)"/i
          ) || html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i);

          const rawTitle = titleMatch
            ? decodeHtmlEntities(titleMatch[1].split(' - Ngữ pháp')[0]).trim()
            : '';
          const meaning = descMatch ? decodeHtmlEntities(descMatch[1]).trim() : '';

          // Extract first Cấu trúc block from rendered HTML
          let structure = '';
          const stIdx = html.indexOf('Cấu trúc');
          if (stIdx !== -1) {
            const sub = html.slice(stIdx, stIdx + 900);
            const pMatch = sub.match(/<p[^>]*class="[^"]*font-japanese[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
            if (pMatch) structure = stripTagsText(pMatch[1]);
          }

          if (!rawTitle || (!meaning && !structure)) return null;
          return {
            level: lv,
            pattern: rawTitle,
            titleVi: meaning,
            structure,
            explanation: meaning,
            source: 'onjlpt',
          };
        } catch {
          return null;
        }
      })
    );
    for (const r of results) if (r) grammarEntries.push(r);
  }
  console.log(`Fetched ${grammarEntries.length} public grammar entries from onjlpt.com.`);
  return grammarEntries;
}

function loadLegacyArchive() {
  const oldByQ = new Map();
  const oldByOpt = new Map();

  for (const n of [5, 4, 3, 2, 1]) {
    let raw;
    try {
      raw = execSync(`git show c72964c:docs/exams/jlpt_n${n}.json`, {
        cwd: path.resolve(process.cwd(), '..'),
        maxBuffer: 60 * 1024 * 1024,
      }).toString();
    } catch {
      continue;
    }
    const parsed = JSON.parse(raw);
    const exams = parsed.exams || parsed;
    for (const ex of exams) {
      const lv = String(ex.level || `N${n}`).toUpperCase();
      for (const qs of ex.questionSets || []) {
        for (const q of qs.questions || []) {
          const exp = cleanLegacyHtml(q.explanation || '');
          const scr = cleanLegacyScript(q.script || '');
          if (!exp && !scr) continue;

          const qKey = normMatchKey(q.question || '');
          if (qKey && qKey.length >= 4) {
            const prev = oldByQ.get(qKey) || { exp: '', script: '' };
            oldByQ.set(qKey, {
              exp: prev.exp.length >= exp.length ? prev.exp : exp,
              script: prev.script.length >= scr.length ? prev.script : scr,
            });
          }

          const opts = (q.options || []).map((o) => normMatchKey(o.value || '')).filter(Boolean);
          const meaningfulOpts = opts.filter((o) => o.length >= 2 && !/^[1-4]$/.test(o));
          if (opts.length === 4 && meaningfulOpts.length >= 3) {
            const optKey = `${lv}|${opts.join('|')}`;
            if (!oldByOpt.has(optKey)) {
              oldByOpt.set(optKey, { exp, script: scr });
            }
          }
        }
      }
    }
  }
  console.log(`Legacy c72964c archive indexed: qKeys=${oldByQ.size}, optKeys=${oldByOpt.size}`);
  return { oldByQ, oldByOpt };
}

function cleanLegacyHtml(html = '') {
  return stripRubyTags(html)
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/^(<p>)+|(<\/p>)+$/gi, '')
    .trim();
}

function cleanLegacyScript(html = '') {
  if (!html) return '';
  return stripRubyTags(html)
    .replace(/style="color:\s*#0f766e[^"]*"/gi, 'class="kizuna-tr-vi"')
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/^(<p>)+|(<\/p>)+$/gi, '')
    .trim();
}

function buildDictionaries(onjlptGrammar) {
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));

  // 1. Kanji dictionary
  const kanjiMap = new Map();
  for (const k of seed.kanji_dictionary || []) {
    if (!k.kanji) continue;
    kanjiMap.set(k.kanji, {
      kanji: k.kanji,
      hv: (k.sinoVietnamese || '').trim(),
      meaning: (k.vietnameseMeaning || k.meaning_vi || '').trim(),
      onyomi: (k.onyomi || '').trim(),
      kunyomi: (k.kunyomi || '').trim(),
    });
  }

  // 2. Vocabulary map
  const vocabMap = new Map();
  const levelRank = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
  const addVocab = (key, entry, isExactKanji) => {
    const clean = cleanSurface(key);
    if (!clean) return;
    if (!vocabMap.has(clean)) vocabMap.set(clean, []);
    vocabMap.get(clean).push({ ...entry, _isExactKanji: isExactKanji });
  };

  for (const v of seed.vocabulary_items || []) {
    const meaning = (v.vietnameseMeaning || v.meaning_vi || '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!meaning) continue;
    const term = (v.term || v.kanji || '').trim();
    const reading = (v.reading || v.hiragana || '').trim();
    const entry = {
      term,
      reading: reading || term,
      hv: (v.sinoVietnamese || '').trim(),
      meaning,
      wordType: (v.wordType || v.part_of_speech || '').trim(),
      level: String(v.jlptLevel || v.jlpt_level || 'N5').toUpperCase(),
      rank: levelRank[String(v.jlptLevel || 'N5').toUpperCase()] || 5,
    };
    if (v.term) addVocab(v.term, entry, true);
    if (v.kanji && v.kanji !== v.term) addVocab(v.kanji, entry, true);
    if (v.reading) addVocab(v.reading, entry, false);
    if (v.hiragana && v.hiragana !== v.reading) addVocab(v.hiragana, entry, false);
  }

  // Also add kanji exampleCompounds into vocabMap if not already present
  for (const k of seed.kanji_dictionary || []) {
    for (const ex of k.exampleCompounds || []) {
      const cleanW = cleanSurface(ex.word || '');
      if (!cleanW || !ex.meaning) continue;
      if (!vocabMap.has(cleanW)) {
        vocabMap.set(cleanW, [
          {
            term: ex.word,
            reading: ex.reading || ex.word,
            hv: '',
            meaning: ex.meaning,
            wordType: ex.type || '',
            level: String(ex.level || k.jlptLevel || 'N5').toUpperCase(),
            rank: levelRank[String(ex.level || 'N5').toUpperCase()] || 5,
            _isExactKanji: true,
          },
        ]);
      }
    }
  }

  // Sort each vocab bucket: exact kanji match first, then has reading/hv, then lower JLPT rank
  for (const [k, list] of vocabMap.entries()) {
    list.sort((a, b) => {
      if (a._isExactKanji !== b._isExactKanji) return a._isExactKanji ? -1 : 1;
      if (Boolean(a.hv) !== Boolean(b.hv)) return a.hv ? -1 : 1;
      return a.rank - b.rank;
    });
  }

  // 3. Grammar index
  const grammarList = [];
  const seenGram = new Set();
  const pushGrammar = (g) => {
    const pats = String(g.pattern || '')
      .split(/[/／・|]/)
      .map((p) =>
        p
          .replace(/^[～〜~]/, '')
          .replace(/(?:N|V|A|Na|Adj|い|な)(?=[～〜\u3040-\u30ff\u4e00-\u9faf]|$)/g, '')
          .replace(/[～〜\(\)（）\[\]\s　]/g, '')
          .trim()
      )
      .filter((p) => p.length >= 2 || (p.length === 1 && hasKanji(p)));
    if (!pats.length || !g.titleVi) return;
    const sig = `${g.pattern}|${g.titleVi}`;
    if (seenGram.has(sig)) return;
    seenGram.add(sig);
    grammarList.push({
      pattern: g.pattern,
      titleVi: g.titleVi,
      structure: g.structure || '',
      explanation: g.explanation || '',
      exampleJp: g.exampleJp || '',
      exampleVi: g.exampleVi || '',
      keys: [...new Set(pats)],
    });
  };

  for (const g of seed.grammar_items || []) {
    const ex0 = (g.examples || [])[0];
    pushGrammar({
      pattern: g.pattern,
      titleVi: g.titleVi,
      structure: g.structure,
      explanation: g.explanation,
      exampleJp: g.masterExampleJp || ex0?.sentence || '',
      exampleVi: g.masterExampleVi || ex0?.translation || '',
    });
  }
  for (const g of onjlptGrammar) {
    pushGrammar(g);
  }
  grammarList.sort((a, b) => {
    const maxA = Math.max(...a.keys.map((k) => k.length));
    const maxB = Math.max(...b.keys.map((k) => k.length));
    return maxB - maxA;
  });

  console.log(
    `Dictionaries ready: vocabKeys=${vocabMap.size}, kanji=${kanjiMap.size}, grammar=${grammarList.length}`
  );
  return { kanjiMap, vocabMap, grammarList };
}

function lookupVocab(word, dicts) {
  const clean = cleanSurface(word);
  if (!clean) return null;
  const hit = dicts.vocabMap.get(clean);
  if (hit && hit.length) {
    // Prefer entry matching exact surface spelling
    const exact = hit.find((h) => cleanSurface(h.term) === clean || cleanSurface(h.reading) === clean);
    return { surface: clean, ...(exact || hit[0]) };
  }

  // Deterministic conjugation stem fallback (for kanji/longer words)
  const suffixes = [
    ['ます', ['る', 'う', 'く', 'ぐ', 'す', 'つ', 'ぬ', 'ぶ', 'む']],
    ['ません', ['る', 'う', 'く', 'ぐ', 'す', 'つ', 'ぬ', 'ぶ', 'む']],
    ['ました', ['る', 'う', 'く', 'ぐ', 'す', 'つ', 'ぬ', 'ぶ', 'む']],
    ['ている', ['る', 'て', '']],
    ['ています', ['る', 'う']],
    ['ない', ['る', 'う']],
    ['なかった', ['る', 'う']],
    ['かった', ['い']],
    ['くない', ['い']],
    ['くて', ['い']],
    ['く', ['い']],
    ['た', ['る', 'う', 'く', 'す', 'つ', 'む', 'ぶ', 'ぬ']],
    ['て', ['る', 'う', 'く', 'す', 'つ', 'む', 'ぶ', 'ぬ']],
    ['だ', ['む', 'ぶ', 'ぬ', 'ぐ']],
    ['で', ['む', 'ぶ', 'ぬ', 'ぐ']],
    ['った', ['う', 'つ', 'る']],
    ['って', ['う', 'つ', 'る']],
    ['いた', ['く']],
    ['いて', ['く']],
    ['いだ', ['ぐ']],
    ['いで', ['ぐ']],
    ['した', ['す', 'する']],
    ['して', ['す', 'する']],
    ['する', ['']],
    ['な', ['']],
    ['に', ['']],
  ];
  for (const [suf, endings] of suffixes) {
    if (clean.length > suf.length + 1 && clean.endsWith(suf)) {
      const stem = clean.slice(0, -suf.length);
      for (const end of endings) {
        const cand = stem + end;
        if (cand.length < 2 && !hasKanji(cand)) continue;
        const m = dicts.vocabMap.get(cand);
        if (m && m.length) {
          return { surface: clean, ...m[0] };
        }
      }
    }
  }
  return null;
}

function getKanjiBreakdown(text, dicts) {
  const chars = [...new Set([...cleanSurface(text)].filter((c) => dicts.kanjiMap.has(c)))];
  return chars.map((c) => dicts.kanjiMap.get(c));
}

function formatVocabBrief(v, dicts) {
  if (!v) return '';
  const rd = v.reading && v.reading !== v.term ? ` (${v.reading})` : '';
  const hv = v.hv ? ` · <i>HV: ${escHtml(v.hv)}</i>` : '';
  return `<b>${escHtml(v.term)}</b>${escHtml(rd)}${hv}: ${escHtml(v.meaning)}`;
}

function extractSentenceKeywords(sentenceHtml, excludeSet, dicts, limit = 5) {
  const plain = stripToPlain(sentenceHtml).replace(/^[0-9０-９]+[.)．、\s]+/, '');
  const found = [];
  const seen = new Set(excludeSet);

  // Extract runs of Kanji / Katakana / Hiragana blocks and scan greedy longest match
  const chunks = plain.match(/[\u4e00-\u9faf々\u3040-\u309f\u30a0-\u30ff]+/g) || [];
  const stopWords = new Set([
    'こと', 'もの', 'とき', 'ところ', 'ため', 'よう', 'ほう', 'あと', 'まえ',
    'これ', 'それ', 'あれ', 'どれ', 'この', 'その', 'あの', 'どの', 'ここ', 'そこ', 'あそこ',
    'わたし', 'あなた', 'みんな', 'なに', 'なん', 'だれ', 'いつ', 'どこ', 'どう', 'なぜ',
    'です', 'ます', 'ました', 'ません', 'ある', 'いる', 'する', 'なる', 'できる', 'いう',
    'から', 'まで', 'より', 'ので', 'のに', 'けれど', 'しかし', 'そして', 'また', 'でも',
    'とても', 'あまり', 'ぜんぜん', 'もっと', 'もう', 'まだ', 'すぐ', 'いつも', 'ときどき',
  ]);

  for (const chunk of chunks) {
    let i = 0;
    while (i < chunk.length && found.length < limit) {
      let matched = null;
      const maxLen = Math.min(8, chunk.length - i);
      for (let len = maxLen; len >= 1; len--) {
        const sub = chunk.slice(i, i + len);
        if (len === 1) {
          if (!hasKanji(sub)) continue;
          const prevChar = i > 0 ? chunk[i - 1] : '';
          const nextChar = i + 1 < chunk.length ? chunk[i + 1] : '';
          // Do not break apart adjacent multi-kanji words / proper names (e.g. 佐藤 -> 佐 + 藤)
          if (hasKanji(prevChar) || hasKanji(nextChar)) continue;
        }
        if (stopWords.has(sub) || seen.has(sub)) continue;
        if (/^[\u3040-\u309f]{1,2}$/.test(sub) && !hasKanji(sub)) continue;
        const hit = dicts.vocabMap.get(sub);
        if (hit && hit.length) {
          if (hasKanji(sub) || /[\u30a0-\u30ff]{2,}/.test(sub) || sub.length >= 3) {
            matched = { len, item: hit[0], sub };
            break;
          }
        }
      }
      if (matched) {
        const key = cleanSurface(matched.item.term);
        if (!seen.has(key) && !seen.has(matched.sub)) {
          seen.add(key);
          seen.add(matched.sub);
          found.push(matched.item);
        }
        i += matched.len;
      } else {
        i++;
      }
    }
    if (found.length >= limit) break;
  }
  return found;
}

function matchGrammarForQuestion(qHtml, corrOptVal, dicts) {
  const qPlain = stripToPlain(qHtml);
  const optClean = cleanSurface(corrOptVal);
  const candidates = [];
  if (optClean) candidates.push(optClean);

  // Also test replacing blank ( ) in question with correct option
  const filled = qPlain.replace(/[（\(][　\s]*[）\)]|＿+/g, optClean);
  candidates.push(cleanSurface(filled));

  for (const g of dicts.grammarList) {
    for (const key of g.keys) {
      if (optClean && (optClean === key || optClean.includes(key))) {
        return g;
      }
      if (key.length >= 3 && filled.includes(key) && qPlain.includes(optClean) === false) {
        return g;
      }
    }
  }
  return null;
}

function buildEnrichedExplanation({ q, qs, level, legacy, dicts }) {
  const corrIdx = Number(q.correctAnswer) - 1;
  const corrOpt = q.options?.[corrIdx];
  const corrValPlain = corrOpt ? stripToPlain(corrOpt.value) : '';
  const uMatch = (q.question || '').match(/<u>([\s\S]*?)<\/u>/i);
  const targetSurface = uMatch ? cleanSurface(uMatch[1]) : '';
  const isListening = qs.part === 2 || qs.part === '2' || qs.part === 'LISTENING' || qs.sectionCode === 'listening';
  const isGrammarSec = qs.sectionCode === 'grammar_reading' && !qs.content;
  const title = qs.title || '';

  const parts = [];

  // 1. Verified legacy explanation (c72964c)
  if (legacy?.exp) {
    parts.push(`<div class="kizuna-exp-legacy">${legacy.exp}</div>`);
  }

  // 2. Target word / answer breakdown
  const targetVocab = targetSurface ? lookupVocab(targetSurface, dicts) : null;
  const corrVocab = corrValPlain && !title.includes('★') ? lookupVocab(corrValPlain, dicts) : null;
  const targetKanjis = targetSurface ? getKanjiBreakdown(targetSurface, dicts) : [];
  const corrKanjis = !targetSurface && corrValPlain ? getKanjiBreakdown(corrValPlain, dicts) : [];

  const mainNotes = [];
  if (targetSurface && !legacy?.exp) {
    if (targetVocab) {
      mainNotes.push(`Từ khóa ${formatVocabBrief(targetVocab, dicts)}`);
    } else if (corrVocab && corrVocab.term !== targetSurface) {
      mainNotes.push(`Từ khóa <b>${escHtml(targetSurface)}</b> → ${formatVocabBrief(corrVocab, dicts)}`);
    }
    if (targetKanjis.length) {
      const kStr = targetKanjis
        .map((k) => `${escHtml(k.kanji)} (${escHtml(k.hv || '?')}: ${escHtml(k.meaning)})`)
        .join(' · ');
      mainNotes.push(`<span class="kizuna-exp-kanji">Chữ Hán: ${kStr}</span>`);
    }
  } else if (!legacy?.exp && corrVocab) {
    mainNotes.push(`Đáp án ${formatVocabBrief(corrVocab, dicts)}`);
    if (corrKanjis.length && hasKanji(corrValPlain)) {
      const kStr = corrKanjis
        .map((k) => `${escHtml(k.kanji)} (${escHtml(k.hv || '?')}: ${escHtml(k.meaning)})`)
        .join(' · ');
      mainNotes.push(`<span class="kizuna-exp-kanji">Chữ Hán: ${kStr}</span>`);
    }
  }

  // 3. Grammar match (especially for grammar_reading or sentence patterns)
  if (!legacy?.exp && !isListening && !title.includes('★')) {
    const gram = matchGrammarForQuestion(q.question || '', corrValPlain, dicts);
    if (gram) {
      const st = gram.structure ? ` · Cấu trúc: <code>${escHtml(gram.structure)}</code>` : '';
      const ex = gram.exampleJp && gram.exampleVi
        ? `<div class="kizuna-exp-ex">VD: ${escHtml(gram.exampleJp)} → <i>${escHtml(gram.exampleVi)}</i></div>`
        : '';
      mainNotes.push(
        `<b>Ngữ pháp ${escHtml(gram.pattern)}</b>: ${escHtml(gram.titleVi)}${st}${ex}`
      );
    }
  }

  if (mainNotes.length) {
    parts.push(`<div class="kizuna-exp-main">${mainNotes.join('<br/>')}</div>`);
  }

  // 4. Option distractors glossary (skip ★ arrangement / long Dokkai options if none match cleanly)
  if (!legacy?.exp && (q.options || []).length > 0 && !title.includes('★')) {
    const optNotes = [];
    for (const opt of q.options) {
      const ov = stripToPlain(opt.value || '');
      if (!ov || ov.length > 22) continue;
      const vHit = lookupVocab(ov, dicts);
      const isRight = String(opt.id) === String(q.correctAnswer);
      if (vHit && vHit.meaning) {
        const mark = isRight ? '✓ ' : '';
        const rd = vHit.reading && vHit.reading !== ov ? ` (${vHit.reading})` : '';
        optNotes.push(
          `<span class="${isRight ? 'kizuna-opt-hit-ok' : 'kizuna-opt-hit'}">${mark}(${escHtml(opt.id)}) ${escHtml(ov)}${escHtml(rd)}: ${escHtml(vHit.meaning)}</span>`
        );
      } else if (hasKanji(ov)) {
        const ks = getKanjiBreakdown(ov, dicts);
        if (ks.length) {
          const mark = isRight ? '✓ ' : '';
          optNotes.push(
            `<span class="${isRight ? 'kizuna-opt-hit-ok' : 'kizuna-opt-hit'}">${mark}(${escHtml(opt.id)}) ${escHtml(ov)}: ${ks.map((k) => `${escHtml(k.hv || k.kanji)} (${escHtml(k.meaning)})`).join(' + ')}</span>`
          );
        }
      }
    }
    if (optNotes.length >= 2) {
      parts.push(`<div class="kizuna-exp-opts">${optNotes.join(' · ')}</div>`);
    }
  }

  // 5. Key vocabulary inside the question stem (so user understands what the sentence means!)
  if (!isListening && q.question) {
    const exclude = new Set([targetSurface, cleanSurface(corrValPlain)].filter(Boolean));
    const stemWords = extractSentenceKeywords(q.question, exclude, dicts, legacy?.exp ? 3 : 5);
    if (stemWords.length) {
      const chips = stemWords
        .map((w) => {
          const rd = w.reading && w.reading !== w.term ? ` (${w.reading})` : '';
          return `${escHtml(w.term)}${escHtml(rd)}: ${escHtml(w.meaning)}`;
        })
        .join(' · ');
      parts.push(`<div class="kizuna-exp-vocab"><b>Từ vựng trong câu:</b> ${chips}</div>`);
    }
  }

  // Fallback for Star (★) ordering questions: show assembled correct order + glossary if sentence reconstructed
  if (title.includes('★') && q.options?.length === 4 && !legacy?.exp) {
    const segs = q.options.map((o) => stripToPlain(o.value)).filter(Boolean);
    if (segs.length === 4) {
      parts.unshift(
        `<div class="kizuna-exp-main">Phương án đứng tại vị trí ★ là <b>(${escHtml(q.correctAnswer)}) ${escHtml(corrValPlain)}</b>.</div>`
      );
    }
  }

  return parts.join('');
}

async function main() {
  const onjlptGrammar = await fetchPublicOnjlptGrammar();
  const legacyArchive = loadLegacyArchive();
  const dicts = buildDictionaries(onjlptGrammar);

  let totalBeforeBytes = 0;
  let totalAfterBytes = 0;
  let stats = {
    totalQuestions: 0,
    withLegacyExp: 0,
    withEnrichedExp: 0,
    withLegacyScript: 0,
    withAnyInfo: 0,
  };

  for (const lv of LEVELS) {
    const filePath = path.join(EXAMS_DIR, `jlpt_${lv.toLowerCase()}.json`);
    totalBeforeBytes += fs.statSync(filePath).size;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    for (const ex of data.exams || []) {
      let expCount = 0;
      let scriptCount = 0;
      let actualQ = 0;

      for (const qs of ex.questionSets || []) {
        qs.title = stripRubyTags(qs.title || '');
        if (qs.content) qs.content = stripRubyTags(qs.content);
        else delete qs.content;
        if (qs.script) qs.script = cleanLegacyScript(qs.script);
        else delete qs.script;
        if (!qs.imageUrl) delete qs.imageUrl;
        if (!qs.audioUrl) delete qs.audioUrl;

        for (const q of qs.questions || []) {
          actualQ++;
          stats.totalQuestions++;

          q.question = stripRubyTags(q.question || '');
          if (q.content) q.content = stripRubyTags(q.content);
          else delete q.content;
          if (!q.imageUrl) delete q.imageUrl;
          if (!q.audioUrl) delete q.audioUrl;
          if (q.score === 1) delete q.score;

          for (const opt of q.options || []) {
            opt.value = stripRubyTags(opt.value || '');
          }

          // Match c72964c legacy archive
          const qKey = normMatchKey(q.question || '');
          let legacy = qKey ? legacyArchive.oldByQ.get(qKey) : null;
          if (!legacy && (q.options || []).length === 4) {
            const optKey = `${lv}|${q.options.map((o) => normMatchKey(o.value || '')).join('|')}`;
            legacy = legacyArchive.oldByOpt.get(optKey) || null;
          }

          const existingScript = cleanLegacyScript(q.script || '');
          const finalScript = legacy?.script || existingScript;
          if (finalScript) {
            q.script = finalScript;
            scriptCount++;
            stats.withLegacyScript++;
          } else {
            delete q.script;
          }

          const enrichedExp = buildEnrichedExplanation({ q, qs, level: lv, legacy, dicts });
          if (enrichedExp) {
            q.explanation = enrichedExp;
            expCount++;
            stats.withEnrichedExp++;
            if (legacy?.exp) stats.withLegacyExp++;
          } else {
            delete q.explanation;
          }

          if (q.explanation || q.script) stats.withAnyInfo++;
        }
      }

      ex.actualQuestionCount = actualQ;
      ex.explanationCount = expCount;
      ex.scriptCount = scriptCount;
    }

    const outJson = JSON.stringify(data);
    fs.writeFileSync(filePath, outJson, 'utf8');
    totalAfterBytes += fs.statSync(filePath).size;
    console.log(`Saved ${filePath} (${(fs.statSync(filePath).size / 1024 / 1024).toFixed(2)} MB)`);
  }

  console.log('=== OPTIMIZATION & ENRICHMENT SUMMARY ===');
  console.log({
    beforeMB: (totalBeforeBytes / 1024 / 1024).toFixed(2),
    afterMB: (totalAfterBytes / 1024 / 1024).toFixed(2),
    ...stats,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
