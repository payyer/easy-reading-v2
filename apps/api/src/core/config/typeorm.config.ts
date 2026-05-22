import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from .env file
config({ path: join(__dirname, '../../../.env') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

export default new DataSource({
  type: 'postgres',
  url: dbUrl,
  entities: [join(__dirname, '../../modules/**/entities/*.entity.{ts,js}')],
  migrations: [join(__dirname, '../../database/migrations/*.{ts,js}')],
  synchronize: false,
});
