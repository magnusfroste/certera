# Architecture rules

- Client and generation functions use the shared DSL renderer and its pure contrast helper; foreground correction must not mutate curated backgrounds.
- The legacy client renderer also uses the pure contrast helper so older entry points cannot bypass the same text safety.
- Signed UI status and sharing URLs come from `useSignedDiploma`, matching the current personalized content hash, so edits cannot retain a stale signed status.
- Reuse SharePanel for post-sign actions and the Share tab to keep export and sharing behaviour consistent.
- On narrow screens the studio switches between Chat and Diploma views instead of squeezing a horizontal split; both views keep the same design state.