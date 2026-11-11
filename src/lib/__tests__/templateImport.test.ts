import { describe, expect, it } from 'vitest';
import { validateTemplateImport, MAX_TEMPLATE_BYTES } from '../../../supabase/functions/_shared/templateImport';

const html = '<div class="cert"><h1>Certificate</h1><p>{{recipient_name}}</p><img src="https://example.com/logo.png" alt=""></div>';
const ok = (extra: Record<string, unknown> = {}) => validateTemplateImport({ title: 'Course certificate', html, css: '.cert{padding:40px}', ...extra });
const code = (r: ReturnType<typeof validateTemplateImport>) => (r.ok === false ? r.code : 'ok');

describe('importing a design as a template', () => {
  it('accepts plain HTML and CSS and defaults to landscape', () => {
    const r = ok();
    expect(r.ok === true && r.value).toMatchObject({ title: 'Course certificate', format: 'landscape', institutionName: null });
  });

  it('takes an issuer name and a format', () => {
    const r = ok({ institution_name: ' Nordlys Academy ', format: 'portrait' });
    expect(r.ok === true && r.value).toMatchObject({ institutionName: 'Nordlys Academy', format: 'portrait' });
    expect(code(ok({ institution_name: '' }))).toBe('ok');
    expect(code(ok({ format: 'square' }))).toBe('invalid_format');
    expect(code(ok({ institution_name: 'x'.repeat(121) }))).toBe('invalid_institution');
  });

  it('requires html and a title', () => {
    expect(code(validateTemplateImport({ title: 'x' }))).toBe('invalid_html');
    expect(code(validateTemplateImport({ html }))).toBe('invalid_title');
    expect(code(validateTemplateImport(null))).toBe('invalid_html');
  });

  it('refuses anything that runs or loads a page', () => {
    for (const hostile of [
      '<div><script>alert(1)</script></div>',
      '<div><img src="x" onerror="alert(1)"></div>',
      '<div onclick = "x()">a</div>',
      '<a href="javascript:alert(1)">x</a>',
      '<iframe src="https://example.com"></iframe>',
      '<form action="https://example.com"><input name="p"></form>',
      '<meta http-equiv="refresh" content="0;url=https://example.com">',
      '<SCRIPT src=//x></SCRIPT>',
    ]) {
      expect(code(ok({ html: hostile })), hostile).toBe('active_content');
    }
    expect(code(ok({ css: 'a{}</style><script>x</script>' }))).toBe('invalid_css');
    expect(code(ok({ css: 'a{background:url(javascript:alert(1))}' }))).toBe('active_content');
  });

  it('does not mistake ordinary words for handlers', () => {
    expect(code(ok({ html: '<p>Awarded on completion = success, online course</p>' }))).toBe('ok');
    expect(code(ok({ html: '<p style="font-size:12px">Based on merit</p>' }))).toBe('ok');
  });

  it('limits size', () => {
    expect(code(ok({ html: `<p>${'a'.repeat(MAX_TEMPLATE_BYTES)}</p>` }))).toBe('html_too_large');
    expect(code(ok({ css: 'a'.repeat(MAX_TEMPLATE_BYTES + 1) }))).toBe('css_too_large');
  });
});
