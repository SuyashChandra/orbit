/**
 * Seed exercise library from wger public REST API.
 * Run: pnpm --filter @orbit/api db:seed
 */
import 'dotenv/config';
import { db } from './client.js';
import { exercises } from './schema.js';
import { nanoid } from 'nanoid';

interface WgerTranslation {
  name: string;
  language: { short_name: string };
}

interface WgerExerciseInfo {
  id: number;
  category: { name: string } | null;
  muscles: { name_en: string }[];
  muscles_secondary: { name_en: string }[];
  translations: WgerTranslation[];
}

interface WgerResponse {
  results: WgerExerciseInfo[];
  next: string | null;
}

async function fetchExercises(): Promise<WgerExerciseInfo[]> {
  const all: WgerExerciseInfo[] = [];
  let url: string | null =
    'https://wger.de/api/v2/exerciseinfo/?format=json&language=2&limit=100&offset=0';

  while (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`wger API error: ${res.status}`);
    const data = (await res.json()) as WgerResponse;
    all.push(...data.results);
    console.info(`  fetched ${all.length} so far...`);
    url = data.next;
    if (data.next) await new Promise((r) => setTimeout(r, 300));
  }

  return all;
}

async function main() {
  console.info('Fetching exercises from wger API...');
  const raw = await fetchExercises();
  console.info(`Fetched ${raw.length} total entries`);

  const rows = raw
    .map((e) => {
      // prefer English translation, fall back to first available
      const translation =
        e.translations.find((t) => t.language.short_name === 'en') ??
        e.translations[0];
      const name = translation?.name?.trim();
      if (!name) return null;

      return {
        id: nanoid(),
        name,
        category: e.category?.name ?? 'Uncategorized',
        muscleGroups: [
          ...e.muscles.map((m) => m.name_en),
          ...e.muscles_secondary.map((m) => m.name_en),
        ].filter(Boolean),
        isCustom: false,
        createdByUserId: null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) {
    console.error('No valid exercises found — check wger API response structure');
    process.exit(1);
  }

  console.info(`Inserting ${rows.length} exercises in batches...`);

  // Insert in batches of 100 to avoid query size limits
  const BATCH_SIZE = 100;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db.insert(exercises).values(batch).onConflictDoNothing({ target: exercises.id });
    console.info(`  inserted ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length}`);
  }

  console.info(`✓ Seeded ${rows.length} exercises`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
