// Today/Dashboard API — mock implementation

import type { TodaySummary, AttentionItem } from '../lib/types';
import { mockDelay } from './client';
import { mockTodaySummary, mockAttentionItems } from './mock-data';

export async function getTodaySummary(): Promise<TodaySummary> {
  await mockDelay(300, 700);
  return { ...mockTodaySummary };
}

export async function getAttentionFeed(): Promise<AttentionItem[]> {
  await mockDelay(300, 700);
  return [...mockAttentionItems];
}
