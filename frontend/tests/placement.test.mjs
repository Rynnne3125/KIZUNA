import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { build } from 'esbuild';
import 'fake-indexeddb/auto';

const directory = resolve('build/placement-tests');
await mkdir(directory, { recursive: true });
const bundle = resolve(directory, 'placement-test-bundle.mjs');
const { outputFiles } = await build({
  stdin: {
    contents: "export * from './src/user/services/placementService'; export * from './src/user/services/placementAssessmentApi'; export * from './src/user/services/placementStorage';",
    resolveDir: process.cwd()
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  define: { 'import.meta.env.VITE_PLACEMENT_API_URL': 'undefined' },
  plugins: [{
    name: 'mock-firestore',
    setup(plugin) {
      plugin.onResolve({ filter: /^firebase\/firestore$|\/config\/firebase$/ }, ({ path }) => ({ path, namespace: 'mock' }));
      plugin.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({
        contents: path === 'firebase/firestore'
          ? 'export const { collection, doc, getDoc, getDocFromServer, getDocsFromServer, runTransaction } = globalThis.placementFirestoreMock;'
          : 'export const db = {};'
      }));
    }
  }]
});
await writeFile(bundle, outputFiles[0].text);

const documents = new Map();
const local = new Map();
let online = true;
let failFirestore = false;
const catalog = {
  stages: [
    { id: 'n5-1', orderIndex: 1, title: 'N5 chặng 1', jlptLevel: 'N5' },
    { id: 'n5-2', orderIndex: 2, title: 'N5 chặng 2', jlptLevel: 'N5' },
    { id: 'n4-1', orderIndex: 3, title: 'N4 chặng 1', jlptLevel: 'N4' },
    { id: 'n3-1', orderIndex: 4, title: 'N3 chặng 1', jlptLevel: 'N3' }
  ],
  milestones: [
    { id: 'lesson-1', stageId: 'n5-1', orderIndex: 1, title: 'Bài 1' },
    { id: 'lesson-5', stageId: 'n5-2', orderIndex: 1, title: 'Bài 5' },
    { id: 'lesson-6', stageId: 'n5-2', orderIndex: 2, title: 'Bài 6', canDoGoal: 'Hỏi nơi thực hiện hành động' },
    { id: 'lesson-26', stageId: 'n4-1', orderIndex: 1, title: 'Bài 26' },
    { id: 'lesson-51', stageId: 'n3-1', orderIndex: 1, title: 'Bài 51' }
  ]
};

Object.defineProperty(globalThis, 'navigator', { value: { get onLine() { return online; } } });
globalThis.localStorage = { getItem: key => local.get(key) ?? null, setItem: (key, value) => local.set(key, value) };
globalThis.sessionStorage = { removeItem() {} };
globalThis.window = new EventTarget();
const snapshot = (id, data) => ({ id, data: () => data });
globalThis.placementFirestoreMock = {
  collection: (_db, name) => name,
  doc: (_db, name, id) => `${name}/${id}`,
  getDocsFromServer: async name => {
    if (failFirestore) throw new Error('Firestore unavailable');
    return { docs: catalog[name].map(item => snapshot(item.id, item)) };
  },
  getDocFromServer: async ref => snapshot(ref, documents.get(ref)),
  getDoc: async ref => snapshot(ref, documents.get(ref)),
  runTransaction: async (_db, run) => {
    if (failFirestore) throw new Error('Firestore unavailable');
    const writes = [];
    const merge = (ref, values) => writes.push(() => documents.set(ref, { ...documents.get(ref), ...values }));
    const result = await run({
      get: async ref => snapshot(ref, documents.get(ref)),
      update: merge,
      set: merge
    });
    writes.forEach(write => write());
    return result;
  }
};

const {
  placementService, placementStorage, getPlacementLearningLevel, getPlacementTarget,
  getPassedPlacementLevels, formatPlacementStageTitle, getRoadmapAccess, assessPlacement, comparePlacementVersions
} = await import(pathToFileURL(bundle));
const screening = { studyBackground: 'basic_alphabet', certificate: 'none', goal: 'hobby', weeklyHours: '3_to_7h' };
const questions = ['N5', 'N4'].flatMap(level => placementService.getQuestionsForLevel(level, 1));
const answers = Object.fromEntries(questions.filter(question => question.level === 'N5').map(question => [question.id, question.correctAnswer]));
const aiReply = milestoneId => ({ ok: true, json: async () => ({ milestoneId, confidence: 'MODERATE', model: 'gemini-mock', latencyMs: 25 }) });

test('primes catalog, sends anonymous summaries and accepts a middle lesson from the current level', async () => {
  globalThis.fetch = async (_url, options) => {
    const input = JSON.parse(options.body);
    assert.deepEqual(Object.keys(input).sort(), ['candidates', 'levels']);
    assert.equal(input.levels[0].correct, 4);
    assert.equal(input.levels[1].correct, 0);
    assert.ok(input.levels[0].skills.some(skill => skill.category === 'grammar' && skill.correct === 1));
    assert.ok(input.levels[1].skills.every(skill => skill.correct === 0));
    assert.deepEqual([...new Set(input.candidates.map(item => item.level))], ['N5']);
    return aiReply('lesson-6');
  };
  const result = await placementService.evaluatePlacement('learner', screening, answers, questions, 1);
  assert.equal(result.assignedLevel, 'N5');
  assert.deepEqual(getPassedPlacementLevels(result), ['N5']);
  assert.equal(result.recommendedStageId, 'n5-2');
  assert.equal(result.recommendedMilestoneId, 'lesson-6');
  assert.equal(result.aiAssessment.confidence, 'MODERATE');
  assert.equal(getPlacementLearningLevel(result), 'N5');
  assert.equal(getPlacementTarget(catalog.stages, catalog.milestones, 'N5', 'n5-2', 'lesson-6').milestone.id, 'lesson-6');
});

test('rejects out-of-level recommendations and handles unavailable or malformed provider responses', async () => {
  const levels = [{ level: 'N5', total: 4, correct: 4, skills: [] }];
  const candidates = [{ id: 'lesson-1', level: 'N5', stageTitle: 'Stage', title: 'Lesson', goal: '' }];
  globalThis.fetch = async () => aiReply('lesson-26');
  assert.equal(await assessPlacement(levels, candidates), null);
  assert.equal((await placementService.evaluatePlacement('learner', screening, answers, questions)).recommendedMilestoneId, 'lesson-1');
  globalThis.fetch = async () => ({ ok: false });
  assert.equal(await assessPlacement(levels, candidates), null);
  globalThis.fetch = async () => { throw new Error('timeout'); };
  assert.equal(await assessPlacement(levels, candidates), null);
  assert.equal(await assessPlacement([], candidates), null);
  assert.equal(await assessPlacement(levels, []), null);
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ milestoneId: 'lesson-1', confidence: 'UNKNOWN' }) });
  assert.equal(await assessPlacement(levels, candidates), null);
});

test('allows a lower-level review lesson and keeps full access to both passed tiers', async () => {
  const allCorrect = Object.fromEntries(questions.map(question => [question.id, question.correctAnswer]));
  globalThis.fetch = async (_url, options) => {
    const { candidates } = JSON.parse(options.body);
    assert.deepEqual([...new Set(candidates.map(candidate => candidate.level))], ['N4', 'N5']);
    return aiReply('lesson-6');
  };
  const result = await placementService.evaluatePlacement('review', screening, allCorrect, questions, 1);
  assert.equal(result.assignedLevel, 'N4');
  assert.deepEqual(getPassedPlacementLevels(result), ['N5', 'N4']);
  assert.equal(getPlacementLearningLevel(result), 'N5');
  assert.equal(result.recommendedMilestoneId, 'lesson-6');
  assert.equal(getPlacementLearningLevel({ ...result, recommendedLearningLevel: 'N3' }), 'N4');
});

test('uses the last accessible N5 stage even when AI recommends the first lesson', async () => {
  const curriculum = JSON.parse(await readFile(new URL('../../docs/KIZUNA_NEJ_SEED_DATA.json', import.meta.url), 'utf8'));
  const firstStage = getPlacementTarget(curriculum.stages, curriculum.milestones, 'N5');
  const result = {
    assignedLevel: 'N5',
    passedLevels: ['N5'],
    recommendedLearningLevel: 'N5',
    recommendedStageId: firstStage.stage.id,
    recommendedMilestoneId: firstStage.milestone.id,
    aiAssessment: { milestoneId: firstStage.milestone.id }
  };
  const access = getRoadmapAccess(curriculum.stages, curriculum.milestones, [], result);
  assert.equal(access.placementTarget.stage.id, 'stage_n5_1');
  assert.equal(access.lastAccessibleStage.id, 'stage_n5_5');
  assert.equal(access.unlockedMilestoneIds.size, 30);
  assert.ok(!access.unlockedMilestoneIds.has('ms_minna_b26'));
});

test('includes stages unlocked through real completion and excludes their locked follow-up lessons', () => {
  assert.equal(getRoadmapAccess(catalog.stages, catalog.milestones, [], null).lastAccessibleStage.id, 'n5-1');
  const access = getRoadmapAccess(catalog.stages, catalog.milestones, ['lesson-1'], null);
  assert.equal(access.lastAccessibleStage.id, 'n5-2');
  assert.deepEqual([...access.unlockedMilestoneIds], ['lesson-1', 'lesson-5']);
  assert.equal(getRoadmapAccess([], [], [], null).lastAccessibleStage, null);
});

test('offline placement uses IndexedDB and syncs the newest queued result without changing completions', async () => {
  online = false;
  const result = await placementService.evaluatePlacement('offline', screening, answers, questions, 1);
  const old = { ...result, testedAt: '2026-11-11T00:00:00.000Z', attemptId: 'a' };
  const latest = { ...old, attemptId: 'b' };
  assert.equal(comparePlacementVersions(latest, old) > 0, true);
  assert.equal((await placementService.savePlacementResult(latest)).status, 'pending');
  assert.equal((await placementService.savePlacementResult(old)).result.attemptId, 'b');
  local.delete('kizuna_placement_offline');
  assert.equal((await placementService.checkUserPlacementStatus('offline')).attemptId, 'b');
  assert.equal(documents.has('users/offline'), false);
  assert.equal(await placementService.syncPendingPlacement('offline'), null);

  online = true;
  failFirestore = true;
  assert.equal(await placementService.syncPendingPlacement('offline'), null);
  assert.equal((await placementStorage.readPending('offline')).attemptId, 'b');
  assert.equal((await placementService.getPlacementCatalog()).milestones.length, 5);
  failFirestore = false;
  documents.set('user_progress/offline', { completedMilestones: ['lesson-1'] });
  assert.equal((await placementService.syncPendingPlacement('offline')).status, 'synced');
  assert.equal(await placementStorage.readPending('offline'), undefined);
  assert.equal(documents.get('user_progress/offline').currentMilestoneId, 'lesson-1');
  assert.deepEqual(documents.get('user_progress/offline').completedMilestones, ['lesson-1']);
  assert.equal((await placementService.checkUserPlacementStatus('offline')).attemptId, 'b');
  assert.equal(await placementService.syncPendingPlacement('offline'), null);
});

test('server timestamp wins over stale offline work, with repeat sync idempotent', async () => {
  const older = { ...(await placementService.evaluatePlacement('conflict', screening, {}, [])), testedAt: '2026-11-10T00:00:00.000Z' };
  const newer = { ...older, testedAt: '2026-11-11T00:00:00.000Z', recommendedMilestoneId: 'lesson-6' };
  assert.equal(older.questionSetId, undefined);
  online = false;
  await placementService.savePlacementResult(older);
  online = true;
  documents.set('users/conflict', { placementDetails: newer });
  const saved = await placementService.syncPendingPlacement('conflict');
  assert.equal(saved.result.recommendedMilestoneId, 'lesson-6');
  assert.equal(await placementStorage.readPending('conflict'), undefined);
  assert.equal(documents.has('user_progress/conflict'), false);
});

test('keeps existing result compatibility, local profile metadata and question availability', async () => {
  assert.equal(getPlacementLearningLevel({ assignedLevel: 'N5', recommendedMilestoneId: 'lesson-1' }), 'N4');
  assert.equal(getPlacementLearningLevel({ assignedLevel: 'Tân binh' }), 'N5');
  assert.equal(formatPlacementStageTitle('N5', '[N5] Chặng 1'), '[N5] Chặng 1');
  assert.equal(formatPlacementStageTitle('N5', 'Chặng 1'), '[N5] Chặng 1');
  assert.equal(getPlacementTarget(catalog.stages, catalog.milestones, 'N1'), null);
  assert.equal(placementService.getQuestionsForLevel('N2').length, 4);
  assert.equal(placementService.getQuestionsForLevel('N1').length, 4);
  assert.ok(placementService.getQuestionsForLevel('N5').every(question => question.options.some(option => option.key === question.correctAnswer)));
  local.set('kizuna_user', JSON.stringify({ id: 'profile' }));
  const result = await placementService.evaluatePlacement('profile', screening, {}, []);
  assert.equal((await placementService.savePlacementResult(result)).status, 'synced');
  assert.equal(JSON.parse(local.get('kizuna_user')).placementVerified, false);
  assert.equal(await placementService.checkUserPlacementStatus(''), null);
});
