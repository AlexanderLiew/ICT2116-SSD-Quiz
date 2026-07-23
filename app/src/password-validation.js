const MINIMUM_PASSWORD_LENGTH = 10;
const PRINTABLE_ASCII = /^[\x20-\x7E]+$/;

const PASSWORD_MESSAGES = Object.freeze({
  REQUIRED: 'Password is required.',
  TOO_SHORT: 'Password must be at least 10 characters.',
  INVALID_CHARACTERS: 'Password may contain only printable ASCII characters, including spaces.',
  COMMON: 'Choose a less common password or passphrase.',
});

function validatePasswordFormat(password) {
  if (typeof password !== 'string' || password.length === 0) {
    return PASSWORD_MESSAGES.REQUIRED;
  }

  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    return PASSWORD_MESSAGES.TOO_SHORT;
  }

  if (!PRINTABLE_ASCII.test(password)) {
    return PASSWORD_MESSAGES.INVALID_CHARACTERS;
  }

  return null;
}

module.exports = {
  MINIMUM_PASSWORD_LENGTH,
  PASSWORD_MESSAGES,
  validatePasswordFormat,
};
