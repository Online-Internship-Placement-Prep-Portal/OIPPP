const AppError = require('../utils/AppError');

// rejects keys like "$ne" anywhere in the body (SEC-4)
function hasOperatorKey(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.keys(value).some((k) => k.startsWith('$') || hasOperatorKey(value[k]));
}

function validate(schema, source = 'body') {
  return (req, res, next) => {
    if (hasOperatorKey(req[source])) {
      return next(new AppError(400, 'VALIDATION', 'Invalid characters in request'));
    }
    const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });
    if (error) {
      const details = error.details.map((d) => ({ field: d.path.join('.'), message: d.message }));
      return next(new AppError(400, 'VALIDATION', details[0].message, details));
    }
    req[source] = value;
    return next();
  };
}

module.exports = { validate, hasOperatorKey };
