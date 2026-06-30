# Nook v1.0

> 「深夜书房」— 屏蔽互联网社交噪音的私人聊天网站。

## Quick Links

- [Spec](docs/01_Product/Nook-SPEC.md) · [Architecture](docs/02_Architecture/Nook-ARCH-DESIGN-v1.0.md)
- [API Contract](docs/02_Architecture/Nook-API-DESIGN-v1.0.md) · [Project Structure](docs/03_Engineering/Nook-PROJECT-STRUCTURE.md)
- [Coding Standards](docs/03_Engineering/Nook-CODING-STANDARDS.md) · [Work Breakdown](docs/03_Engineering/Nook-WORK-BREAKDOWN.md)

## Quick Start

```bash
# Copy environment template and fill in your Supabase credentials
cp .env.example .env

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

See [`.env.example`](.env.example) for all required environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, etc.).

## Project Memory

- [AI Handover](docs/03_Engineering/AI_HANDOVER.md) · [Dev Log](docs/03_Engineering/DEVELOPMENT_LOG.md)
- [TODO](docs/03_Engineering/TODO.md) · [CHANGELOG](docs/03_Engineering/CHANGELOG.md)
- [Known Issues](docs/03_Engineering/KNOWN_ISSUES.md) · [Decisions](docs/03_Engineering/DECISIONS.md)
- [Roadmap](docs/03_Engineering/ROADMAP.md) · [ADRs](docs/02_Architecture/adr/)

## License

Private. Not for redistribution.
