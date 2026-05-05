/**
 * Seed exercise library from wger public REST API.
 * Run: pnpm --filter @orbit/api db:seed
 */
import { db } from './client.js';
import { exercises } from './schema.js';
import { nanoid } from 'nanoid';

interface WgerExercise {
  id: number;
  name: string;
  category: { name: string };
  muscles: { name_en: string }[];
  muscles_secondary: { name_en: string }[];
}

interface WgerResponse {
  results: WgerExercise[];
  next: string | null;
}

async function fetchExercises(): Promise<WgerExercise[]> {
  const all: WgerExercise[] = [];
  let url: string | null =
    'https://wger.de/api/v2/exercise/?format=json&language=2&limit=100&offset=0';

  while (url) {
    const res = await fetch(url);
    const data = (await res.json()) as WgerResponse;
    all.push(...data.results);
    url = data.next;
    if (data.next) await new Promise((r) => setTimeout(r, 300)); // polite rate limit
  }

  return all;
}

async function main() {
  console.info('Fetching exercises from wger API...');
  const raw = await fetchExercises();
  console.info(`Fetched ${raw.length} exercises`);

  const rows = raw
    .filter((e) => e.name?.trim())
    .map((e) => ({
      id: nanoid(),
      name: e.name.trim(),
      category: e.category?.name ?? 'Uncategorized',
      muscleGroups: [
        ...e.muscles.map((m) => m.name_en),
        ...e.muscles_secondary.map((m) => m.name_en),
      ].filter(Boolean),
      isCustom: false,
      createdByUserId: null,
    }));

  // Upsert to avoid duplicates on re-seed
  await db
    .insert(exercises)
    .values(rows)
    .onConflictDoNothing({ target: exercises.id });

  console.info(`Seeded ${rows.length} exercises`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
