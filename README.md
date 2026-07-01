# Nook v1.0

> 「深夜书房」— 屏蔽互联网社交噪音的私人聊天网站。

## Quick Links

- [Spec](docs/01_Product/Nook-SPEC.md) · [Architecture](docs/02_Architecture/Nook-ARCH-DESIGN-v1.0.md)
- [API Contract](docs/02_Architecture/Nook-API-DESIGN-v1.0.md) · [Project Structure](docs/03_Engineering/Nook-PROJECT-STRUCTURE.md)
- [Coding Standards](docs/03_Engineering/Nook-CODING-STANDARDS.md) · [Work Breakdown](docs/03_Engineering/Nook-WORK-BREAKDOWN.md)
- [Development Requirements](#dev-requirements) · [Project Memory](#project-memory)

<a id="dev-requirements"></a>

## 开发环境要求 / Development Requirements

> Only applies to developers whose network is blocked by the GFW.

If your dev machine is in mainland China, GitHub HTTPS is reset by
the GFW. Symptom: `git push` returns `Connection was reset` or
`Failed to connect to github.com port 443`. In that case, route
git through a local HTTP/HTTPS proxy -- most commonly Clash Verge /
mihomo, default port **7897**.

```bash
# Repo-level only -- does not affect other repos
git config --local http.proxy  http://127.0.0.1:7897
git config --local https.proxy http://127.0.0.1:7897

# Verify (expected: HTTP 200 in 0.2..3.0s)
curl -x http://127.0.0.1:7897 -s -o /dev/null \
     -w 'github via proxy: HTTP %{http_code} | time %{time_total}s\n' \
     --max-time 15 https://github.com
```

Skip this entire section if you are not behind the GFW. Full
troubleshooting + decision-rationale (D-03 / D-15) + change history:
see [Nook-GIT-WORKFLOW section 13 -- Proxy Setup](docs/03_Engineering/Nook-GIT-WORKFLOW.md#proxy-setup).

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

<a id="project-memory"></a>
## Project Memory

- [AI Handover](docs/03_Engineering/AI_HANDOVER.md) · [Dev Log](docs/03_Engineering/DEVELOPMENT_LOG.md)
- [TODO](docs/03_Engineering/TODO.md) · [CHANGELOG](docs/03_Engineering/CHANGELOG.md)
- [Known Issues](docs/03_Engineering/KNOWN_ISSUES.md) · [Decisions](docs/03_Engineering/DECISIONS.md)
- [Roadmap](docs/03_Engineering/ROADMAP.md) · [ADRs](docs/02_Architecture/adr/)

## License

Private. Not for redistribution.
