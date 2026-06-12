import fs from 'fs/promises';
import path from 'path';
import { AppData, ScrapedItem, Topic } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'app-data.json');

const defaultData: AppData = {
  scrapedItems: [],
  topics: [],
  lastScrapedAt: null,
};

export async function readData(): Promise<AppData> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { ...defaultData };
  }
}

export async function writeData(data: AppData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

export async function getTopics(): Promise<Topic[]> {
  const data = await readData();
  return data.topics.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getTopic(id: string): Promise<Topic | null> {
  const data = await readData();
  return data.topics.find((t) => t.id === id) ?? null;
}

export async function saveTopic(topic: Topic): Promise<void> {
  const data = await readData();
  const idx = data.topics.findIndex((t) => t.id === topic.id);
  if (idx >= 0) {
    data.topics[idx] = topic;
  } else {
    data.topics.push(topic);
  }
  await writeData(data);
}

export async function deleteTopic(id: string): Promise<void> {
  const data = await readData();
  data.topics = data.topics.filter((t) => t.id !== id);
  await writeData(data);
}

export async function getScrapedItems(): Promise<ScrapedItem[]> {
  const data = await readData();
  return data.scrapedItems;
}

export async function saveScrapedItems(items: ScrapedItem[]): Promise<{ added: number }> {
  const data = await readData();
  const existingIds = new Set(data.scrapedItems.map((i) => i.id));
  const newItems = items.filter((i) => !existingIds.has(i.id));

  // Keep items from last 7 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const retained = data.scrapedItems.filter((i) => new Date(i.scrapedAt) > cutoff);

  data.scrapedItems = [...newItems, ...retained];
  data.lastScrapedAt = new Date().toISOString();
  await writeData(data);
  return { added: newItems.length };
}

export async function getLastScrapedAt(): Promise<string | null> {
  const data = await readData();
  return data.lastScrapedAt;
}
