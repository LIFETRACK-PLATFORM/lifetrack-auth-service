import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'generated/prisma/client';
import { envs } from '../src/config/envs';

// Utilidad de desarrollo: hace backup en JSON de Credential y sus tokens
// asociados, y luego los borra en el orden que exigen las FK (RESTRICT,
// no CASCADE). Pensada para limpiar cuentas de prueba entre sesiones de
// verificación manual del flujo de auth. Uso: pnpm run db:reset-dev-users

const adapter = new PrismaPg({ connectionString: envs.databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const [credentials, refreshTokens, passwordResetTokens, emailVerificationTokens] =
    await Promise.all([
      prisma.credential.findMany(),
      prisma.refreshToken.findMany(),
      prisma.passwordResetToken.findMany(),
      prisma.emailVerificationToken.findMany(),
    ]);

  console.log(
    `Encontrado: ${credentials.length} credenciales, ${refreshTokens.length} refresh tokens, ` +
      `${passwordResetTokens.length} password reset tokens, ${emailVerificationTokens.length} email verification tokens`,
  );

  if (credentials.length === 0) {
    console.log('No hay cuentas para borrar.');
    await prisma.$disconnect();
    return;
  }

  const backupsDir = join(__dirname, 'backups');
  mkdirSync(backupsDir, { recursive: true });
  const backupPath = join(
    backupsDir,
    `${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  );
  writeFileSync(
    backupPath,
    JSON.stringify(
      { credentials, refreshTokens, passwordResetTokens, emailVerificationTokens },
      null,
      2,
    ),
  );
  console.log(`Backup guardado en ${backupPath}`);

  await prisma.refreshToken.deleteMany({});
  await prisma.passwordResetToken.deleteMany({});
  await prisma.emailVerificationToken.deleteMany({});
  await prisma.credential.deleteMany({});

  console.log('Cuentas de prueba borradas.');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
