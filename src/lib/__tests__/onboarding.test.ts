import { describe, it, expect } from 'vitest';
import { DIPLOMA_RECIPES } from '@/constants/diplomaRecipes';
import { organizationRecipe, onboardingStep } from '@/lib/onboarding';

describe('first certificate onboarding', () => {
  it('requires organization setup before choosing a template', () => {
    expect(onboardingStep('', false)).toBe(1);
    expect(onboardingStep('Example Academy', false)).toBe(2);
    expect(onboardingStep('Example Academy', true)).toBe(3);
  });
  it('uses the organization on the selected template without changing the curated recipe', () => {
    const source = DIPLOMA_RECIPES[0];
    const original = source.dsl.header.institutionName;
    const result = organizationRecipe(source, ' Example Academy ');
    expect(result.dsl.header.institutionName).toBe('Example Academy');
    expect(result.dsl.header.subtitle).toBe('');
    expect(source.dsl.header.institutionName).toBe(original);
    expect(result.dsl.body).toEqual(source.dsl.body);
  });
});