import { describe, expect, it } from 'vitest';
import { removeUnknownPlaceholders, stripUnknownPlaceholders } from '../../../supabase/functions/_shared/diplomaPlaceholders';
import { renderDSL, type DiplomaDSL } from '../../../supabase/functions/_shared/diplomaRenderer';

describe('stripUnknownPlaceholders', () => {
  it('keeps {{recipient_name}} and removes invented placeholders', () => {
    expect(stripUnknownPlaceholders('{{recipient_name}}')).toBe('{{recipient_name}}');
    expect(stripUnknownPlaceholders('{{ recipient_name }}')).toBe('{{recipient_name}}');
    expect(stripUnknownPlaceholders('{{completion_date}}')).toBe('');
    expect(stripUnknownPlaceholders('Awarded on {{date}}, in Oslo.')).toBe('Awarded on, in Oslo.');
    expect(stripUnknownPlaceholders('Plain text')).toBe('Plain text');
  });
});

describe('removeUnknownPlaceholders', () => {
  const dsl = (): DiplomaDSL => ({
    palette: 'parchment-burgundy',
    header: { style: 'minimal', institutionName: 'Nordic Bread Academy', subtitle: '{{department}}' },
    body: {
      title: 'Certificate of Completion',
      recipientName: '{{recipient_name}}',
      description: 'For completing {{course_name}} with distinction.',
      date: '{{completion_date}}',
      additionalFields: [{ label: 'Grade', value: '{{grade}}' }, { label: 'Hours', value: '40' }],
    },
    signature: { style: 'formal', name: 'Ingrid Bergström' },
  });

  it('cleans every text field and reports what it removed', () => {
    const d = dsl();
    const removed = removeUnknownPlaceholders(d);
    expect(removed.sort()).toEqual(['{{completion_date}}', '{{course_name}}', '{{department}}', '{{grade}}']);
    expect(d.body?.recipientName).toBe('{{recipient_name}}');
    expect(d.body?.date).toBe('');
    expect(d.header?.subtitle).toBe('');
    expect(d.body?.description).toBe('For completing with distinction.');
    expect(d.body?.additionalFields).toEqual([{ label: 'Hours', value: '40' }]);
  });

  it('leaves no stray placeholder in the rendered diploma (the live case)', () => {
    const d = dsl();
    removeUnknownPlaceholders(d);
    const { html } = renderDSL(d);
    expect(html.match(/\{\{[^}]*\}\}/g)).toEqual(['{{recipient_name}}']);
    expect(html).not.toContain('diploma-date');
  });

  it('changes nothing when the model wrote final text', () => {
    const d = dsl();
    d.header!.subtitle = 'Est. 1902';
    d.body!.description = 'For completing the course.';
    d.body!.date = 'November 8, 2026';
    d.body!.additionalFields = [];
    const before = JSON.stringify(d);
    expect(removeUnknownPlaceholders(d)).toEqual([]);
    expect(JSON.stringify(d)).toBe(before);
  });
});
