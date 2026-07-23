import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';
import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

const { Pool } = pg;
const baseUrl = process.env.UI_BASE_URL || 'http://127.0.0.1:3000';
const testPrefix = `q5-ui-${Date.now()}-${process.pid}`;
const screenshotDirectory = path.resolve('reports', 'ui-failures');
const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number.parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'ssd_quiz_test',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'ci-test-password',
});

let driver;

async function openHome() {
  await driver.get(baseUrl);
  await driver.wait(until.titleIs('Create account'), 10000);
}

async function completeForm(username, password) {
  await driver.findElement(By.id('username')).sendKeys(username);
  await driver.findElement(By.id('password')).sendKeys(password);
  await driver.findElement(By.css('button[type="submit"]')).click();
}

describe('Q5 Selenium UI over HTTP', function seleniumSuite() {
  this.timeout(90000);

  before(async () => {
    const options = new chrome.Options()
      .addArguments(
        '--headless=new',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1280,900',
      );

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
  });

  afterEach(async function captureFailure() {
    if (this.currentTest?.state === 'failed' && driver) {
      await fs.mkdir(screenshotDirectory, { recursive: true });
      const safeName = this.currentTest.title.replaceAll(/[^a-z0-9]+/gi, '-');
      const image = await driver.takeScreenshot();
      await fs.writeFile(
        path.join(screenshotDirectory, `${safeName}.png`),
        image,
        'base64',
      );
    }
  });

  after(async () => {
    if (driver) {
      await driver.quit();
    }
    await pool.query(
      'DELETE FROM "2401499" WHERE username LIKE $1',
      [`${testPrefix}%`],
    );
    await pool.end();
  });

  it('loads the account-creation form', async () => {
    await openHome();

    assert.equal(
      await driver.findElements(By.css('input[name="username"]')).then(
        (elements) => elements.length,
      ),
      1,
    );
    assert.equal(
      await driver.findElements(By.css('input[name="password"]')).then(
        (elements) => elements.length,
      ),
      1,
    );
    assert.equal(
      await driver.findElements(By.css('button[type="submit"]')).then(
        (elements) => elements.length,
      ),
      1,
    );
  });

  it('shows immediate feedback for a short password', async () => {
    await openHome();
    await completeForm(`${testPrefix}-short`, 'short123');

    const errorArea = await driver.findElement(By.id('validation-error'));
    await driver.wait(
      until.elementTextContains(errorArea, 'at least 10 characters'),
      10000,
    );
    assert.equal(await driver.getTitle(), 'Create account');
  });

  it('rejects a common password and remains on the form', async () => {
    await openHome();
    await completeForm(`${testPrefix}-common`, '1234567890');

    const errorArea = await driver.findElement(By.id('validation-error'));
    await driver.wait(
      until.elementTextContains(errorArea, 'less common password'),
      10000,
    );
    assert.equal(await driver.getTitle(), 'Create account');
  });

  it('creates an account, displays the password, and logs out', async () => {
    const username = `${testPrefix}-valid`;
    const password = `Q5 browser phrase ${Date.now()}`;
    await openHome();
    await completeForm(username, password);

    await driver.wait(until.titleIs('Welcome'), 10000);
    assert.equal(
      await driver.findElement(By.css('h1')).getText(),
      `Welcome, ${username}`,
    );
    assert.equal(
      await driver.findElement(By.css('.submitted-password')).getText(),
      password,
    );

    const logout = await driver.findElement(By.xpath('//button[text()="Logout"]'));
    await logout.click();
    await driver.wait(until.titleIs('Create account'), 10000);
    assert.equal(
      await driver.findElements(By.id('account-form')).then(
        (elements) => elements.length,
      ),
      1,
    );
  });

  it('renders HTML metacharacters as text rather than elements', async () => {
    const username = `${testPrefix}-<strong>name</strong>`;
    const password = `Q5 safe <em>phrase</em> ${Date.now()}`;
    await openHome();
    await completeForm(username, password);

    await driver.wait(until.titleIs('Welcome'), 10000);
    assert.equal(
      await driver.findElement(By.css('h1')).getText(),
      `Welcome, ${username}`,
    );
    assert.equal(
      await driver.findElement(By.css('.submitted-password')).getText(),
      password,
    );
    assert.equal(
      await driver.findElements(By.css('h1 strong')).then(
        (elements) => elements.length,
      ),
      0,
    );
    assert.equal(
      await driver.findElements(By.css('.submitted-password em')).then(
        (elements) => elements.length,
      ),
      0,
    );
  });
});
