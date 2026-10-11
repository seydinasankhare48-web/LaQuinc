import postgres from 'postgres';
import { bootstrapRoles } from '../bootstrap';

const { DATABASE_ADMIN_URL, LAQUINC_APP_PASSWORD, LAQUINC_MIGRATOR_PASSWORD } = process.env;
if (!DATABASE_ADMIN_URL || !LAQUINC_APP_PASSWORD || !LAQUINC_MIGRATOR_PASSWORD) {
  throw new Error('DATABASE_ADMIN_URL, LAQUINC_APP_PASSWORD and LAQUINC_MIGRATOR_PASSWORD are required');
}

const admin = postgres(DATABASE_ADMIN_URL, { max: 1, onnotice: () => {} });
try {
  await bootstrapRoles(admin, { app: LAQUINC_APP_PASSWORD, migrator: LAQUINC_MIGRATOR_PASSWORD });
  console.log('Roles ready');
} finally {
  await admin.end();
}
