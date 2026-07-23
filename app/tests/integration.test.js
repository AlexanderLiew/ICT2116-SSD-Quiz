const assert = require('node:assert/strict');
const path = require('node:path');
const { Pool } = require('pg');
const request = require('supertest');

process.env.PASSWORD_FILE ||= path.resolve(
  __dirname,
  '..',
  '..',
  'database',
  '100k-most-used-passwords-NCSC.txt',
);

const { app } = require('../server');
const {
  closeDatabase,
  initialiseDatabase,
} = require('../src/database');

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number.parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'ssd_quiz_test',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'ci-test-password',
});

const testPrefix = `q5-integration-${Date.now()}-${process.pid}`;

async function countTestRecords() {
  const result = await pool.query(
    'SELECT COUNT(*)::integer AS total FROM "2401499" WHERE username LIKE $1',
    [`${testPrefix}%`],
  );
  return result.rows[0].total;
}

describe('Q5 account-creation integration', () => {
  before(async () => {
    await initialiseDatabase();
  });

  after(async () => {
    await pool.query(
      'DELETE FROM "2401499" WHERE username LIKE $1',
      [`${testPrefix}%`],
    );
    await pool.end();
    await closeDatabase();
  });

  it('serves the account-creation form', async () => {
    const response = await request(app).get('/').expect(200);

    assert.match(response.text, /<form[^>]+action="\/account"/);
    assert.match(response.text, /<input[^>]+name="username"/);
    assert.match(response.text, /<input[^>]+name="password"/);
    assert.match(response.text, />Create account<\/button>/);
  });

  it('creates exactly one database record for a valid request', async () => {
    const username = `${testPrefix}-valid`;
    const password = `Q5 valid passphrase ${Date.now()}`;
    const beforeCount = await countTestRecords();

    const response = await request(app)
      .post('/account')
      .type('form')
      .send({ username, password })
      .expect(200);

    assert.match(response.text, /<title>Welcome<\/title>/);
    assert.equal(response.headers['cache-control'], 'no-store');

    const result = await pool.query(
      'SELECT username, created_at FROM "2401499" WHERE username = $1',
      [username],
    );
    assert.equal(result.rowCount, 1);
    assert.equal(result.rows[0].username, username);
    assert.ok(result.rows[0].created_at instanceof Date);
    assert.equal(await countTestRecords(), beforeCount + 1);
  });

  it('keeps the student table free of password columns', async () => {
    const result = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = '2401499'
       ORDER BY ordinal_position`,
    );

    assert.deepEqual(
      result.rows.map((row) => row.column_name),
      ['id', 'username', 'created_at'],
    );
  });

  for (const invalidCase of [
    {
      name: 'a password shorter than 10 characters',
      username: `${testPrefix}-short`,
      password: 'short123',
      message: 'Password must be at least 10 characters.',
    },
    {
      name: 'a non-ASCII password',
      username: `${testPrefix}-unicode`,
      password: 'validlengthé',
      message: 'Password may contain only printable ASCII characters',
    },
    {
      name: 'a known NCSC common password',
      username: `${testPrefix}-common`,
      password: '1234567890',
      message: 'Choose a less common password or passphrase.',
    },
    {
      name: 'a direct backend validation bypass attempt',
      username: `${testPrefix}-bypass`,
      password: 'password12',
      message: 'Choose a less common password or passphrase.',
    },
  ]) {
    it(`rejects ${invalidCase.name} without inserting a record`, async () => {
      const beforeCount = await countTestRecords();

      const response = await request(app)
        .post('/account')
        .type('form')
        .send({
          username: invalidCase.username,
          password: invalidCase.password,
        })
        .expect(400);

      assert.match(response.text, new RegExp(invalidCase.message));
      assert.match(response.text, /<title>Create account<\/title>/);
      assert.equal(await countTestRecords(), beforeCount);
    });
  }

  it('rejects a missing username without inserting a record', async () => {
    const beforeCount = await countTestRecords();

    const response = await request(app)
      .post('/account')
      .type('form')
      .send({ username: '', password: `Q5 valid phrase ${Date.now()}` })
      .expect(400);

    assert.match(response.text, /Username is required\./);
    assert.equal(await countTestRecords(), beforeCount);
  });

  it('HTML-escapes username and password output', async () => {
    const username = `${testPrefix}-<script>alert(1)</script>`;
    const password = `Q5 safe <strong>phrase</strong> ${Date.now()}`;

    const response = await request(app)
      .post('/account')
      .type('form')
      .send({ username, password })
      .expect(200);

    assert.ok(response.text.includes(
      `${testPrefix}-&lt;script&gt;alert(1)&lt;/script&gt;`,
    ));
    assert.ok(response.text.includes(
      'Q5 safe &lt;strong&gt;phrase&lt;/strong&gt;',
    ));
    assert.ok(!response.text.includes(username));
    assert.ok(!response.text.includes(password));
  });
});
