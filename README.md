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

## 开发环境要求 / Development Requirements

> 🌐 **PROXY REQUIRED**: 本项目对接 GitHub / Supabase cloud，从中国大陆开发机默认会被 GFW 拦截。安装 Clash Verge 或其他 mihomo 类代理软件后设置：

```bash
# 仓储级别（推荐，不泄露到其他项目）
git config --local http.proxy  http://127.0.0.1:7897
git config --local https.proxy http://127.0.0.1:7897

# 验证代理可用（预期 HTTP 200 in 0.2..3.0s）
curl -x http://127.0.0.1:7897 -s -o /dev/null \
     -w 'github via proxy: HTTP %{http_code} | time %{time_total}s\n' \
     --max-time 15 https://github.com
```

不配置代理的症状：git push 三次重试 `Connection was reset` 或 `Failed to connect to github.com port 443`。

完整故障排查 + 与现有决策（D-03/D-15）的一致性 + 变更历史见 [Nook-GIT-WORKFLOW § 十三](docs/03_Engineering/Nook-GIT-WORKFLOW.md)。

## Project Memory

- [AI Handover](docs/03_Engineering/AI_HANDOVER.md) · [Dev Log](docs/03_Engineering/DEVELOPMENT_LOG.md)
- [TODO](docs/03_Engineering/TODO.md) · [CHANGELOG](docs/03_Engineering/CHANGELOG.md)
- [Known Issues](docs/03_Engineering/KNOWN_ISSUES.md) · [Decisions](docs/03_Engineering/DECISIONS.md)
- [Roadmap](docs/03_Engineering/ROADMAP.md) · [ADRs](docs/02_Architecture/adr/)

## License

Private. Not for redistribution.
