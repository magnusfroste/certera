'use strict';

// Overridable so the tests can run against a local stub.
const API_BASE = (process.env.CERTERA_API_BASE || 'https://api.certera.ink').replace(/\/+$/, '');

const sampleCertificate = {
  id: 'DIP_mw9sbl2i_yd55z43cx',
  url: 'https://www.certera.ink/diploma/DIP_mw9sbl2i_yd55z43cx',
  verify_url: 'https://www.certera.ink/verify/DIP_mw9sbl2i_yd55z43cx',
  recipient_name: 'Elin Andersson',
  institution_name: 'Nordlys Academy',
  issuer_domain: 'nordlys.se',
  verified_issuer: true,
  hedera: {
    topic_id: '0.0.123456',
    sequence_number: '1',
    transaction_id: '0.0.1234@1731230000.000000000',
    explorer_url: 'https://hashscan.io/testnet/transaction/0.0.1234@1731230000.000000000',
  },
  created_at: '2026-11-10T09:00:00.000Z',
};

const certificateOutputFields = [
  { key: 'id', label: 'Certificate ID' },
  { key: 'url', label: 'Certificate Link' },
  { key: 'verify_url', label: 'Verification Link' },
  { key: 'recipient_name', label: 'Recipient Name' },
  { key: 'institution_name', label: 'Issuer Name' },
  { key: 'issuer_domain', label: 'Verified Issuer Domain' },
  { key: 'verified_issuer', label: 'Verified Issuer', type: 'boolean' },
  { key: 'hedera__topic_id', label: 'Hedera Topic ID' },
  { key: 'hedera__sequence_number', label: 'Hedera Sequence Number' },
  { key: 'hedera__transaction_id', label: 'Hedera Transaction ID' },
  { key: 'hedera__explorer_url', label: 'Hedera Explorer Link' },
  { key: 'created_at', label: 'Issued At', type: 'datetime' },
];

module.exports = { API_BASE, sampleCertificate, certificateOutputFields };
