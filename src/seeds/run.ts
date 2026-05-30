import { seedStickers } from './stickers';
import { seedUsers } from './users';

async function run(): Promise<void> {
  console.log('Running seeds...');
  seedStickers();
  await seedUsers();
  console.log('All seeds complete.');
  process.exit(0);
}

run().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
