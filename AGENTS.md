# Architecture rules

- Client and generation functions use the shared DSL renderer and its pure contrast helper; foreground correction must not mutate curated backgrounds.
- Signed UI status and sharing URLs come from `useSignedDiploma`, matching the current personalized content hash, so edits cannot retain a stale signed status.
- Reuse SharePanel for post-sign actions and the Share tab to keep export and sharing behaviour consistent.