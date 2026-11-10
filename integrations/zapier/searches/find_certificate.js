'use strict';
const { API_BASE, sampleCertificate, certificateOutputFields } = require('../lib');

module.exports = {
  key: 'find_certificate',
  noun: 'Certificate',
  display: {
    label: 'Find Certificate',
    description: 'Finds one of your certificates by its ID.',
  },
  operation: {
    inputFields: [
      { key: 'id', label: 'Certificate ID', type: 'string', required: true, helpText: 'Looks like `DIP_mw9sbl2i_yd55z43cx`.' },
    ],
    perform: async (z, bundle) => {
      const response = await z.request({
        url: `${API_BASE}/v1/certificates/${encodeURIComponent(String(bundle.inputData.id).trim())}`,
        skipThrowForStatus: true,
      });
      return response.status === 404 ? [] : [response.data];
    },
    sample: sampleCertificate,
    outputFields: certificateOutputFields,
  },
};
