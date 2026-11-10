'use strict';
const { API_BASE } = require('./lib');

module.exports = {
  type: 'custom',
  fields: [
    {
      key: 'api_key',
      label: 'API Key',
      type: 'password',
      required: true,
      helpText: 'Create one at [certera.ink → Profile → API keys](https://www.certera.ink/profile). It starts with `cert_`.',
    },
  ],
  test: { url: `${API_BASE}/v1/me` },
  connectionLabel: '{{account}}',
};
