const fs = require('node:fs/promises');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'database',
  port: Number.parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'ssd_quiz',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD,
  max: 10,
});

const passwordFile = process.env.PASSWORD_FILE
  || '/app/data/100k-most-used-passwords-NCSC.txt';

const wait = (milliseconds) => new Promise((resolve) => {
  setTimeout(resolve, milliseconds);
});

async function waitForDatabase(attempts = 30) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }
      await wait(2000);
    }
  }
}

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS common_passwords (
      password TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS "2401499" (
      id BIGSERIAL PRIMARY KEY,
      username VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function importCommonPasswords() {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- Trusted deployment path, never HTTP input.
  const contents = await fs.readFile(passwordFile, 'utf8');
  const passwords = [...new Set(
    contents.split(/\r?\n/).filter((password) => password !== ''),
  )];
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    for (let offset = 0; offset < passwords.length; offset += 1000) {
      const batch = passwords.slice(offset, offset + 1000);
      await client.query(
        `INSERT INTO common_passwords (password)
         SELECT password
         FROM unnest($1::text[]) AS password
         ON CONFLICT (password) DO NOTHING`,
        [batch],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const result = await pool.query(
    'SELECT COUNT(*)::integer AS total FROM common_passwords',
  );
  return { sourceEntries: passwords.length, total: result.rows[0].total };
}

async function initialiseDatabase() {
  await waitForDatabase();
  await ensureTables();
  return importCommonPasswords();
}

async function pingDatabase() {
  await pool.query('SELECT 1');
}

async function isCommonPassword(password) {
  const result = await pool.query(
    'SELECT 1 FROM common_passwords WHERE password = $1 LIMIT 1',
    [password],
  );
  return result.rowCount > 0;
}

async function createStudent(username) {
  await pool.query(
    'INSERT INTO "2401499" (username) VALUES ($1)',
    [username],
  );
}

async function closeDatabase() {
  await pool.end();
}

module.exports = {
  closeDatabase,
  createStudent,
  initialiseDatabase,
  isCommonPassword,
  pingDatabase,
};
