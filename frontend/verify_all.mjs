import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA49_93r5iK5nbY6TykssefQjrR6cp1SgY",
  authDomain: "ebook-fdc02.firebaseapp.com",
  projectId: "ebook-fdc02",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function verify() {
  console.log("=== VERIFYING LIVE FIRESTORE COLLECTIONS ===");
  for (const coll of ['stages', 'milestones', 'kanji_dictionary', 'vocabulary_items', 'grammar_items', 'milestone_quests']) {
    const snap = await getDocs(collection(db, coll));
    console.log(`- Collection [${coll}]: ${snap.size} documents online`);
  }

  // Check sample kanji
  const k1 = await getDoc(doc(db, 'kanji_dictionary', 'kanji_001_一'));
  console.log('Kanji #1:', k1.data()?.kanji, '| Âm Hán:', k1.data()?.sinoVietnamese, '| Nghĩa:', k1.data()?.vietnameseMeaning);

  const k130 = await getDoc(doc(db, 'kanji_dictionary', 'kanji_130_早'));
  console.log('Kanji #130:', k130.data()?.kanji, '| Âm Hán:', k130.data()?.sinoVietnamese, '| Nghĩa:', k130.data()?.vietnameseMeaning);

  const k300 = await getDoc(doc(db, 'kanji_dictionary', 'kanji_300_以'));
  console.log('Kanji #300:', k300.data()?.kanji, '| Âm Hán:', k300.data()?.sinoVietnamese, '| Nghĩa:', k300.data()?.vietnameseMeaning);

  // Check sample quest 1
  const q1 = await getDoc(doc(db, 'milestone_quests', 'ms_s2_u04_daily_routine_q1_srs_deck'));
  console.log('Sample Quest 1 Title:', q1.data()?.title);
  console.log('  -> Vocab cards count:', q1.data()?.deckContent?.vocabularyCount);
  console.log('  -> Kanji cards count:', q1.data()?.deckContent?.kanjiCount);

  // Check sample quest 3 (Grammar summary board)
  const q3 = await getDoc(doc(db, 'milestone_quests', 'ms_s2_u01_self_intro_q3_grammar_scramble_board'));
  console.log('Sample Quest 3 Title:', q3.data()?.title);
  console.log('  -> Total patterns in Summary Board:', q3.data()?.grammarSummaryBoard?.totalPatterns);

  process.exit(0);
}

verify().catch(console.error);
