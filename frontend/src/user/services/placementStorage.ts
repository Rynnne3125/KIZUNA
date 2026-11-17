import type { PlacementAssessmentResult } from './placementService';
import type { Milestone, Stage } from '../types/kizuna';

interface PlacementCatalog {
  stages: Stage[];
  milestones: Milestone[];
}

const STORE = 'placement';
const CATALOG = 'catalog';
let databasePromise: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  databasePromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('kizuna-placement', 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch(error => {
    databasePromise = undefined;
    throw error;
  });
  return databasePromise;
}

async function read<T>(key: string): Promise<T | undefined> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE).objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function write(update: (store: IDBObjectStore) => void): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite');
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
    update(transaction.objectStore(STORE));
  });
}

export function comparePlacementVersions(
  left: Pick<PlacementAssessmentResult, 'testedAt' | 'attemptId'>,
  right: Pick<PlacementAssessmentResult, 'testedAt' | 'attemptId'>
): number {
  const leftTime = Date.parse(left.testedAt) || 0;
  const rightTime = Date.parse(right.testedAt) || 0;
  if (leftTime !== rightTime) return leftTime - rightTime;
  const leftId = left.attemptId ?? '';
  const rightId = right.attemptId ?? '';
  return leftId === rightId ? 0 : leftId < rightId ? -1 : 1;
}

export const placementStorage = {
  readCatalog: () => read<PlacementCatalog>(CATALOG),
  writeCatalog: (catalog: PlacementCatalog) => write(store => store.put(catalog, CATALOG)),
  readPending: (userId: string) => read<PlacementAssessmentResult>(`pending:${userId}`),
  queue: (result: PlacementAssessmentResult) => write(store => {
    const key = `pending:${result.userId}`;
    const request = store.get(key);
    request.onsuccess = () => {
      const current = request.result as PlacementAssessmentResult | undefined;
      if (!current || comparePlacementVersions(result, current) > 0) store.put(result, key);
    };
  }),
  removeSynced: (result: PlacementAssessmentResult) => write(store => {
    const key = `pending:${result.userId}`;
    const request = store.get(key);
    request.onsuccess = () => {
      const current = request.result as PlacementAssessmentResult | undefined;
      if (current && comparePlacementVersions(current, result) <= 0) store.delete(key);
    };
  })
};
