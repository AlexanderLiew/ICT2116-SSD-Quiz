const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const {
  closeDatabase,
  createStudent,
  initialiseDatabase,
  isCommonPassword,
  pingDatabase,
} = require('./src/database');
const {
  PASSWORD_MESSAGES,
  validatePasswordFormat,
} = require('./src/password-validation');

const app = express();
const port = Number.parseInt(process.env.PORT || '3000', 10);
const homeTemplate = fs.readFileSync(
  path.join(__dirname, 'public', 'index.html'),
  'utf8',
);

app.disable('x-powered-by');
app.use(express.urlencoded({ extended: false, limit: '4kb' }));
app.use(express.json({ limit: '4kb' }));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderHome(error = '') {
  const message = error
    ? `<p id="server-error" class="error" role="alert">${escapeHtml(error)}</p>`
    : '';
  return homeTemplate.replace('<!-- SERVER_ERROR -->', message);
}

function renderWelcome(username, password) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Welcome</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <main>
    <h1>Welcome, ${escapeHtml(username)}</h1>
    <p>Your submitted password is:</p>
    <p class="submitted-password">${escapeHtml(password)}</p>
    <p>The password is displayed only for this assessment and has not been stored.</p>
    <form action="/" method="get">
      <button type="submit">Logout</button>
    </form>
  </main>
</body>
</html>`;
}

async function validatePassword(password) {
  const formatError = validatePasswordFormat(password);
  if (formatError) {
    return formatError;
  }

  if (await isCommonPassword(password)) {
    return PASSWORD_MESSAGES.COMMON;
  }

  return null;
}

app.get('/', (_request, response) => {
  response.type('html').send(renderHome());
});

app.get('/health', async (_request, response) => {
  try {
    await pingDatabase();
    response.json({ status: 'ok' });
  } catch {
    response.status(503).json({ status: 'unavailable' });
  }
});

app.post('/api/check-password', async (request, response, next) => {
  try {
    const error = await validatePassword(request.body.password);
    response.json({
      valid: error === null,
      message: error,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/account', async (request, response, next) => {
  try {
    const username = typeof request.body.username === 'string'
      ? request.body.username.trim()
      : '';
    const password = request.body.password;

    if (!username) {
      return response.status(400).type('html').send(
        renderHome('Username is required.'),
      );
    }

    if (username.length > 100) {
      return response.status(400).type('html').send(
        renderHome('Username must be 100 characters or fewer.'),
      );
    }

    const passwordError = await validatePassword(password);
    if (passwordError) {
      return response.status(400).type('html').send(
        renderHome(passwordError),
      );
    }

    await createStudent(username);
    return response
      .set('Cache-Control', 'no-store')
      .type('html')
      .send(renderWelcome(username, password));
  } catch (error) {
    return next(error);
  }
});

app.use((error, _request, response, _next) => {
  void _next;
  console.error('Request failed without logging submitted form data:', error.message);
  response.status(500).type('html').send(
    renderHome('The request could not be completed. Please try again.'),
  );
});

let server;

async function start() {
  const importResult = await initialiseDatabase();
  console.log(
    `Database ready; common-password import contains ${importResult.total} unique entries.`,
  );
  server = app.listen(port, '0.0.0.0', () => {
    console.log(`Application listening on internal port ${port}.`);
  });
}

async function shutdown() {
  if (server) {
    server.close();
  }
  await closeDatabase();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

if (require.main === module) {
  start().catch((error) => {
    console.error('Application startup failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  app,
  start,
};
