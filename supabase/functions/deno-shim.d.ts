// Minimal ambient declarations so `tsc -p tsconfig.functions.json` (Node-based)
// can typecheck the Deno edge functions. Only what the functions actually use —
// the real types come from the Deno runtime at deploy time.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

// Deno resolves remote and npm: imports at runtime; for typechecking they are opaque.
declare module 'https://*';
declare module 'npm:*';
