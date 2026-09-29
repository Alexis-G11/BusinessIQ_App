// Help Center API — mock implementation

import type { HelpArticle } from '../lib/types';
import { mockDelay } from './client';
import { mockHelpArticles } from './mock-data';

export async function getHelpArticles(): Promise<HelpArticle[]> {
  await mockDelay(200, 400);
  return [...mockHelpArticles];
}

export async function searchHelpArticles(query: string): Promise<HelpArticle[]> {
  await mockDelay(200, 400);
  const q = query.toLowerCase();
  return mockHelpArticles.filter(
    (a) => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q) || a.category.toLowerCase().includes(q),
  );
}
