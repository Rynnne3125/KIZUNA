import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const firebaseConfig = {
  apiKey: "AIzaSyA49_93r5iK5nbY6TykssefQjrR6cp1SgY",
  authDomain: "ebook-fdc02.firebaseapp.com",
  databaseURL: "https://ebook-fdc02-default-rtdb.firebaseio.com",
  projectId: "ebook-fdc02",
  storageBucket: "ebook-fdc02.firebasestorage.app",
  messagingSenderId: "657175691442",
  appId: "1:657175691442:android:556972cc7268478ed949ab"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Read master data
let jsonPath = path.resolve('docs/KIZUNA_NEJ_SEED_DATA.json');
if (!fs.existsSync(jsonPath)) {
  jsonPath = path.resolve('../docs/KIZUNA_NEJ_SEED_DATA.json');
}
console.log(`Reading dataset from: ${jsonPath}`);
const rawData = fs.readFileSync(jsonPath, 'utf8');
const data = JSON.parse(rawData);

async function uploadCollectionInBatches(collectionName, items, idField = 'id') {
  console.log(`Uploading ${items.length} documents to [${collectionName}]...`);
  const BATCH_LIMIT = 250;
  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const chunk = items.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    for (let j = 0; j < chunk.length; j++) {
      const item = chunk[j];
      const docId = item[idField] || `${collectionName}_${i + j}`;
      const docRef = doc(db, collectionName, String(docId));
      batch.set(docRef, item, { merge: true });
    }
    await batch.commit();
    console.log(`  -> Saved batch ${i + 1} to ${Math.min(i + BATCH_LIMIT, items.length)} into [${collectionName}]`);
  }
}

async function runSeed() {
  try {
    console.log("=== STARTING COMPREHENSIVE BATCH UPLOAD TO FIRESTORE (ebook-fdc02) ===");
    await uploadCollectionInBatches('stages', data.stages, 'id');
    await uploadCollectionInBatches('milestones', data.milestones, 'id');
    await uploadCollectionInBatches('vocabulary_items', data.vocabulary_items, 'id');
    await uploadCollectionInBatches('kanji_dictionary', data.kanji_dictionary, 'id');
    await uploadCollectionInBatches('grammar_items', data.grammar_items, 'id');
    await uploadCollectionInBatches('milestone_quests', data.milestone_quests, 'id');
    console.log("=== FIRESTORE SEED COMPLETED SUCCESSFULLY! ALL DATA PERSISTED! ===");
    process.exit(0);
  } catch (err) {
    console.error("Upload error:", err);
    process.exit(1);
  }
}

runSeed();
