import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const file = join(root, 'data', 'tickets.json');
let queue = Promise.resolve();

const empty = () => ({ guilds: {} });

async function load() {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return empty();
    throw error;
  }
}

async function save(data) {
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  await writeFile(temporary, JSON.stringify(data, null, 2));
  await rename(temporary, file);
}

export async function transact(callback) {
  const operation = queue.then(async () => {
    const data = await load();
    const result = await callback(data);
    await save(data);
    return result;
  });
  queue = operation.catch(() => undefined);
  return operation;
}

export async function read(callback) {
  return callback(await load());
}

export function guildRecord(data, guildId) {
  data.guilds[guildId] ??= { settings: { topics: [], counter: 0 }, tickets: {} };
  return data.guilds[guildId];
}
