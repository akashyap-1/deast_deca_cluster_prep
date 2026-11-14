// The question bank for the cluster that is currently open. These exports are ES module live
// bindings: loadBank() replaces them, and the app re-mounts its pages when the cluster changes.
import type { ExamInfo, Question, QuestionBank } from '../lib/types';
import { fetchBank } from './clusters';

const EMPTY: QuestionBank = { generatedAt: new Date(0).toISOString(), exams: [], questions: [], instructionalAreas: [] };

export let bank: QuestionBank = EMPTY;
export let bankCluster: string | null = null;
export let allQuestions: Question[] = [];
export let byId = new Map<string, Question>();
export let exams: ExamInfo[] = [];
export let examById = new Map<string, ExamInfo>();
export let areas: string[] = [];

const cache = new Map<string, QuestionBank>();

export function setBank(b: QuestionBank, cluster: string) {
  bank = b;
  bankCluster = cluster;
  allQuestions = b.questions;
  byId = new Map(allQuestions.map((q) => [q.id, q]));
  exams = b.exams;
  examById = new Map(exams.map((e) => [e.id, e]));
  areas = b.instructionalAreas;
}

/** Loads (or reuses) a cluster's bank and makes it the current one. */
export async function loadBank(cluster: string): Promise<void> {
  let b = cache.get(cluster);
  if (!b) {
    b = JSON.parse(await fetchBank(cluster)) as QuestionBank;
    cache.set(cluster, b);
  }
  setBank(b, cluster);
}

/** Questions shown in the app: flagged (needsReview) ones are hidden unless the setting is on. */
export function visibleQuestions(includeFlagged: boolean): Question[] {
  return includeFlagged ? allQuestions : allQuestions.filter((q) => !q.needsReview);
}

export function examLabel(id: string): string {
  return examById.get(id)?.label ?? id;
}
