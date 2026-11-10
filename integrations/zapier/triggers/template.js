'use strict';
const { API_BASE } = require('../lib');

// Hidden: only feeds the Design dropdown of "Issue Certificate".
module.exports = {
  key: 'template',
  noun: 'Design',
  display: {
    label: 'List Designs',
    description: 'Lists the designs saved in your certera account.',
    hidden: true,
  },
  operation: {
    perform: async (z) => {
      const response = await z.request({ url: `${API_BASE}/v1/templates` });
      return response.data.templates.map((t) => ({ ...t, title: t.title || 'Untitled design' }));
    },
    sample: {
      id: '6f0c1a52-6f8e-4c57-9a61-3f1f0a2b9c11',
      title: 'Course certificate',
      institution_name: 'Nordlys Academy',
      has_recipient_placeholder: true,
      updated_at: '2026-11-10T09:00:00.000Z',
    },
  },
};
