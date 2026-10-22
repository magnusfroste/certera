import { describe, it, expect } from 'vitest';
import { personalizeHtml, previewHtml, hasRecipientPlaceholder } from '@/lib/recipient';
import { DIPLOMA_RECIPES } from '@/constants/diplomaRecipes';
import { renderDSL } from '@/diploma-dsl/render';

describe('recipient placeholder', () => {
  it('survives template rendering', () => {
    const recipe = DIPLOMA_RECIPES[0];
    const dsl = { ...recipe.dsl, body: { ...recipe.dsl.body, recipientName: '{{recipient_name}}' } };
    const { html } = renderDSL(dsl as typeof recipe.dsl);
    expect(hasRecipientPlaceholder(html)).toBe(true);
  });

  it('is replaced with the escaped recipient name when signing', () => {
    const html = '<h2 class="name">{{recipient_name}}</h2>';
    expect(personalizeHtml(html, ' Berit <Bagage> ')).toBe('<h2 class="name">Berit &lt;Bagage&gt;</h2>');
  });

  it('shows a neutral label in previews', () => {
    expect(previewHtml('<p>{{recipient_name}}</p>')).toBe('<p>Recipient Name</p>');
    expect(previewHtml('<p>{{ recipient_name }}</p>', 'Anna')).toBe('<p>Anna</p>');
  });
});
