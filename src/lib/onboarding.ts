import type { DiplomaRecipe } from '@/constants/diplomaRecipes';

/** Organization setup is a browser-local issuing default, not a verified issuer identity. */
export function organizationRecipe(recipe: DiplomaRecipe, organization: string): DiplomaRecipe {
  return {
    ...recipe,
    dsl: {
      ...recipe.dsl,
      header: { ...recipe.dsl.header, institutionName: organization.trim(), subtitle: '' },
    },
  };
}

export function onboardingStep(organization: string, hasDesign: boolean): number {
  return hasDesign ? 3 : organization.trim() ? 2 : 1;
}