// Diplomas are designed with a {{recipient_name}} placeholder. The real name is
// inserted when signing (single or bulk), so the signed and hashed diploma
// carries the recipient's name — not the issuer's.
const PLACEHOLDER = /\{\{\s*recipient_name\s*\}\}/gi;

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const hasRecipientPlaceholder = (html: string) => new RegExp(PLACEHOLDER.source, 'i').test(html);

export const personalizeHtml = (html: string, name: string) => html.replace(PLACEHOLDER, escapeHtml(name.trim()));

/** For on-screen previews and exports of an unsigned design. */
export const previewHtml = (html: string, name?: string) =>
  personalizeHtml(html, name?.trim() || 'Recipient Name');
