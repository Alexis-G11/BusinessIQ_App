// AI Assistant API — mock implementation

import type { AIMessage, AIAnswerType } from '../lib/types';
import { mockDelay, uid } from './client';
import { mockAIMessages, mockAIStarterQuestions } from './mock-data';

export function getStarterQuestions(): string[] {
  return mockAIStarterQuestions;
}

export async function getChatHistory(): Promise<AIMessage[]> {
  await mockDelay(300, 600);
  return [...mockAIMessages];
}

export async function sendMessage(content: string): Promise<AIMessage> {
  await mockDelay(800, 1600);
  const response = generateMockResponse(content);
  return {
    id: uid('ai'),
    role: 'assistant',
    content: response.content,
    answer_type: response.answer_type,
    sources: response.sources,
    created_at: new Date().toISOString(),
  };
}

function generateMockResponse(question: string): { content: string; answer_type: AIAnswerType; sources: string[] } {
  const q = question.toLowerCase();
  if (q.includes('profit') || q.includes('income') || q.includes('revenue')) {
    return {
      content: 'Your net profit this period is $8,684.50, down 18% from last month. Revenue was $29,650 (down 2%), while operating expenses rose 32% due to a refrigerator repair and higher staff salaries.\n\nRecommendation: Review whether the maintenance and salary increases are one-time or recurring.',
      answer_type: 'calculation',
      sources: ['Income Statement', 'Expense Ledger'],
    };
  }
  if (q.includes('owe') || q.includes('receivable') || q.includes('outstanding')) {
    return {
      content: 'As of today, 3 customers owe you a total of $2,025.50:\n\n• City Catering Co. — $1,880.00 (one invoice 35 days overdue)\n• Green Valley Restaurant — $450.00 (2 days overdue)\n• James Okoro — $75.50 (due today)\n\nRecommendation: Follow up with City Catering Co. on the 35-day overdue invoice first.',
      answer_type: 'fact',
      sources: ['Accounts Receivable Ledger'],
    };
  }
  if (q.includes('product') || q.includes('sell') || q.includes('top')) {
    return {
      content: 'Your top-selling products this month:\n\n1. Rice 5kg Bag — 17 units sold ($220.83)\n2. Sugar 1kg — 23 units sold ($51.75)\n3. Canned Beans — 30 units sold ($52.50)\n4. Bread Loaf — 10 units sold ($32.50)\n5. Cooking Oil 1L — 5 units sold ($22.50)',
      answer_type: 'fact',
      sources: ['Sales Ledger'],
    };
  }
  if (q.includes('spend') || q.includes('expense') || q.includes('supplies')) {
    return {
      content: 'You spent $6,765.50 on operating expenses this period. The breakdown:\n\n• Salaries — $3,200.00\n• Rent — $2,500.00\n• Utilities — $435.50\n• Supplies — $220.00\n• Maintenance — $175.00\n• Marketing — $150.00\n• Transport — $85.00',
      answer_type: 'fact',
      sources: ['Expense Ledger'],
    };
  }
  if (q.includes('order') || q.includes('restock') || q.includes('stock') || q.includes('inventory')) {
    return {
      content: '3 products need restocking:\n\n• Tea Bags 100ct — 0 in stock (threshold: 10)\n• Bottled Water 12pk — 3 in stock (threshold: 10)\n• Cooking Oil 1L — 8 in stock (threshold: 15)\n\nRecommendation: Order all three this week to avoid stockouts. Estimated restock cost: $340.',
      answer_type: 'recommendation',
      sources: ['Inventory Report'],
    };
  }
  if (q.includes('forecast') || q.includes('predict') || q.includes('next')) {
    return {
      content: 'Based on current trends, next month\'s revenue is forecast at $28,000-$31,000 (roughly flat). However, if the overdue City Catering Co. invoice ($1,880) is collected, cash flow will improve significantly.\n\nForecast: Profit should recover to ~$10,000+ if operating expenses normalize.',
      answer_type: 'forecast',
      sources: ['Sales Trend', 'Expense Trend'],
    };
  }
  if (q.includes('compare') || q.includes('month') || q.includes('trend')) {
    return {
      content: 'Month-over-month comparison:\n\n• Revenue: $29,650 (down 2% from $30,250)\n• Expenses: $6,765.50 (up 32% from $5,120)\n• Net Profit: $8,684.50 (down 18% from $10,580)\n• Orders: 87 (up 5% from 83)\n\nThe profit drop is driven by the expense increase, not a revenue decline.',
      answer_type: 'calculation',
      sources: ['Income Statement', 'Comparative Report'],
    };
  }
  return {
    content: 'I can help you understand your business data. Try asking about:\n\n• Revenue and profit trends\n• Who owes you money (receivables)\n• Top-selling products\n• Expense breakdowns\n• Inventory and restocking needs\n• Financial forecasts',
    answer_type: 'recommendation',
    sources: [],
  };
}
