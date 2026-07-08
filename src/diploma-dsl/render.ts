// Client entry point to the SINGLE shared DSL renderer that the
// generate-diploma edge function also uses. Importing the same module here
// guarantees a template preview/pick renders identically to what the server
// produces on a later AI edit — no font or style shift between them.
export {
  renderDSL,
  esc,
  PALETTE_IDS,
  TYPOGRAPHY_IDS,
  type DiplomaDSL,
} from '../../supabase/functions/_shared/diplomaRenderer.ts';
