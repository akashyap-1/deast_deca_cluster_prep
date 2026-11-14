// Sanity checks on the committed question banks (data/clusters/*.json, one per cluster).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { QuestionBank } from '../src/lib/types.ts';

const dir = path.resolve(import.meta.dirname, '..', 'data', 'clusters');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
// A DECA PI code ("FI:071") or, in 2023+ PFL exams, a National Standards strand + grade.
const PI_CODE =
  /^(?:[A-Z]{2,3}:\d{3}|(?:Earning Income|Spending|Saving|Investing|Managing Credit|Managing Risk) Grade (?:8|12))$/;

it('has a question bank for every exams/ folder', () => {
  const clusters = fs
    .readdirSync(path.resolve(dir, '..', '..', 'exams'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => `${d.name}.json`)
    .sort();
  expect(files).toEqual(clusters);
});

describe.each(files)('data/clusters/%s', (file) => {
  const bank: QuestionBank = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  it('has exams and questions', () => {
    expect(bank.exams.length).toBeGreaterThan(0);
    expect(bank.questions.length).toBeGreaterThan(0);
  });
  it('has 100 filled question slots for every exam', () => {
    for (const e of bank.exams) {
      expect(e.questionIds, e.id).toHaveLength(100);
      expect(e.questionIds.filter((id) => !id), e.id).toEqual([]);
    }
  });
  it('every exam slot points at an existing question', () => {
    const ids = new Set(bank.questions.map((q) => q.id));
    for (const e of bank.exams) for (const id of e.questionIds) if (id) expect(ids.has(id), `${e.id} -> ${id}`).toBe(true);
  });
  it('every usable question is complete', () => {
    for (const q of bank.questions.filter((q) => !q.needsReview)) {
      expect(q.question, q.id).not.toBe('');
      for (const L of ['A', 'B', 'C', 'D'] as const) expect(q.options[L], `${q.id} ${L}`).not.toBe('');
      expect(['A', 'B', 'C', 'D']).toContain(q.correct);
      expect(q.explanation, q.id).not.toBe('');
      expect(q.piCode, q.id).toMatch(PI_CODE);
      expect(q.instructionalArea, q.id).not.toBe('Unknown');
    }
  });
  it('flags at most 1% of questions', () => {
    expect(bank.questions.filter((q) => q.needsReview).length).toBeLessThanOrEqual(bank.questions.length / 100);
  });
  it('ids are unique and the area list matches the questions', () => {
    expect(new Set(bank.questions.map((q) => q.id)).size).toBe(bank.questions.length);
    expect(bank.instructionalAreas).toEqual([...new Set(bank.questions.map((q) => q.instructionalArea))].sort());
  });
});
