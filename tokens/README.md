# Nook Design Tokens

This directory contains the single source of truth for Nook's design tokens.

- `index.ts` — TypeScript tokens (imported by Tailwind config and components)
- See `docs/04_Runtime/` for CSS variables and JSON variants

**Rules:**
- Business code MUST NOT hardcode hex/px/color values
- Always import from `tokens/index.ts` or use CSS variables from `:root`
