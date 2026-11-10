'use strict';
const { API_BASE, sampleCertificate, certificateOutputFields } = require('../lib');

module.exports = {
  key: 'new_certificate',
  noun: 'Certificate',
  display: {
    label: 'New Certificate',
    description: 'Triggers when a certificate is issued from your account, in the app or through the API.',
  },
  operation: {
    // Newest first; each certificate has a stable id, which Zapier deduplicates on.
    perform: async (z) => {
      const response = await z.request({ url: `${API_BASE}/v1/certificates`, params: { limit: 100 } });
      return response.data.certificates;
    },
    sample: sampleCertificate,
    outputFields: certificateOutputFields,
  },
};
