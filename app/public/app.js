const MINIMUM_PASSWORD_LENGTH = 10;
const PRINTABLE_ASCII = /^[\x20-\x7E]+$/;
const MESSAGES = Object.freeze({
  REQUIRED: 'Password is required.',
  TOO_SHORT: 'Password must be at least 10 characters.',
  INVALID_CHARACTERS: 'Password may contain only printable ASCII characters, including spaces.',
  COMMON: 'Choose a less common password or passphrase.',
});

const form = document.querySelector('#account-form');
const passwordInput = document.querySelector('#password');
const errorArea = document.querySelector('#validation-error');
let checkTimer;
let checkController;

function validatePasswordFormat(password) {
  if (password.length === 0) {
    return MESSAGES.REQUIRED;
  }
  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    return MESSAGES.TOO_SHORT;
  }
  if (!PRINTABLE_ASCII.test(password)) {
    return MESSAGES.INVALID_CHARACTERS;
  }
  return null;
}

function showError(message) {
  errorArea.textContent = message || '';
}

async function checkPassword(password) {
  const formatError = validatePasswordFormat(password);
  if (formatError) {
    return formatError;
  }

  const response = await fetch('/api/check-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
    signal: checkController?.signal,
  });

  if (!response.ok) {
    throw new Error('Password check failed');
  }

  const result = await response.json();
  return result.valid ? null : result.message;
}

passwordInput.addEventListener('input', () => {
  clearTimeout(checkTimer);
  checkController?.abort();

  const formatError = validatePasswordFormat(passwordInput.value);
  showError(formatError);
  if (formatError) {
    return;
  }

  checkTimer = setTimeout(async () => {
    checkController = new AbortController();
    try {
      showError(await checkPassword(passwordInput.value));
    } catch (error) {
      if (error.name !== 'AbortError') {
        showError('The password could not be checked. Please try again.');
      }
    }
  }, 300);
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearTimeout(checkTimer);
  checkController?.abort();
  checkController = new AbortController();

  try {
    const error = await checkPassword(passwordInput.value);
    showError(error);
    if (!error) {
      form.submit();
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      showError('The password could not be checked. Please try again.');
    }
  }
});
