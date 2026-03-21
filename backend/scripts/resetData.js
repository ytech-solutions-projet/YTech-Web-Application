const fs = require('fs/promises');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const database = require('../config/database');
const { initializeDatabase } = require('../utils/databaseBootstrap');

const TARGET_TABLES = ['messages', 'quotes', 'contact_requests', 'user_sessions', 'users'];
const LEGACY_CONTACT_REQUESTS_FILE = path.join(__dirname, '..', 'data', 'contact-requests.json');

const hasArg = (value) => process.argv.slice(2).includes(value);

const printHelp = () => {
  console.log(`
Reset des donnees YTECH

Usage:
  node scripts/resetData.js
  node scripts/resetData.js --wipe-all
  node scripts/resetData.js --dry-run

Comportement:
  - sans option: vide les donnees applicatives puis recree le compte admin seed si ADMIN_SEED_PASSWORD est configure
  - --wipe-all: vide tout, y compris les utilisateurs, sans recreer l admin
  - --dry-run: affiche ce qui serait vide sans rien modifier

Tables ciblees:
  ${TARGET_TABLES.join(', ')}

Important:
  - le fichier legacy backend/data/contact-requests.json est remis a [] pour eviter une remigration automatique
  - le stockage navigateur du front n est pas vide par ce script
  `);
};

const getExistingTables = async () => {
  const rows = await database.query(
    `SELECT tablename
     FROM pg_tables
     WHERE schemaname = 'public' AND tablename = ANY($1::text[])
     ORDER BY tablename ASC`,
    [TARGET_TABLES]
  );

  return rows.map((row) => row.tablename);
};

const resetLegacyContactRequestsFile = async (dryRun = false) => {
  if (dryRun) {
    return {
      updated: true,
      filePath: LEGACY_CONTACT_REQUESTS_FILE
    };
  }

  await fs.mkdir(path.dirname(LEGACY_CONTACT_REQUESTS_FILE), { recursive: true });
  await fs.writeFile(LEGACY_CONTACT_REQUESTS_FILE, '[]\n', 'utf8');

  return {
    updated: true,
    filePath: LEGACY_CONTACT_REQUESTS_FILE
  };
};

const truncateTables = async (tables, dryRun = false) => {
  if (tables.length === 0) {
    return;
  }

  const sql = `TRUNCATE TABLE ${tables.map((table) => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE`;

  if (dryRun) {
    console.log(`[dry-run] SQL: ${sql}`);
    return;
  }

  await database.execute(sql);
};

const main = async () => {
  if (hasArg('--help') || hasArg('-h')) {
    printHelp();
    return;
  }

  const dryRun = hasArg('--dry-run');
  const wipeAll = hasArg('--wipe-all');
  const recreateAdmin = !wipeAll;

  try {
    const existingTables = await getExistingTables();

    console.log(`Tables detectees: ${existingTables.length > 0 ? existingTables.join(', ') : 'aucune table cible'}`);

    await truncateTables(existingTables, dryRun);
    const legacyFileResult = await resetLegacyContactRequestsFile(dryRun);

    if (recreateAdmin) {
      if (dryRun) {
        console.log('[dry-run] Le script recreerait ensuite le compte admin seed si la variable ADMIN_SEED_PASSWORD est configuree.');
      } else {
        const adminSeedResult = await initializeDatabase();

        if (adminSeedResult?.skipped) {
          console.log('Donnees videes. Aucun admin recree car ADMIN_SEED_PASSWORD n est pas configure.');
        } else {
          console.log(
            `Donnees videes. Compte admin ${adminSeedResult?.created ? 'recree' : 'synchronise'} pour ${adminSeedResult.email}.`
          );
        }
      }
    } else {
      console.log(dryRun ? '[dry-run] Aucune recreation admin apres le reset complet.' : 'Reset complet termine sans recreation admin.');
    }

    if (legacyFileResult.updated) {
      console.log(`${dryRun ? '[dry-run] ' : ''}Fichier legacy nettoye: ${legacyFileResult.filePath}`);
    }

    console.log('Note: pour un ecran front totalement vierge, vide aussi le localStorage du navigateur.');
  } finally {
    await database.close();
  }
};

main().catch((error) => {
  console.error('Reset impossible:', error.message);
  process.exitCode = 1;
});
