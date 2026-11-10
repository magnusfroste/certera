'use strict';
const authentication = require('./authentication');
const { addApiKey, explainErrors } = require('./middleware');
const template = require('./triggers/template');
const newCertificate = require('./triggers/new_certificate');
const issueCertificate = require('./creates/issue_certificate');
const findCertificate = require('./searches/find_certificate');

module.exports = {
  version: require('./package.json').version,
  platformVersion: require('zapier-platform-core').version,
  authentication,
  beforeRequest: [addApiKey],
  afterResponse: [explainErrors],
  triggers: { [template.key]: template, [newCertificate.key]: newCertificate },
  creates: { [issueCertificate.key]: issueCertificate },
  searches: { [findCertificate.key]: findCertificate },
};
