import { describe, expect, it } from 'vitest';
import { renderDSL } from '@/diploma-dsl/render';
import { renderDiplomaDSL } from '@/diploma-dsl/renderer';
import { BG_STYLES } from '../../../supabase/functions/_shared/diplomaRenderer';
import { backgroundSamples, contrastRatio, ensureTextContrast } from '../../../supabase/functions/_shared/diplomaContrast';
import type { DiplomaDSL } from '@/diploma-dsl/types';

describe('Diploma foreground AA contrast', () => {
  it('requires 4.5:1 for title and body across every curated gradient', () => {
    for (const background of Object.values(BG_STYLES)) {
      const samples = backgroundSamples(background);
      for (const color of ['#0c2340', '#16213e', '#999', '#888', '#aaa', '#eee', '#ffffff']) {
        const resolved = ensureTextContrast(color, samples);
        for (const sample of samples) expect(contrastRatio(resolved, sample)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
  it('corrects a dark-blue completion heading without changing its dark background', () => {
    const result = renderDSL({ palette: 'cosmic-cyan', brand: { primaryColor: '#16213e' }, background: { style: 'cosmic-dark' }, body: { title: 'CERTIFICATE OF COMPLETION' } });
    const color = result.css.match(/\.diploma-container \.diploma-body \.diploma-title[^{}]+\{color:([^;]+)/)?.[1];
    expect(color).toBeDefined();
    for (const bg of backgroundSamples(BG_STYLES['cosmic-dark'])) expect(contrastRatio(color || '#16213e', bg)).toBeGreaterThanOrEqual(4.5);
    expect(result.css.includes(BG_STYLES['cosmic-dark'])).toBe(true);
  });
  it('protects body foregrounds from model colour, opacity and background overrides', () => {
    const result = renderDSL({ background: { style: 'cosmic-dark' }, customCss: '.diploma-description{color:#16213e !important;opacity:0.1;background:#ffffff}', body: { description: 'Course completion' } });
    const color = result.css.match(/\.diploma-description\{[^}]*color:([^;]+)/)?.[1];
    expect(color).toBeDefined();
    for (const bg of backgroundSamples(BG_STYLES['cosmic-dark'])) expect(contrastRatio(color || '#16213e', bg)).toBeGreaterThanOrEqual(4.5);
    expect(result.css.includes('opacity:0.1')).toBe(false);
    expect(result.css.includes('background:#ffffff')).toBe(false);
  });
  it('also safeguards the legacy client renderer', () => {
    const design: DiplomaDSL = {
      brand: { name: 'Example Academy', primaryColor: '#16213e', accentColor: '#c6a961' },
      background: { style: 'cosmic-dark' }, layout: { orientation: 'landscape', padding: 'normal' },
      border: { style: 'modern' }, header: { style: 'minimal', institutionName: 'Example Academy' },
      body: { title: 'Certificate of Completion', recipientName: '{{recipient_name}}', description: 'Completed the course' },
      signature: { style: 'formal', name: 'Director' },
    };
    const result = renderDiplomaDSL(design);
    const color = result.css.match(/\.diploma-container \.diploma-body \.diploma-title[^{}]+\{color:([^;]+)/)?.[1];
    expect(color).toBeDefined();
    for (const bg of backgroundSamples(BG_STYLES['cosmic-dark'])) expect(contrastRatio(color || '#16213e', bg)).toBeGreaterThanOrEqual(4.5);
  });
});