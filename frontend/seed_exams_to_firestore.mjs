import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch, getDocs, getDoc, setDoc } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DOCS_DIR = path.resolve(__dirname, '../docs');

// Firebase Configuration (ebook-fdc02)
let envConfig = {};
try {
  const envContent = fs.readFileSync(path.resolve(__dirname, '.env'), 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      envConfig[match[1]] = match[2]?.trim() || '';
    }
  }
} catch {
  // ignore missing .env
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
    if (typeof v === 'function' || typeof v === 'symbol' || v === undefined) return null;
    return v;
  }));
}

async function seedExams() {
  console.log('====================================================');
  console.log('🚀 SEEDING JLPT EXAMS TO CLOUD FIRESTORE (ebook-fdc02)');
  console.log('====================================================\n');

  const EXAMS_DIR = path.resolve(DOCS_DIR, 'exams');
  const levelFiles = ['jlpt_n5.json', 'jlpt_n4.json', 'jlpt_n3.json', 'jlpt_n2.json', 'jlpt_n1.json'];
  
  let allExams = [];
  for (const file of levelFiles) {
    const filePath = path.join(EXAMS_DIR, file);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      allExams.push(...(data.exams || []));
    }
  }

  // Fallback to full file if available
  if (allExams.length === 0) {
    const fullDataPath = path.join(DOCS_DIR, 'CORODOMO_JLPT_EXAMS_FULL.json');
    if (fs.existsSync(fullDataPath)) {
      const dataset = JSON.parse(fs.readFileSync(fullDataPath, 'utf-8'));
      allExams = dataset.exams || [];
    }
  }

  // Normalize labels (ensure no "Thi thử" prefix/marker) and filter to valid exams
  allExams = allExams
    .filter(exam =>
      exam?.id &&
      Array.isArray(exam.questionSets) &&
      exam.questionSets.length > 0 &&
      exam.questionSets.some(qs => Array.isArray(qs.questions) && qs.questions.length > 0)
    )
    .map(exam => ({
      ...exam,
      label: String(exam.label || '').replace(/\s*Thi\s*thử\s*/gi, ' ').replace(/\s{2,}/g, ' ').trim()
    }));

  const validExamIds = new Set(allExams.map(e => e.id));
  console.log(`Loaded ${allExams.length} valid exams across N5 -> N1`);

  // 0. Clean up stale / broken / orphan documents in both collections
  console.log('\n--- 0. Cleaning up orphan / broken exam docs in Firestore ---');
  for (const colName of ['jlpt_exam_catalog', 'jlpt_exams']) {
    const existingSnap = await getDocs(collection(db, colName));
    const staleDocs = existingSnap.docs.filter(d => !validExamIds.has(d.id));
    if (staleDocs.length > 0) {
      for (let i = 0; i < staleDocs.length; i += 400) {
        const batch = writeBatch(db);
        for (const d of staleDocs.slice(i, i + 400)) {
          batch.delete(d.ref);
        }
        await batch.commit();
      }
      console.log(`  🗑️ Removed ${staleDocs.length} stale/orphan docs from [${colName}]: ${staleDocs.map(d => d.id).join(', ')}`);
    } else {
      console.log(`  ✓ [${colName}] has no stale/orphan docs.`);
    }
  }


  // 1. Push to jlpt_exams (Full document per exam)
  console.log('\n--- 1. Pushing to [jlpt_exams] (Full exam with questionSets & answers) ---');
  const BATCH_SIZE = 10; // ~1MB to 1.5MB per batch
  let pushedExams = 0;

  for (let i = 0; i < allExams.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = allExams.slice(i, i + BATCH_SIZE);

    for (const exam of chunk) {
      const docRef = doc(db, 'jlpt_exams', exam.id);
      const cleanExam = stripUndefined(exam);
      batch.set(docRef, cleanExam);
    }

    await batch.commit();
    pushedExams += chunk.length;
    console.log(`  Pushed [${pushedExams}/${allExams.length}] exams into [jlpt_exams]`);
  }

  // 2. Push to jlpt_exam_catalog (Lightweight metadata for fast listing)
  console.log('\n--- 2. Pushing to [jlpt_exam_catalog] (Lightweight metadata catalog) ---');
  let pushedCatalog = 0;
  for (let i = 0; i < allExams.length; i += 50) {
    const batch = writeBatch(db);
    const chunk = allExams.slice(i, i + 50);

    for (const exam of chunk) {
      const docRef = doc(db, 'jlpt_exam_catalog', exam.id);
      const catalogItem = stripUndefined({
        id: exam.id,
        label: exam.label,
        level: exam.level,
        type: exam.type,
        year: exam.year,
        month: exam.month,
        testNumber: exam.testNumber,
        isMock: exam.isMock ?? false,
        durationMinutes: exam.durationMinutes,
        totalQuestions: exam.totalQuestions,
        actualQuestionCount: exam.actualQuestionCount,
        parts: exam.parts,
        audioUrl: exam.audioUrl,
        questionSetCount: exam.questionSetCount,
        explanationCount: exam.explanationCount,
        scriptCount: exam.scriptCount,
        sourceUrl: exam.sourceUrl || null,
        createdAt: exam.createdAt,
        updatedAt: new Date().toISOString()
      });
      batch.set(docRef, catalogItem);
    }

    await batch.commit();
    pushedCatalog += chunk.length;
    console.log(`  Pushed [${pushedCatalog}/${allExams.length}] metadata items into [jlpt_exam_catalog]`);
  }

  // 3. Update system_config/stats examsCount
  try {
    await setDoc(doc(db, 'system_config', 'stats'), {
      examsCount: allExams.length,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`\n✅ Updated [system_config/stats].examsCount = ${allExams.length}`);
  } catch (err) {
    console.warn('⚠️ Could not update system_config/stats:', err.message);
  }

  // 4. Verification
  console.log('\n--- 3. Verifying Firestore Collections ---');
  const examsSnap = await getDocs(collection(db, 'jlpt_exams'));
  console.log(`✅ [jlpt_exams] total documents in Firestore: ${examsSnap.size}`);

  const catalogSnap = await getDocs(collection(db, 'jlpt_exam_catalog'));
  console.log(`✅ [jlpt_exam_catalog] total documents in Firestore: ${catalogSnap.size}`);

  // Test read a sample document from each level
  const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];
  console.log('\n--- 4. Sample Verification from Firestore ---');
  for (const lvl of levels) {
    const sample = allExams.find(x => x.level === lvl);
    if (sample) {
      const docSnap = await getDoc(doc(db, 'jlpt_exams', sample.id));
      if (docSnap.exists()) {
        const d = docSnap.data();
        console.log(`Level [${lvl}]: "${d.label}" -> ${d.questionSets?.length} sets, ${d.actualQuestionCount} questions, Audio: ${!!d.audioUrl}`);
      } else {
        console.error(`❌ Could not find sample ${sample.id} in Firestore!`);
      }
    }
  }

  console.log('\n====================================================');
  console.log('✅ ALL EXAMS SEEDED & VERIFIED ON FIRESTORE SUCCESSFULLY!');
  console.log('====================================================\n');
  process.exit(0);
}

seedExams().catch(err => {
  console.error('Fatal error seeding exams:', err);
  process.exit(1);
});
