// Minimal ambient declarations so `tsc -p tsconfig.functions.json` (Node-based)
// can typecheck the Deno edge functions. Only what the functions actually use —
// the real types come from the Deno runtime at deploy time.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

// The @lovable.dev/mcp-js bundler emits `process.env` lookups in the generated
// `mcp` edge function. Deno's Node-compat runtime provides the global; for
// typechecking it needs a declaration. `types: []` in tsconfig.functions.json
// keeps @types/node out, so this cannot collide with it.
declare const process: {
  env: Record<string, string | undefined>;
};

// Deno resolves remote and npm: imports at runtime; for typechecking they are opaque.
declare module 'https://*';
declare module 'npm:*';
