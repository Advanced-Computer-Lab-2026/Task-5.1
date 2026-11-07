// Local-only MongoDB for the TA demonstration; no system installation required.
import { MongoMemoryServer } from 'mongodb-memory-server';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dbPath = fileURLToPath(new URL('../../.local-demo/mongo-data/', import.meta.url));
const systemBinary = fileURLToPath(new URL('../../.local-demo/bin/mongod.exe', import.meta.url));
await mkdir(dbPath, { recursive: true });

const database = await MongoMemoryServer.create({
  binary: { version: '7.0.14', ...(existsSync(systemBinary) ? { systemBinary } : {}) },
  instance: {
    ip: '127.0.0.1',
    port: 27017,
    dbPath,
    storageEngine: 'wiredTiger'
  }
});
console.log('Local demo MongoDB ready at mongodb://127.0.0.1:27017/task51_ta_demo');

let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await database.stop({ doCleanup: false });
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
