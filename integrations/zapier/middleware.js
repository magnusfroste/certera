'use strict';

const addApiKey = (request, z, bundle) => {
  if (bundle.authData && bundle.authData.api_key) {
    request.headers = request.headers || {};
    request.headers.Authorization = `Bearer ${bundle.authData.api_key.trim()}`;
  }
  return request;
};

// certera answers errors as { error: { code, message } }, written for a person: show that.
const explainErrors = (response, z) => {
  if (response.status < 400) return response;
  // A search asks for "not found" to come back as an empty result.
  if (response.status === 404 && response.request && response.request.skipThrowForStatus) return response;
  let error = {};
  try { error = (JSON.parse(response.content) || {}).error || {}; } catch { /* not JSON */ }
  const message = error.message || `certera answered ${response.status}`;
  if (response.status === 401) {
    throw new z.errors.Error('The API key was not accepted. Create a new one in certera.ink → Profile → API keys.', 'AuthenticationError', 401);
  }
  if (response.status === 429) {
    throw new z.errors.ThrottledError(message, 3600);
  }
  throw new z.errors.Error(message, error.code || 'CerteraError', response.status);
};

module.exports = { addApiKey, explainErrors };
