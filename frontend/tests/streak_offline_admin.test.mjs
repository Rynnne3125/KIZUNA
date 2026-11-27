import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, beforeEach } from 'node:test';
import { build } from 'esbuild';

const directory = resolve('build/streak-tests');
await mkdir(directory, { recursive: true });
const bundle = resolve(directory, 'streak-offline-bundle.mjs');

const { outputFiles } = await build({
  stdin: {
    contents: [
      "export * from './src/user/services/authService';",
      "export * from './src/user/services/progressService';",
      "export * from './src/user/services/dailyQuestService';",
      "export * from './src/user/services/networkService';"
    ].join('\n'),
    resolveDir: process.cwd()
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  define: { 'import.meta.env.VITE_API_BASE_URL': '""' },
  plugins: [
    {
      name: 'mock-externals',
      setup(plugin) {
        plugin.onResolve(
          { filter: /^(firebase\/firestore|firebase\/auth|@capacitor\/core|@capacitor\/network|@codetrix-studio\/capacitor-google-auth|@emailjs\/browser)$|config\/firebase$/ },
          ({ path }) => ({ path, namespace: 'mock' })
        );
        plugin.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => {
          if (path === 'firebase/firestore') {
            return {
              contents: `
                export const doc = (...args) => args.slice(1).join('/');
                export const collection = (_db, name) => name;
                export const query = (c, ...rest) => ({ c, rest });
                export const where = (f, op, v) => ({ f, op, v });
                export const limit = (n) => n;
                export const increment = (n) => ({ __inc: n });
                export const getDoc = (...args) => globalThis.__mockFs.getDoc(...args);
                export const getDocs = (...args) => globalThis.__mockFs.getDocs(...args);
                export const setDoc = (...args) => globalThis.__mockFs.setDoc(...args);
                export const updateDoc = (...args) => globalThis.__mockFs.updateDoc(...args);
              `
            };
          }
          if (path.endsWith('config/firebase')) {
            return { contents: 'export const db = {}; export const auth = {}; export const app = {};' };
          }
          if (path === '@capacitor/core') {
            return { contents: 'export const Capacitor = { isNativePlatform: () => false, isPluginAvailable: () => false };' };
          }
          if (path === '@capacitor/network') {
            return {
              contents: `export const Network = {
                getStatus: async () => ({ connected: true, connectionType: 'wifi' }),
                addListener: async () => ({ remove: () => {} })
              };`
            };
          }
          if (path === '@codetrix-studio/capacitor-google-auth') {
            return { contents: 'export const GoogleAuth = { initialize: () => {}, signIn: async () => ({}), signOut: async () => {} };' };
          }
          if (path === '@emailjs/browser') {
            return { contents: 'export default { send: async () => ({ status: 200 }) };' };
          }
          if (path === 'firebase/auth') {
            return {
              contents: `export const GoogleAuthProvider = { credential: () => ({}) };
                export const signInWithPopup = async () => ({});
                export const signInWithCredential = async () => ({});
                export const signInWithRedirect = async () => {};
                export const getRedirectResult = async () => null;
                export const signOut = async () => {};`
            };
          }
          return { contents: 'export default {};' };
        });
      }
    }
  ]
});
await writeFile(bundle, outputFiles[0].text);

// Setup browser globals for Node
const localStore = new Map();
const sessionStore = new Map();
let navOnline = true;
let fsStore = new Map();
let fsShouldFail = false;

function createStorage(map) {
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    clear: () => { map.clear(); }
  };
}

Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { get onLine() { return navOnline; } }
});
globalThis.localStorage = createStorage(localStore);
globalThis.sessionStorage = createStorage(sessionStore);
globalThis.window = Object.assign(new EventTarget(), {
  location: { origin: 'https://kizuna.local' }
});
globalThis.CustomEvent = class CustomEvent extends Event {
  constructor(type, init) {
    super(type);
    this.detail = init?.detail;
  }
};

function applyMerge(target, patch) {
  const out = { ...(target || {}) };
  for (const [k, v] of Object.entries(patch || {})) {
    if (v && typeof v === 'object' && '__inc' in v) {
      out[k] = (Number(out[k]) || 0) + Number(v.__inc);
    } else {
      out[k] = v;
    }
  }
  return out;
}

globalThis.__mockFs = {
  getDoc: async (ref) => {
    if (fsShouldFail) throw new Error('Network error');
    const data = fsStore.get(ref);
    return {
      exists: () => data !== undefined,
      id: ref.split('/').pop(),
      data: () => data
    };
  },
  getDocs: async () => ({ empty: true, forEach: () => {} }),
  setDoc: async (ref, data, opts) => {
    if (fsShouldFail) throw new Error('Network error');
    fsStore.set(ref, opts?.merge ? applyMerge(fsStore.get(ref), data) : data);
  },
  updateDoc: async (ref, data) => {
    if (fsShouldFail) throw new Error('Network error');
    if (!fsStore.has(ref)) throw new Error('Not found');
    fsStore.set(ref, applyMerge(fsStore.get(ref), data));
  }
};

const {
  STREAK_FREEZE_COST,
  authService,
  evaluateDailyStreak,
  evaluateStreakExpiry,
  getLocalDateString,
  progressService,
  dailyQuestService,
  networkService
} = await import(pathToFileURL(bundle));

beforeEach(() => {
  localStore.clear();
  sessionStore.clear();
  fsStore = new Map();
  navOnline = true;
  fsShouldFail = false;
  networkService.setSimulatedType(null);
});

test('STREAK_FREEZE_COST is 1000 active points and buyStreakFreeze enforces 1000 AP', async () => {
  assert.equal(STREAK_FREEZE_COST, 1000);

  const user = {
    id: 'u_shield',
    username: 'shielder',
    fullName: 'Shield Tester',
    email: 'shield@test.local',
    role: 'ROLE_USER',
    activePoints: 999,
    totalXp: 500,
    currentStreak: 3,
    streakFreezes: 0
  };
  authService.setSession('tok_1', user);
  fsStore.set('users/u_shield', { ...user });

  const failRes = await dailyQuestService.buyStreakFreeze('u_shield');
  assert.equal(failRes.ok, false);
  assert.equal(authService.getCurrentUser().streakFreezes, 0);

  authService.updateCurrentUser({ activePoints: 1200 });
  const okRes = await dailyQuestService.buyStreakFreeze('u_shield');
  assert.equal(okRes.ok, true);
  assert.equal(okRes.user.activePoints, 200);
  assert.equal(okRes.user.streakFreezes, 1);
  assert.equal(fsStore.get('users/u_shield').activePoints, 200);
  assert.equal(fsStore.get('users/u_shield').streakFreezes, 1);
});

test('Opening app does NOT auto-increment streak; only exercise progress change increments daily streak', async () => {
  const yesterday = new Date(Date.now() - 86400000);
  const yesterdayStr = getLocalDateString(yesterday);
  const todayStr = getLocalDateString(new Date());

  const user = {
    id: 'u_streak',
    username: 'learner',
    fullName: 'Learner',
    email: 'learner@test.local',
    role: 'ROLE_USER',
    activePoints: 100,
    totalXp: 200,
    currentStreak: 4,
    streakFreezes: 0,
    lastActiveDate: yesterdayStr
  };
  authService.setSession('tok_2', user);
  fsStore.set('users/u_streak', { ...user });

  // App open should NOT increment streak from 4 to 5
  const openRes = await authService.checkAndUpdateDailyStreak(user);
  assert.equal(openRes.user.currentStreak, 4);
  assert.equal(openRes.evaluation.streakUpdated, false);
  assert.equal(authService.getCurrentUser().currentStreak, 4);

  // Completing a Kanji exercise (new progress!) increments streak once for today
  const kanjiChanged = await progressService.saveKanjiProgress('u_streak', ['k_1', 'k_2'], 'kanji_N5_p1_flip', false);
  assert.equal(kanjiChanged, true);
  assert.equal(authService.getCurrentUser().currentStreak, 5);
  assert.equal(authService.getCurrentUser().lastActiveDate, todayStr);
  assert.equal(fsStore.get('user_progress/u_streak').kanjiLearned, 2);

  // Completing Vocab on the same day updates vocabLearned, keeps streak at 5 (only +1 per day)
  const vocabChanged = await progressService.saveVocabExerciseProgress('u_streak', 'n5-tango', 'u01', 2, ['v_1', 'v_2'], 'flip');
  assert.equal(vocabChanged, true);
  assert.equal(authService.getCurrentUser().currentStreak, 5);
  assert.equal(fsStore.get('user_progress/u_streak').vocabLearned, 2);

  // Repeating exact same Vocab Flip again with NO progress change returns false and does nothing
  const vocabRepeat = await progressService.saveVocabExerciseProgress('u_streak', 'n5-tango', 'u01', 2, ['v_1', 'v_2'], 'flip');
  assert.equal(vocabRepeat, false);

  // Completing Grammar exercise also increments progress & triggers streak check
  const grammarChanged = await progressService.saveGrammarExerciseProgress('u_streak', 'g_u01', 1, ['g_1'], 'quiz');
  assert.equal(grammarChanged, true);
  assert.equal(fsStore.get('user_progress/u_streak').grammarLearned, 1);
});

test('Streak shield protects missed day and expired streak without shield resets to 0 on app open then 1 on study', async () => {
  const twoDaysAgoStr = getLocalDateString(new Date(Date.now() - 2 * 86400000));
  const threeDaysAgoStr = getLocalDateString(new Date(Date.now() - 3 * 86400000));

  // Case 1: Missed 1 day with 1 shield -> preserved & incremented when studying
  const evalShield = evaluateDailyStreak(7, twoDaysAgoStr, new Date(), 1);
  assert.equal(evalShield.shieldUsed, true);
  assert.equal(evalShield.newStreak, 8);
  assert.equal(evalShield.remainingFreezes, 0);

  // Case 2: Missed 2 days with only 1 shield -> expires on app open to 0
  const expiry = evaluateStreakExpiry(7, threeDaysAgoStr, new Date(), 1);
  assert.equal(expiry.expired, true);
  assert.equal(expiry.nextStreak, 0);

  // Case 3: Admin reset streak to 0 today (lastActiveDate is today) -> studying today starts streak at 1
  const todayStr = getLocalDateString(new Date());
  const evalAfterReset = evaluateDailyStreak(0, todayStr, new Date(), 0);
  assert.equal(evalAfterReset.streakUpdated, true);
  assert.equal(evalAfterReset.newStreak, 1);
});

test('Offline learning queues roadmap, kanji, vocab, grammar, exam, shield and syncs to Firestore on reconnect', async () => {
  navOnline = false;
  fsShouldFail = true;

  const user = {
    id: 'u_offline',
    username: 'offliner',
    fullName: 'Offline Learner',
    email: 'off@test.local',
    role: 'ROLE_USER',
    activePoints: 1500,
    totalXp: 300,
    currentStreak: 2,
    streakFreezes: 0,
    lastActiveDate: getLocalDateString(new Date(Date.now() - 86400000))
  };
  authService.setSession('tok_off', user);

  // Study offline across Roadmap, Kanji, Exam, and buy a Shield offline
  await progressService.saveQuestProgress('u_offline', 'ms_minna_b01', 1, 30, 15);
  await progressService.saveKanjiProgress('u_offline', ['k_10', 'k_11'], 'kanji_N5_p1_quiz', true);
  await progressService.saveExamResult({
    userId: 'u_offline',
    examId: 'ex_n5_01',
    examLabel: 'JLPT N5 01',
    level: 'N5',
    score: 20,
    total: 30,
    percentage: 67,
    isPassed: true,
    timeSpentSeconds: 600,
    answeredCount: 30,
    totalQuestions: 30,
    completedAt: new Date().toISOString(),
    userAnswers: {}
  });
  const shieldRes = await dailyQuestService.buyStreakFreeze('u_offline');
  assert.equal(shieldRes.ok, true);

  // Local state already reflects progress + streak +1 + shield purchase
  const localUser = authService.getCurrentUser();
  assert.equal(localUser.currentStreak, 3);
  assert.equal(localUser.streakFreezes, 1);
  assert.ok(progressService.getPendingSyncCount('u_offline') >= 4);

  // Come back online and sync everything to Firestore
  navOnline = true;
  fsShouldFail = false;
  fsStore.set('users/u_offline', {
    id: 'u_offline',
    activePoints: 1500,
    totalXp: 300,
    currentStreak: 2,
    streakFreezes: 0
  });

  const syncedProgress = await progressService.syncOfflineQueue('u_offline');
  const syncedDaily = await dailyQuestService.syncOfflineDailyQuests('u_offline');
  assert.ok(syncedProgress > 0);
  assert.ok(syncedDaily > 0);
  assert.equal(progressService.getPendingSyncCount('u_offline'), 0);

  const remoteProgress = fsStore.get('user_progress/u_offline');
  assert.equal(remoteProgress.kanjiLearned, 2);
  assert.equal(remoteProgress.examsCompleted, 1);
  assert.equal(remoteProgress.milestonesCompleted, 1);
  assert.deepEqual(remoteProgress.completedQuests, { ms_minna_b01: [1] });
  assert.ok(fsStore.has('user_exam_results/u_offline_ex_n5_01'));

  const remoteUser = fsStore.get('users/u_offline');
  assert.equal(remoteUser.currentStreak, 3);
  assert.equal(remoteUser.streakFreezes, 1);
});

test('Weak network (slow response or single packet failure) does NOT trigger false offline status', async () => {
  navOnline = true;

  // 1. Slow probe (2800ms latency) -> quality = 'weak', isOffline = false
  const origNow = Date.now;
  let fakeNow = 100000;
  Date.now = () => fakeNow;
  globalThis.fetch = async () => {
    fakeNow += 2800;
    return { ok: true, status: 200 };
  };
  const slowStatus = await networkService.getStatus(true);
  assert.equal(slowStatus.isOffline, false);
  assert.equal(slowStatus.connected, true);
  assert.equal(slowStatus.isWeak, true);
  assert.equal(slowStatus.quality, 'weak');

  // 2. Single probe failure while navigator.onLine is true -> weak, NOT offline
  fakeNow += 5000;
  globalThis.fetch = async () => { throw new Error('Timeout'); };
  const singleFailStatus = await networkService.getStatus(true);
  assert.equal(singleFailStatus.isOffline, false);
  assert.equal(singleFailStatus.isWeak, true);

  // 3. Second consecutive probe failure -> confirmed offline
  fakeNow += 5000;
  const doubleFailStatus = await networkService.getStatus(true);
  assert.equal(doubleFailStatus.isOffline, true);
  assert.equal(doubleFailStatus.quality, 'offline');

  Date.now = origNow;
});
