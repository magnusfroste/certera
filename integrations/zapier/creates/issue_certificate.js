'use strict';
const { API_BASE, sampleCertificate, certificateOutputFields } = require('../lib');

module.exports = {
  key: 'issue_certificate',
  noun: 'Certificate',
  display: {
    label: 'Issue Certificate',
    description: 'Issues a signed certificate from one of your designs and returns its public link.',
  },
  operation: {
    inputFields: [
      {
        key: 'template_id',
        label: 'Design',
        type: 'string',
        required: true,
        dynamic: 'template.id.title',
        helpText: 'The certificate design to issue from. Create and save designs at [certera.ink](https://www.certera.ink/app).',
      },
      {
        key: 'recipient_name',
        label: 'Recipient Name',
        type: 'string',
        required: true,
        helpText: 'The full name printed on the certificate (up to 120 characters).',
      },
      {
        key: 'institution_name',
        label: 'Issuer Name',
        type: 'string',
        required: false,
        helpText: 'Leave empty to use the name in the design.',
      },
      {
        key: 'reference',
        label: 'Unique Reference',
        type: 'string',
        required: false,
        helpText: 'For example an enrollment or order id. The same reference never issues a second certificate, so a replayed Zap is safe.',
      },
    ],
    perform: async (z, bundle) => {
      const { template_id, recipient_name, institution_name, reference } = bundle.inputData;
      const body = { template_id, recipient_name };
      if (institution_name) body.institution_name = institution_name;
      const headers = { 'Content-Type': 'application/json' };
      if (reference) headers['Idempotency-Key'] = `zapier:${String(reference).trim()}`.slice(0, 200);
      const response = await z.request({ url: `${API_BASE}/v1/certificates`, method: 'POST', headers, body });
      return response.data;
    },
    sample: sampleCertificate,
    outputFields: certificateOutputFields,
  },
};
