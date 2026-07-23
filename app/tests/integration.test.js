const { expect } = require('chai');
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

    expect(response.text).to.match(/<form[^>]+action="\/account"/);
    expect(response.text).to.match(/<input[^>]+name="username"/);
    expect(response.text).to.match(/<input[^>]+name="password"/);
    expect(response.text).to.match(/>Create account<\/button>/);
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

    expect(response.text).to.match(/<title>Welcome<\/title>/);
    expect(response.headers['cache-control']).to.equal('no-store');

    const result = await pool.query(
      'SELECT username, created_at FROM "2401499" WHERE username = $1',
      [username],
    );
    expect(result.rowCount).to.equal(1);
    expect(result.rows[0].username).to.equal(username);
    expect(result.rows[0].created_at).to.be.an.instanceOf(Date);
    expect(await countTestRecords()).to.equal(beforeCount + 1);
  });

  it('keeps the student table free of password columns', async () => {
    const result = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = '2401499'
       ORDER BY ordinal_position`,
    );

    expect(
      result.rows.map((row) => row.column_name),
    ).to.deep.equal(['id', 'username', 'created_at']);
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

      expect(response.text).to.include(invalidCase.message);
      expect(response.text).to.match(/<title>Create account<\/title>/);
      expect(await countTestRecords()).to.equal(beforeCount);
    });
  }

  it('rejects a missing username without inserting a record', async () => {
    const beforeCount = await countTestRecords();

    const response = await request(app)
      .post('/account')
      .type('form')
      .send({ username: '', password: `Q5 valid phrase ${Date.now()}` })
      .expect(400);

    expect(response.text).to.match(/Username is required\./);
    expect(await countTestRecords()).to.equal(beforeCount);
  });

  it('HTML-escapes username and password output', async () => {
    const username = `${testPrefix}-<script>alert(1)</script>`;
    const password = `Q5 safe <strong>phrase</strong> ${Date.now()}`;

    const response = await request(app)
      .post('/account')
      .type('form')
      .send({ username, password })
      .expect(200);

    expect(response.text).to.include(
      `${testPrefix}-&lt;script&gt;alert(1)&lt;/script&gt;`,
    );
    expect(response.text).to.include(
      'Q5 safe &lt;strong&gt;phrase&lt;/strong&gt;',
    );
    expect(response.text).not.to.include(username);
    expect(response.text).not.to.include(password);
  });
});
