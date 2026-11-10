import { describe, expect, it } from 'vitest';
import { certificationName, linkedInAddToProfileUrl } from '../linkedin';
import { renderDSL, type DiplomaDSL } from '../../../supabase/functions/_shared/diplomaRenderer';

const dsl = (body: DiplomaDSL['body']): DiplomaDSL => ({ palette: 'ivory-navy', header: { style: 'minimal', institutionName: 'Nordlys' }, body });

describe('certificationName', () => {
  it('uses the course or programme when the design has one', () => {
    const { html } = renderDSL(dsl({ title: 'Certificate of Completion', recipientName: 'Ada', courseOrProgram: 'Full-Stack Development & Ops' }));
    expect(certificationName(html, 'Certera')).toBe('Full-Stack Development & Ops');
  });

  it('uses a specific title, in normal case', () => {
    const { html } = renderDSL(dsl({ title: 'LEADERSHIP ESSENTIALS', recipientName: 'Ada' }));
    expect(certificationName(html, 'Nordlys Consulting AB')).toBe('Leadership Essentials');
  });

  it('adds the institution when the title is only boilerplate', () => {
    const { html } = renderDSL(dsl({ title: 'Certificate of Completion', recipientName: 'Ada' }));
    expect(certificationName(html, 'Nordlys Consulting AB')).toBe('Certificate of Completion — Nordlys Consulting AB');
    expect(certificationName('<div>DIPLOM</div>', 'Hemfrid')).toBe('Certificate — Hemfrid');
  });

  it('reads text only: tags and entities never leak into the name', () => {
    expect(certificationName('<div class="diploma-course"><b>R&amp;D</b> &lt;Lab&gt;</div>', 'X')).toBe('R&D <Lab>');
  });
});

describe('linkedInAddToProfileUrl', () => {
  it("builds LinkedIn's add-to-profile link with every field encoded", () => {
    const url = new URL(linkedInAddToProfileUrl({
      name: 'R&D Leadership', organizationName: 'Nordlys Consulting AB', issuedAt: '2026-11-09T21:40:16Z',
      certUrl: 'https://www.certera.ink/diploma/DIP_x', certId: 'DIP_x',
    }));
    expect(url.origin + url.pathname).toBe('https://www.linkedin.com/profile/add');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      startTask: 'CERTIFICATION_NAME', name: 'R&D Leadership', organizationName: 'Nordlys Consulting AB',
      certUrl: 'https://www.certera.ink/diploma/DIP_x', certId: 'DIP_x', issueYear: '2026', issueMonth: '11',
    });
  });

  it('leaves the date out when it is unusable', () => {
    const url = new URL(linkedInAddToProfileUrl({ name: 'A', organizationName: 'B', issuedAt: 'nope', certUrl: 'https://x', certId: 'y' }));
    expect(url.searchParams.has('issueYear')).toBe(false);
  });
});
