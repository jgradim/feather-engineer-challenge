import { execSync } from 'child_process';
import dotenv from 'dotenv';

export default async () => {
  dotenv.config({
    path: '.env.test',
    override: true,
  });

  const { DATABASE_URL } = process.env;

  execSync(`DATABASE_URL=${DATABASE_URL} yarn prisma generate`);
  execSync(`DATABASE_URL=${DATABASE_URL} yarn prisma migrate reset --force`);
  execSync(`DATABASE_URL=${DATABASE_URL} yarn prisma db seed`);
};
