# Nook · Project Bootstrap Plan v1.0 (Stage 16)

> **Stage 16 · PROJECT BOOTSTRAP PLAN — Frozen for Nook v1.0**
> 文档生成日：2026-06-27 · 关联：`../01_Product/Nook-SPEC.md v1.0.1`（SoT）· `../02_Architecture/Nook-ARCH-DESIGN-v1.0.md`（架构）· `Nook-PROJECT-STRUCTURE.md v1.0`（目录结构）· `Nook-CODING-STANDARDS.md v1.0`（编码规范）· `Nook-GIT-WORKFLOW.md v1.0`（Git 工作流）· `Nook-WORK-BREAKDOWN.md v1.0`（WBS）· `DECISIONS.md`（ADR）
> 性质：**唯一可信的项目初始化执行计划**。后续 Project Initialization Execution 阶段严格遵循本计划。
> 本文档**仅制定计划**——未执行任何初始化操作。

---

## 0. 元规则

### 0.1 文档层级

| 层 | 文档 | 与本文关系 |
|---|---|---|
| **产品需求** | `../01_Product/Nook-SPEC.md` v1.0.1 | 定义「做什么」|
| **架构** | `../02_Architecture/Nook-ARCH-DESIGN-v1.0.md` | 定义「如何搭」|
| **目录结构** | `Nook-PROJECT-STRUCTURE.md` v1.0 | 定义「放哪里」|
| **编码规范** | `Nook-CODING-STANDARDS.md` v1.0 | 定义「怎么写」|
| **Git Workflow** | `Nook-GIT-WORKFLOW.md` v1.0 | 定义「如何提交」|
| **任务拆分** | `Nook-WORK-BREAKDOWN.md` v1.0 | 定义「先做啥后做啥」|
| **Bootstrap Plan** | **本文** | 定义「**如何一次性初始化项目**」|

### 0.2 适用范围

本计划覆盖 **M1 Foundation**（T-M1-01 ~ T-M1-06 全部 6 个 Task）的初始化执行。
- ✅ 项目创建（Vite 脚手架）
- ✅ 依赖安装（M1 必需）
- ✅ 配置文件创建（11 必需 + 4 推荐）
- ✅ 目录创建（M1 需要的子集）
- ✅ 环境准备（Node 版本 · 包管理器 · .env）
- ✅ 文档初始化
- ✅ Git 初始化（首次 commit）
- ✅ Bootstrap 验证

### 0.3 约束（来自 task 文档）

| 步骤 | 是否允许 |
|---|---|
| ❌ 创建实际项目 | **禁止**（本文仅计划） |
| ❌ 安装依赖 | **禁止** |
| ❌ 创建目录 | **禁止** |
| ❌ 初始化 Git | **禁止** |
| ❌ 编写配置文件 | **禁止** |
| ✅ 输出 Bootstrap Plan | **允许** |
| ✅ 更新项目记忆 | **允许** |

**当前是 Stage 16「规划」阶段**。真正的执行属于下一阶段（Project Initialization Execution）。

### 0.4 变更日志

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-27 | v1.0 | 初版。基于 Nook 全部 15 个已冻结阶段 + 22 项 ADR 生成 |

---

## 一、Bootstrap Overview（初始化总览）

### 1.1 完整流程（10 步）



```
┌─────────────────────────────────────────────────────────┐
│                   Nook Bootstrap · 10 Steps              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Step 1 — Platform Pre-requisite (外部)                  │
│     ↓ 创建 GitHub repo · 创建 Supabase project          │
│     ↓ 等待 Project Lead 完成                             │
│                                                          │
│  Step 2 — Local Project Creation                          │
│     ↓ `npm create vite@latest` + React 18 + TS          │
│     ↓ directory: `nook/` (or owner-specified name)      │
│                                                          │
│  Step 3 — Initial Commit Setup                            │
│     ↓ `git init` + 首次 commit (scaffold baseline)        │
│                                                          │
│  Step 4 — Configuration Files (11 必需 + 4 推荐)         │
│     ↓ tsconfig.json + tsconfig.node.json                 │
│     ↓ .eslintrc.cjs + .prettierrc                        │
│     ↓ vite.config.ts + tailwind.config.ts                │
│     ↓ package.json + .gitignore + .env.example           │
│     ↓ wrangler.toml + supabase/config.toml               │
│     ↓ .editorconfig + .vscode/settings.json              │
│                                                          │
│  Step 5 — Dependency Installation (4 组)                  │
│     ↓ runtime · dev · test · supabase CLI               │
│                                                          │
│  Step 6 — Directory Initialization (M1 子集)              │
│     ↓ src/main.tsx + src/App.tsx                         │
│     ↓ src/styles/ + src/lib/ + src/components/           │
│     ↓ public/fonts/ + public/icons/                      │
│     ↓ supabase/migrations/ + functions/                  │
│                                                          │
│  Step 7 — Token + Theme Injection                        │
│     ↓ tailwind.config.ts ← tokens/index.ts               │
│     ↓ Vite alias `@/` → `src/`                           │
│                                                          │
│  Step 8 — 4 Atomic Components Stubs                       │
│     ↓ Button + Input + Avatar + Bubble                   │
│     ↓ 与 components/*.spec.md 对齐                       │
│                                                          │
│  Step 9 — i18n + Routes + Guards                          │
│     ↓ locales/{zh-CN,en}/translation.json                │
│     ↓ 13 路由占位 + RequireAuth + RequireOwner           │
│                                                          │
│  Step 10 — CI + Dark + Fonts + Verification              │
│     ↓ .github/workflows/ci.yml                            │
│     ↓ `:root { color-scheme: dark }`                    │
│     ↓ public/fonts/*.woff2 (Inter + JetBrains Mono)      │
│     ↓ Build + typecheck + lint + test 全绿                │
│     ↓ 首次主 commit: M1 Foundation 完成                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```



### 1.2 阶段时长估算

| Step | 内容 | 预估时长 |
|---|---|---|
| 1 | Platform pre-requisite | 由 Project Lead 完成（4-6h）|
| 2 | Vite 脚手架 | 10 min |
| 3 | Initial commit | 5 min |
| 4 | Configuration files | 30 min |
| 5 | Dependency install | 10 min |
| 6 | Directory setup | 15 min |
| 7 | Token injection | 10 min |
| 8 | 4 atomic components | 60 min |
| 9 | i18n + routes | 45 min |
| 10 | CI + dark + fonts + verify | 30 min |
| **总 AI 编程时间** | | **~4 hours** |
| 用户等待时间 | | **~10 min（含 install）** |

### 1.3 顺序硬约束



```
Step 1 ──→ Step 2 ──→ Step 3 ──→ Step 4 ──→ Step 5 ──→ Step 10
                                                             │
                            Step 6/7/8/9 ───────────────────┘
                            (并行但单调依赖 Step 5 后)
```



---

## 二、Project Creation（项目创建）

### 2.1 项目命名

| 项 | 决定 | 依据 |
|---|---|---|
| **目录名** | `nook/` | 与产品名同名（SPEC § 1.1）|
| **package name** | `nook` | 与目录名一致 |
| **GitHub repo name** | `nook`（或 `nook-private`）| Project Lead 决定 |
| **Custom domain** | TBD（`nook.app` / `<owner>.nook.app`）| INTERVIEW Round-3 未决，Stage 17 由 Project Lead 提供 |

### 2.2 框架选型

| 决策 | 选型 | 依据 |
|---|---|---|
| **前端框架** | React 18.3.x | ADR-009 / Coding Standards § 5 |
| **构建工具** | Vite 5.x | ADR-009 / ADR-016 |
| **语言** | TypeScript 5.x strict | ADR-009 |
| **样式** | Tailwind v3.x | ARCH-DESIGN § 2.2 |
| **路由** | React Router v6.latest | ARCH-DESIGN § 2.2 |
| **状态管理** | Zustand + TanStack Query | ADR-013 |
| **PWA** | Vite PWA plugin + Workbox | ADR-009 |
| **部署** | Cloudflare Pages | ADR-015 |

### 2.3 初始化参数

| 参数 | 值 |
|---|---|
| **Template** | `react-ts`（React 18 + TypeScript）|
| **Target dir** | `nook/` (cwd 直接创建) |
| **Skip install** | false（Step 5 时统一安装） |
| **Skip git init** | true（Step 3 手工 init 以控制 commit 内容） |
| **Use rolldown** | false（默认 rollup，project Lead 切换） |

> **为什么 skip git init**：因为 Vite 默认 init git 后会自动 commit blank scaffold；我们希望首次 commit 包含全部 11 配置文件 + tokens + CI，符合 M1 Foundation DoD（一次性完成启动而非分块）。

### 2.4 平台预创建（由 Project Lead 完成 · Step 1）

| Action | Where | Outcome |
|---|---|---|
| 创建 GitHub repo | `github.com/<owner>/nook` | Empty repo URL |
| 创建 Supabase project | `supabase.com/dashboard` | Project URL + ANON_KEY + SERVICE_ROLE_KEY |
| 复制 `.env.example` 值 | — | 真实 env 值 |

> **AI 等待**：Step 1 必须由 Project Lead 完成，AI 不能绕过。如果缺失 → 立即停止，等待。

---

## 三、Dependency Planning（依赖规划）

### 3.1 Required · 运行时依赖（11 项）

| Package | Version Pin | Purpose | Install Stage |
|---|---|---|---|
| `react` | `^18.3.0` | UI framework | M1 |
| `react-dom` | `^18.3.0` | React DOM renderer | M1 |
| `react-router-dom` | `^6.x` | Routing | M1 |
| `zustand` | `^4.x` | Client state | M1 (store stubs) / M3 (full) |
| `@tanstack/react-query` | `^5.x` | Server state | M1 (provider setup) / M3 (full) |
| `i18next` | `^23.x` | i18n core | M1 |
| `react-i18next` | `^14.x` | i18n React bindings | M1 |
| `dexie` | `^4.x` | IndexedDB wrapper | M1 (stub) / M5 (real schema) |
| `react-hook-form` | `^7.x` | Form handling | M2 |
| `zod` | `^3.x` | Schema validation | M2 |
| `@supabase/supabase-js` | `^2.x` | Supabase client | M1 (init) / M2 (auth) / M3 (full) |

### 3.2 Required · 开发依赖（12 项）

| Package | Version Pin | Purpose | Install Stage |
|---|---|---|---|
| `typescript` | `^5.x` | Language | M1 |
| `@types/react` | `^18.x` | React types | M1 |
| `@types/react-dom` | `^18.x` | ReactDOM types | M1 |
| `vite` | `^5.x` | Build tool | M1 |
| `@vitejs/plugin-react` | `^4.x` | Vite React plugin | M1 |
| `tailwindcss` | `^3.x` | CSS framework | M1 |
| `autoprefixer` | `^10.x` | CSS prefixer | M1 |
| `postcss` | `^8.x` | CSS processor | M1 |
| `eslint` | `^8.x` | Lint | M1 |
| `@typescript-eslint/parser` | `^7.x` | TS parser | M1 |
| `@typescript-eslint/eslint-plugin` | `^7.x` | TS rules | M1 |
| `eslint-plugin-react` | `^7.x` | React rules | M1 |

### 3.3 Recommended · 增强依赖（10 项）

| Package | Version Pin | Purpose | Install Stage |
|---|---|---|---|
| `eslint-plugin-react-hooks` | `^4.x` | Hooks rules | M1 |
| `eslint-plugin-import` | `^2.x` | Import rules | M1 |
| `prettier` | `^3.x` | Formatter | M1 |
| `vitest` | `^1.x` | Unit test framework | M1 (test setup) / M3 (real tests) |
| `@testing-library/react` | `^14.x` | Component testing | M1 |
| `@testing-library/jest-dom` | `^6.x` | DOM matchers | M1 |
| `jsdom` | `^24.x` | DOM emulation | M1 |
| `@playwright/test` | `^1.x` | E2E framework | M7 |
| `vite-plugin-pwa` | `^0.x` | PWA plugin | M1 (config) / M7 (install banner) |
| `workbox-window` | `^7.x` | Service Worker | M5 |

### 3.4 Recommended · Supabase CLI（1 项 · devDep）

| Package | Version Pin | Purpose | Install Stage |
|---|---|---|---|
| `supabase` | `^1.x` | CLI for migrations + EF deploy | M3 (DB migrations) / M6 (EF deploy) |

### 3.5 Optional · 暂不引入（待 v1.1+ 决定）

| Package | Notes |
|---|---|
| `babel-plugin-react-intl` | v1.0 用 react-i18next ICU 内置 |
| `@formatjs/intl-*` | 同上 |
| `dompurify` | v1.0 全部用户内容纯文本 + 防 EXIF strip；v1.1+ 视 FU-3/FU-4 决定 |
| `react-virtual` | v1.0 消息量 ≤ 1000；v1.1+ 加 |

### 3.6 Critical · Lazy load（runtime · M5/M6 才引入）

| Package | Stage | Why |
|---|---|---|
| Real Dexie schema | M5 | M1 仅 stub |
| `vite-plugin-pwa` full config | M7 | M1 仅 stub 文件 |
| `@sentry/react` | M3+ | Sentry free tier 配置 |
| `@logsnag/sdk` | M3+ | LogSnag free tier |

### 3.7 总依赖体量预估

| 类 | 项数 | 总体积（gzipped） |
|---|---|---|
| Runtime (M1) | 11 | ~150 KB |
| Dev (M1) | 12 | ~50 MB（含 CLI 工具） |
| Recommended (M1) | 10 | ~10 MB |
| Lazy (M3+) | 3+ | TBD |
| **M1 total** | **33** | **~10 MB dev + 150 KB runtime** |

---

## 四、Configuration Planning（配置规划）

### 4.1 配置文件创建顺序（11 必需 + 4 推荐）

| Order | File | Required/Opt | 创建阶段 | 职责 | 关键规则 |
|---|---|---|---|---|---|
| 1 | `package.json` | **Req** | Step 4 | npm scripts + deps | scripts 见 § 4.2 |
| 2 | `tsconfig.json` | **Req** | Step 4 | TS compiler | strict + path alias `@/` |
| 3 | `tsconfig.node.json` | **Req** | Step 4 | Node-side TS (vite config) | extends tsconfig.json |
| 4 | `vite.config.ts` | **Req** | Step 4 | Vite build | React plugin + `@/` alias |
| 5 | `tailwind.config.ts` | **Req** | Step 4 | Tailwind tokens | inject `tokens/index.ts` |
| 6 | `postcss.config.js` | **Req** | Step 4 | PostCSS pipeline | tailwind + autoprefixer |
| 7 | `.eslintrc.cjs` | **Req** | Step 4 | ESLint rules | TS + React + import/no-restricted-paths |
| 8 | `.prettierrc` | Req | Step 4 | Formatter | single quote + 2 spaces + trailing |
| 9 | `.gitignore` | **Req** | Step 4 | Git ignore | excludes node_modules/.env/dist |
| 10 | `.env.example` | **Req** | Step 4 | Env template | VITE_SUPABASE_URL 等 |
| 11 | `wrangler.toml` | **Req** | Step 4 | CF Pages deploy | pages_build_output_dir = "dist" |
| 12 | `supabase/config.toml` | **Req** | Step 4 | Supabase project | DB URL + EF functions |
| 13 | `.editorconfig` | Rec | Step 4 | Editor defaults | indent/encoding |
| 14 | `.vscode/settings.json` | Rec | Step 4 | VS Code settings | format on save + ts strict |
| 15 | `.vscode/extensions.json` | Rec | Step 4 | Recommended extensions | auto-install for team |
| 16 | `.github/workflows/ci.yml` | **Req** | Step 10 | CI/CD pipeline | typecheck + lint + test + build |

### 4.2 Package Scripts（必须在 package.json 中定义）



```jsonc
{
  "scripts": {
    "dev": "vite",                                              // 开发服务器
    "build": "tsc --noEmit && vite build",                      // 生产构建
    "preview": "vite preview",                                  // 预览构建产物
    "typecheck": "tsc --noEmit",                                // CI: 类型检查
    "lint": "eslint 'src/**/*.{ts,tsx}' --max-warnings=0",      // CI: lint
    "lint:fix": "eslint 'src/**/*.{ts,tsx}' --fix",             // 开发: lint fix
    "format": "prettier --write 'src/**/*.{ts,tsx}'",           // 格式化
    "format:check": "prettier --check 'src/**/*.{ts,tsx}'",     // CI: 格式化检查
    "test": "vitest run",                                       // CI: 单元测试
    "test:watch": "vitest",                                     // 开发: 热重载测试
    "test:coverage": "vitest run --coverage",                   // 覆盖率
    "test:e2e": "playwright test",                              // CI: E2E
    "test:e2e:ui": "playwright test --ui",                      // 开发: E2E UI 模式
    "deploy:fe": "wrangler pages deploy dist --project-name=nook", // FE 部署
    "deploy:functions": "supabase functions deploy --project-ref $SB_REF",  // EF 部署
    "supabase:start": "supabase start",                          // 本地 Supabase
    "supabase:stop": "supabase stop",                            // 停止本地
    "supabase:db:push": "supabase db push",                       // 应用 migrations
    "supabase:db:reset": "supabase db reset",                     // 重置 DB (仅 dev)
    "supabase:db:diff": "supabase db diff -f <name>",             // 生成 migration scaffold
    "supabase:gen:types": "supabase gen types typescript --local > src/shared/types/db.ts", // 类型生成
    "clean": "rm -rf dist .wrangler node_modules/.vite"          // 清理
  }
}
```



### 4.3 tsconfig.json 关键配置



```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,           // 强制 array.length-1 类型安全
    "noImplicitAny": true,                     // 禁 any
    "noImplicitReturns": true,                  // 必须 explicit return
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,         // 显式 optional
    "isolatedModules": true,                    // Vite 兼容
    "allowImportingTsExtensions": false,
    "verbatimModuleSyntax": true,               // type-only imports 强制
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true,                             // 让 Vite 处理
    "paths": {
      "@/*": ["./src/*"]                        // 路径别名
    },
    "baseUrl": "."
  },
  "include": ["src/**/*", "supabase/functions/**/*"],
  "exclude": ["node_modules", "dist", "tests/e2e"]
}
```



### 4.4 .eslintrc.cjs 关键配置



```js
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'import'],
  settings: {
    react: { version: 'detect' },
    'import/resolver': { typescript: { project: './tsconfig.json' } },
  },
  rules: {
    // ADR-019: 禁 any
    '@typescript-eslint/no-explicit-any': 'error',
    // ADR: type-only imports 首选
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    // ADR: React 严格
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    // ADR: hooks 严格
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    // ADR: import 顺序
    'import/order': ['warn', {
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always',
    }],
    // ADR: 禁跨层引用
    'import/no-restricted-paths': ['error', {
      zones: [
        { target: 'src/features', from: 'src/features', except: ['./*'] },
        { target: 'src/lib', from: 'src/(features|app)' },
        { target: 'src/components', from: 'src/(features|app)' },
        { target: 'src/shared', from: 'src/(?!shared)' },
      ],
    }],
    // ADR: 禁循环依赖
    'import/no-cycle': 'error',
    // ADR: 命名约定: 禁 PascalCase.js (camelCase)
    '@typescript-eslint/naming-convention': [
      'error',
      { selector: 'variable', format: ['camelCase', 'UPPER_CASE'], leadingUnderscore: 'allow' },
      { selector: 'function', format: ['camelCase'], leadingUnderscore: 'allow' },
    ],
    // ADR: 禁 console (除允许列表)
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  overrides: [
    {
      files: ['tests/**/*', 'supabase/functions/_shared/**/*'],
      rules: { 'no-console': 'off' },
    },
  ],
};
```



### 4.5 vite.config.ts 关键配置



```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fonts/*.woff2', 'icons/*.png'],
      manifest: {
        name: 'Nook',
        short_name: 'Nook',
        description: 'A Digital Sanctuary',
        theme_color: '#1a1a1a',
        background_color: '#0a0a0a',
        display: 'standalone',
        icons: [
          { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
        runtimeCaching: [
          { urlPattern: /\/rest\/v1\//, handler: 'NetworkFirst', options: { cacheName: 'supabase-api' } },
          { urlPattern: /\.(woff2|png|jpg|svg)$/, handler: 'CacheFirst', options: { cacheName: 'static-assets' } },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
  },
  server: { port: 5173, host: true },
});
```



### 4.6 tailwind.config.ts 关键配置



```ts
import type { Config } from 'tailwindcss';
import tokens from './tokens/index';  // 注入 Design Tokens

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',  // Nook FORCE dark (allowed only)
  theme: {
    extend: {
      colors: tokens.colors,           // 颜色 tokens
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      borderRadius: tokens.radius,
      spacing: tokens.spacing,
      boxShadow: tokens.shadow,
      animation: tokens.animation,
    },
  },
  plugins: [],
} satisfies Config;
```



### 4.7 .gitignore 关键内容



```
# Dependencies
node_modules/

# Build output
dist/
.wrangler/

# Env（保留 .env.example 为模板）
.env
.env.local
.env.*.local

# Editor/IDE
.idea/
*.swp
*.swo
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Supabase local
supabase/.temp/
supabase/.branches/

# Test coverage
coverage/
.nyc_output/
playwright-report/
test-results/

# TypeScript build info
*.tsbuildinfo
```



### 4.8 .env.example 关键内容



```bash
# Supabase
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>

# Sentry (optional, set at M3+)
VITE_SENTRY_DSN=

# LogSnag (optional)
VITE_LOGSNAG_TOKEN=

# App
VITE_APP_VERSION=0.4.0
```



### 4.9 wrangler.toml 关键内容



```toml
name = "nook"
compatibility_date = "2024-06-01"
pages_build_output_dir = "./dist"

[vars]
VITE_APP_VERSION = "0.4.0"

[env.production]
# (TBD by Stage 17)
```



### 4.10 supabase/config.toml 关键内容



```toml
project_id = "nook"

[api]
enabled = true
port = 54321

[db]
port = 54322
shadow_port = 54320
major_version = 15

[studio]
enabled = true
port = 54323
api_url = "http://127.0.0.1:54321"

[auth]
enabled = true
site_url = "http://localhost:5173"
additional_redirect_urls = ["http://localhost:5173"]
jwt_expiry = 3600
enable_signup = false  # 禁 direct signUp, 仅 EF friend-signup

[realtime]
enabled = true

[storage]
enabled = true
file_size_limit = "50MiB"

[functions]
verify_jwt = true  # EF 默认 JWT 验证

[functions.friend-signup]
verify_jwt = false  # signUp 前还没有 JWT

[edge_runtime]
policy = "oneshot"

[experimental]
pg_cron = true  # 启用 pg_cron extension
```



### 4.11 .github/workflows/ci.yml 关键内容



```yaml
name: CI
on:
  pull_request: { branches: [main] }
  push: { branches: [main] }
jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20.x', cache: 'npm' }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run format:check
      - run: npm run test
      - run: npm run build
      - run: npx lhci autorun --collect-static-dist=dist    # Lighthouse CI (M7)
        if: github.ref == 'refs/heads/main'
```



### 4.12 VS Code 配置（.vscode/settings.json + extensions.json）

**settings.json** (推荐):



```jsonc
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "[typescript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[typescriptreact]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  "files.eol": "\n"
}
```



**extensions.json** (推荐):



```jsonc
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-playwright.playwright",
    "vitest.explorer",
    "supabase.supabase-vscode",
    "EditorConfig.EditorConfig",
  ]
}
```



### 4.13 .editorconfig 关键内容



```editorconfig
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
max_line_length = 100

[*.md]
trim_trailing_whitespace = false
```



### 4.14 .prettierrc 关键内容



```jsonc
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```



---

## 五、Directory Initialization（目录初始化）

### 5.1 必须立即创建（M1 Bootstrap 阶段）



```
nook/
├── .github/
│   └── workflows/
│       └── ci.yml                       [Step 10]
├── .vscode/
│   ├── settings.json                    [Step 4]
│   └── extensions.json                  [Step 4]
├── public/
│   ├── fonts/                           [Step 10 - 复制 Inter + JetBrains Mono WOFF2]
│   │   ├── inter/                       [Step 10]
│   │   └── jetbrains-mono/              [Step 10]
│   ├── icons/                           [Step 10 - 192/512/1024 px PWA icons]
│   ├── manifest.json                    [Step 10 - via vite-plugin-pwa]
│   └── robots.txt                       [Step 10]
├── src/
│   ├── main.tsx                         [Step 6]
│   ├── App.tsx                          [Step 6]
│   ├── app/
│   │   ├── routes.tsx                   [Step 9]
│   │   ├── guards/
│   │   │   ├── RequireAuth.tsx          [Step 9]
│   │   │   └── RequireOwner.tsx         [Step 9]
│   │   └── pages/                       [Step 9 - 13 占位页]
│   │       ├── WelcomePage.tsx
│   │       ├── RegisterPage.tsx
│   │       ├── LoginPage.tsx
│   │       ├── InviteNewPage.tsx
│   │       ├── InviteAcceptPage.tsx
│   │       ├── HomePage.tsx
│   │       ├── SettingsPage.tsx
│   │       ├── SettingsProfilePage.tsx
│   │       ├── SettingsAdminPage.tsx
│   │       ├── GroupSettingsPage.tsx
│   │       ├── NotFoundPage.tsx
│   │       └── ErrorPage.tsx
│   ├── components/
│   │   ├── ui/                          [Step 8 - 4 原子组件]
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Avatar.tsx
│   │   │   └── Bubble.tsx
│   │   └── a11y/
│   │       └── MotionReduced.tsx        [Step 10]
│   ├── lib/
│   │   ├── supabase.ts                  [Step 6 - singleton init]
│   │   ├── api/                         [Step 6 - empty dir for M3+]
│   │   │   └── errors.ts                [Step 6 - mapSupabaseError scaffold]
│   │   ├── i18n/
│   │   │   ├── index.ts                 [Step 9]
│   │   │   └── locales/
│   │   │       ├── zh-CN/
│   │   │       │   └── translation.json
│   │   │       └── en/
│   │   │           └── translation.json
│   │   └── auth/
│   │       └── guards.tsx               [Step 9 - helper]
│   ├── stores/                          [Step 6 - 4 stores scaffold]
│   │   ├── useAuth.ts
│   │   ├── useUI.ts
│   │   ├── useChat.ts
│   │   └── usePresence.ts
│   ├── shared/                          [Step 6 - types scaffold]
│   │   ├── types/
│   │   │   ├── domain.ts                [Step 6 - empty interfaces]
│   │   │   └── errors.ts                [Step 6 - ErrorCode enum]
│   │   └── constants/
│   │       ├── limits.ts                [Step 6]
│   │       ├── time.ts                  [Step 6]
│   │       └── locale.ts                [Step 6]
│   ├── hooks/                           [Step 6 - scaffold]
│   │   ├── useMediaQuery.ts             [Step 6]
│   │   ├── useClickOutside.ts           [Step 6]
│   │   └── useDocumentTitle.ts          [Step 6]
│   ├── config/
│   │   └── env.ts                       [Step 4/6 - VITE_* mapping]
│   └── styles/
│       ├── index.css                    [Step 7 - tailwind directives + dark]
│       └── tokens.css                   [Step 7 - CSS variable injection]
├── supabase/
│   ├── config.toml                      [Step 4]
│   ├── migrations/                      [Step 6 - empty + .gitkeep]
│   └── functions/                       [Step 6 - empty + .gitkeep]
│       ├── _shared/                     [M3+]
│       ├── admin-bootstrap/             [M6]
│       ├── friend-signup/               [M2]
│       ├── admin-create-invite/         [M6]
│       ├── admin-reset-password/        [M6]
│       ├── admin-delete-friend/         [M6]
│       └── cleanup-storage-orphans/     [M6]
├── tests/                               [Step 6 + M1 test stubs]
│   ├── unit/                            [Step 6]
│   ├── integration/                     [Step 6]
│   ├── e2e/                             [Step 6]
│   ├── mocks/                           [Step 6]
│   ├── fixtures/                        [Step 6]
│   └── utils/                           [Step 6]
├── scripts/                             [Step 6]
│   ├── test-rls.ts                      [M3]
│   └── seed-test-data.ts                [M3+]
├── tokens/                              [Step 7 - 同步 prompt/tokens/]
│   ├── index.ts
│   └── README.md
├── prompt/                              [Step 6 - 历史存档]
│   ├── components/
│   │   ├── Button.spec.md
│   │   ├── Input.spec.md
│   │   ├── Avatar.spec.md
│   │   └── Bubble.spec.md
│   └── tokens/
├── docs/                                [Step 6 - 同步项目记忆]
│   ├── AI_HANDOVER.md
│   ├── DEVELOPMENT_LOG.md
│   ├── CHANGELOG.md
│   ├── TODO.md
│   ├── KNOWN_ISSUES.md
│   ├── DECISIONS.md
│   ├── ROADMAP.md
│   └── adr/
│       └── *.md
├── spec/                                [Step 6 - 冻结文档]
│   ├── Nook-SPEC.md
│   ├── Nook-PRODUCT.md
│   ├── Nook-DESIGN.md
│   ├── Nook-ARCHITECTURE.md
│   ├── Nook-INTERVIEW-spec.md
│   ├── Nook-DATA-MODEL.md
│   ├── Nook-ARCH-DESIGN-v1.0.md
│   ├── Nook-API-DESIGN-v1.0.md
│   ├── Nook-PROJECT-STRUCTURE.md
│   ├── Nook-CODING-STANDARDS.md
│   ├── Nook-GIT-WORKFLOW.md
│   ├── Nook-WORK-BREAKDOWN.md
│   ├── Nook-PROJECT-BOOTSTRAP-PLAN.md
│   ├── Nook-SPEC-FREEZE.md
│   └── Nook-SPEC-FREEZE-v1.0.1.md
├── .editorconfig                        [Step 4]
├── .env.example                         [Step 4]
├── .eslintrc.cjs                        [Step 4]
├── .gitignore                           [Step 4]
├── .prettierrc                          [Step 4]
├── package.json                         [Step 4/5]
├── package-lock.json                    [Step 5 - auto-generated]
├── postcss.config.js                    [Step 4]
├── README.md                            [Step 6]
├── tailwind.config.ts                   [Step 4]
├── tsconfig.json                        [Step 4]
├── tsconfig.node.json                   [Step 4]
├── vite.config.ts                       [Step 4]
└── wrangler.toml                        [Step 4]
```



### 5.2 开发过程中创建（不预先创建）

| 目录/文件 | 创建 Stage | 原因 |
|---|---|---|
| `src/features/auth/**` | M2 | 当前 M1 无业务域代码 |
| `src/features/chat/**` | M3 | 同上 |
| `src/features/settings/**` | M5 | 同上 |
| `src/features/admin/**` | M6 | 同上 |
| `src/components/layout/**` | M3 | M1 仅 ui + a11y |
| `src/components/chat/**` | M3 | 同上 |
| `src/lib/api/*.ts` (完整版) | M2/M3 | M1 仅 errors.ts |
| `src/lib/realtime/*` | M3 | M1 未引入 |
| `src/lib/db/*` | M5 | 同上 |
| `src/lib/storage/*` | M5 | 同上 |
| `tests/unit/**/*` | M3+ | M1 仅 setup |
| `tests/integration/**/*` | M3+ | 同上 |
| `tests/e2e/**/*` | M7 | 同上 |
| `supabase/functions/admin-bootstrap/` index.ts | M6 | M1 仅 dir placeholder |
| `supabase/functions/friend-signup/` index.ts | M2 | 同上 |
| `supabase/functions/admin-create-invite/` index.ts | M6 | 同上 |
| `supabase/functions/admin-reset-password/` index.ts | M6 | 同上 |
| `supabase/functions/admin-delete-friend/` index.ts | M6 | 同上 |
| `supabase/functions/cleanup-storage-orphans/` index.ts | M6 | 同上 |
| `supabase/migrations/0001_init.sql` 等 6 个 | M3 | M1 dir + .gitkeep |
| `tests/fixtures/sample-messages.json` | M3+ | 同上 |

### 5.3 README.md 内容规划（M1 创建）



```markdown
# Nook v1.0

> 「深夜书房」— 屏蔽互联网社交噪音的私人聊天网站。

## Quick Links
- [Spec](../01_Product/Nook-SPEC.md) · [Architecture](../02_Architecture/Nook-ARCH-DESIGN-v1.0.md)
- [API Contract](../02_Architecture/Nook-API-DESIGN-v1.0.md) · [Project Structure](../03_Engineering/Nook-PROJECT-STRUCTURE.md)
- [Coding Standards](../03_Engineering/Nook-CODING-STANDARDS.md) · [Work Breakdown](../03_Engineering/Nook-WORK-BREAKDOWN.md)

## Quick Start

(detailed in Bootstrap Execution stage)

## Project Memory
- [AI Handover](AI_HANDOVER.md) · [Dev Log](DEVELOPMENT_LOG.md)
- [TODO](TODO.md) · [CHANGELOG](CHANGELOG.md)
- [Known Issues](KNOWN_ISSUES.md) · [Decisions](DECISIONS.md)
- [Roadmap](ROADMAP.md) · [ADRs](./docs/adr/)

## License
Private. Not for redistribution.
```



### 5.4 目录创建硬约束

| 规则 | 描述 |
|---|---|
| ✅ 创建空目录 | 用 `mkdir -p` 或 touch `.gitkeep` |
| ❌ 业务代码 | 不在 M1 创建任何 features/* 业务代码 |
| ❌ 配置文件 in dir | 不在 supabase/ 目录下硬编码 .toml 重复（仅根 config.toml） |
| ❌ 跨 Stage 提前创建 | M2+ 目录在 M1 用 `.gitkeep` 占位，避免 vscode 显示空文件夹 |

---

## 六、Environment Planning（开发环境）

### 6.1 Node.js 版本

| 决策 | 值 | 依据 |
|---|---|---|
| **Node.js LTS** | `20.x` (Active LTS) | React 18 + Vite 5 支持矩阵 |
| **推荐 `.nvmrc` 文件** | `20` | 但 v1.0 不创建（ADR-009 IIFE-only）；由 Project Lead 决定 |

### 6.2 包管理器（推荐）

| 决策 | 值 | 依据 |
|---|---|---|
| **npm** | `npm` (default with Node) | 优先 muted 兼容性 |
| **备选: pnpm** | 强烈推荐（如果 Project Lead 偏好） | 更快的 install + 节省磁盘 |
| **备选: yarn** | 兼容但 Project Lead 必须显式选 | classic v1 + berry 复杂度 |

> **本计划默认 npm**。如果 Project Lead 偏好 pnpm，则 Step 5 切换。

### 6.3 环境变量（.env.example → .env 真实值）

| Variable | Required? | Stage | 来源 |
|---|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | M1 | Supabase project dashboard |
| `VITE_SUPABASE_ANON_KEY` | ✅ | M1 | Supabase project dashboard |
| `VITE_SENTRY_DSN` | ❌ optional | M3 | Sentry project setup |
| `VITE_LOGSNAG_TOKEN` | ❌ optional | M3 | LogSnag workspace |
| `VITE_APP_VERSION` | ✅ | M1 | 硬编码 v0.4.0，与 package.json 同步 |

### 6.4 开发环境要求

| Component | Min | 推荐 |
|---|---|---|
| **OS** | macOS / Linux / Windows (WSL2 推荐) | macOS |
| **Node.js** | 18.x | 20.x Active LTS |
| **npm** | 9.x | 10.x |
| **Git** | 2.30+ | latest |
| **Browser (dev)** | Chrome / Edge latest | Chrome + DevTools |

### 6.5 浏览器支持（生产用户）

| Tier | Browsers | Stage |
|---|---|---|
| **Modern Evergreen only** | Chrome / Edge / Firefox / Safari 当前稳定版 | v1.0 罗乐覆盖 |
| ❌ 不支持 | IE11 / Safari < 14 / 内核非常规浏览器 | SPEC § 3.8 强禁 |

### 6.6 网络要求

| Requirement | Notes |
|---|---|
| GitHub 直连 | repo clone / push |
| Supabase 直连 | migration / EF deploy |
| Cloudflare Pages 直连 | wrangler deploy |
| Sentry / LogSnag | free tier 可选 |
| **(大陆)** | SPEC § 9.9: Supabase 跨洋 100-250ms 可接受；自托管字体绕开 Google CDN |

---

## 七、Documentation Initialization（文档初始化）

### 7.1 已有文档（从 SPEC 体系 copy 进项目）

| File | Source | 拷贝原因 |
|---|---|---|
| `../01_Product/Nook-SPEC.md` | 根目录 | SoT |
| `../01_Product/Nook-PRODUCT.md` | 根目录 | 产品定位 |
| `../01_Product/Nook-DESIGN.md` | 根目录 | 视觉语言 |
| `../02_Architecture/Nook-ARCHITECTURE.md` | 根目录 | LEGACY 选型（已被 ARCH-DESIGN 取代）|
| `../01_Product/Nook-INTERVIEW-spec.md` | 根目录 | 6 轮 Interview |
| `../02_Architecture/Nook-DATA-MODEL.md` | 根目录 | 数据库业务模型 |
| `../02_Architecture/Nook-ARCH-DESIGN-v1.0.md` | 根目录 | 权威架构 |
| `../02_Architecture/Nook-API-DESIGN-v1.0.md` | 根目录 | API 契约 |
| `Nook-PROJECT-STRUCTURE.md` | 根目录 | 目录结构 |
| `Nook-CODING-STANDARDS.md` | 根目录 | 编码规范 |
| `Nook-GIT-WORKFLOW.md` | 根目录 | Git 工作流 |
| `Nook-WORK-BREAKDOWN.md` | 根目录 | 任务拆分 |
| `Nook-PROJECT-BOOTSTRAP-PLAN.md` | 根目录 | **本文** |
| `../01_Product/Nook-SPEC-FREEZE.md` | 根目录 | v1.0 冻结 |
| `../01_Product/Nook-SPEC-FREEZE-v1.0.1.md` | 根目录 | v1.0.1 patch |

### 7.2 `docs/` 已存在目录（M1 时复制）

| File | Source | 复制原因 |
|---|---|---|
| `AI_HANDOVER.md` | 根目录 | 项目交接核心 |
| `DEVELOPMENT_LOG.md` | 根目录 | Session 记录 |
| `CHANGELOG.md` | 根目录 | 版本变更 |
| `TODO.md` | 根目录 | 任务清单 |
| `KNOWN_ISSUES.md` | 根目录 | 已知问题 |
| `DECISIONS.md` | 根目录 | ADR-lite |
| `ROADMAP.md` | 根目录 | 路线图 |
| `../02_Architecture/adr/ADR-001.md` ~ `../02_Architecture/adr/ADR-020.md` | 根目录 | 完整 ADR |
| `../02_Architecture/adr/README.md` | 根目录 | ADR 索引 |

### 7.3 首次 Commit 后维护

| Doc | Trigger |
|---|---|
| `DEVELOPMENT_LOG.md` | 每个 Session 后追加 |
| `CHANGELOG.md` | 每个 M 完成 / 每个 fix merge |
| `TODO.md` | Task 状态变化 |
| `KNOWN_ISSUES.md` | 发现 new issue |
| `AI_HANDOVER.md` | Event-driven (每个 Stage 完成后) |
| `DECISIONS.md` | 新 ADR 时追加 |
| `ROADMAP.md` | 版本计划调整时 |
| `docs/adr/ADR-XXX.md` | 新决策 |

### 7.4 `prompt/` 文件夹

**保留**而不是修改。`prompt/` 是历史存档（不参与 build / 不参与 git blame 现代阶段）。

| File | 备注 |
|---|---|
| `prompt/components/{Button,Input,Avatar,Bubble}.spec.md` | 4 原子组件的 React API 规范（权威）|
| `prompt/tokens/index.ts` | Design Tokens（与 `tokens/index.ts` 同步）|
| 其他 `.txt` / `.md` 文件 | 历史 prompt 文件，已通过 Stage 1-16 转化为正式文档 |

### 7.5 文档初始化策略

- 全部 spec/ 与 docs/ 文件以**原文**复制进项目
- 不在 Bootstrap 阶段修改任何文档
- 项目根 `README.md` 是 **唯一新建文档**（Step 6）
- `vite-plugin-pwa` 自动生成 `manifest.json`（不需手写）

---

## 八、Git Initialization（Git 初始化）

### 8.1 Git 初始化总览

| Step | Action | Output |
|---|---|---|
| 1 | `git init` (Step 3) | Local repo |
| 2 | `git remote add origin` (Step 3) | GitHub remote |
| 3 | `git checkout -b main` (Step 3) | main branch |
| 4 | `git add .` (Step 3) | Stage all files |
| 5 | `git commit -m "feat: bootstrap M1 Foundation (scaffold + tokens + CI)"` (Step 3) | First commit |
| 6 | `git push -u origin main` (Step 3) | Push to GitHub |
| 7 | `git tag -a v0.4.0 -m "M1 Foundation: ..."` (Step 10) | Annotated tag |

### 8.2 首次 Commit 内容清单（确定内容）

| File | 类别 |
|---|---|
| `package.json` | npm 配置 |
| `package-lock.json` | Lockfile |
| `tsconfig.json` + `tsconfig.node.json` | TS 配置 |
| `vite.config.ts` | Vite 配置 |
| `tailwind.config.ts` + `postcss.config.js` | CSS 配置 |
| `.eslintrc.cjs` + `.prettierrc` | Lint/Format |
| `.gitignore` | Git ignore |
| `.editorconfig` + `.vscode/*` | Editor 配置 |
| `wrangler.toml` + `supabase/config.toml` | Deploy 配置 |
| `.github/workflows/ci.yml` | CI/CD |
| `tokens/index.ts` + `tokens/README.md` | Design tokens |
| `src/main.tsx` + `src/App.tsx` | Entry |
| `src/styles/index.css` + `tokens.css` | Global CSS |
| `src/lib/supabase.ts` + `lib/api/errors.ts` | Client + error mapping |
| `src/lib/i18n/*` | i18n setup + 双语 |
| `src/app/routes.tsx` + `src/app/guards/*` | Routing |
| `src/app/pages/*.tsx` (13 占位页) | 页面占位 |
| `src/components/ui/{Button,Input,Avatar,Bubble}.tsx` | 4 原子组件 |
| `src/components/a11y/MotionReduced.tsx` | A11y |
| `src/shared/types/*` + `src/shared/constants/*` | Types + constants |
| `src/stores/*` (4 个) | Zustand stores |
| `src/hooks/*` (3 个) | Hooks scaffold |
| `src/config/env.ts` | Env mapping |
| `public/manifest.json` (via vite-plugin-pwa) | PWA manifest |
| `public/icons/*.png` | PWA icons |
| `public/fonts/**/*.woff2` | Self-hosted fonts |
| `tests/*` (placeholder dirs) | Test scaffolds |
| `scripts/*` | Tool scripts |
| `supabase/migrations/.gitkeep` + `supabase/functions/.gitkeep` | Backend placeholders |
| `README.md` | Project README |
| `spec/**` + `docs/**` | All SoT + project memory |

### 8.3 Git Commit Message 格式

**首次 commit 必须遵循 Conventional Commits**：



```bash
git commit -m "feat(m1): bootstrap Nook v1.0 Foundation

- Vite + React 18 + TS scaffold
- Tailwind v3 + Design Tokens injection
- i18next with zh-CN + en bilingual setup
- 13 routes + RequireAuth + RequireOwner guards
- 4 atomic components (Button/Input/Avatar/Bubble)
- Supabase client singleton + mapSupabaseError
- Zustand stores scaffold (useAuth/useUI/useChat/usePresence)
- Self-hosted Inter + JetBrains Mono WOFF2
- GitHub Actions CI (typecheck + lint + format + test + build)
- Reduced-motion listener + dark theme force
- All 20 ADR + 7 docs/ + spec/ archived

Refs: ADR-001..020, Nook-WORK-BREAKDOWN v1.0"
```



### 8.4 Branch 策略（M1 后）

| 分支 | 用途 | 来源 |
|---|---|---|
| `main` | 生产就绪代码 | 首个 commit |
| `feature/<feature-name>` | M2+ 新功能 | `main` |

### 8.5 Tag 策略（M1 后）

| Tag | 触发 |
|---|---|
| `v0.4.0` | M1 Done (与首次 commit 一致) |
| `v0.5.0` | M2 Done |
| `v0.6.0` | M3 Done |
| `v1.0.0` | M7 Done |

---

## 九、Bootstrap Checklist（初始化检查清单）

### 9.1 完整 Checklist（30 项 · 全部 ✅ 才算 Bootstrap 完成）

#### Step 1 · Platform Pre-requisite（4 项）

- [ ] GitHub repo `nook` 创建（empty · 无 README）
- [ ] Supabase project 创建
- [ ] Supabase `pg_cron` extension 启用
- [ ] `.env` 真实值 → Project Lead 提供

#### Step 2 · Local Project Creation（3 项）

- [ ] Vite + React-TS 脚手架创建 (`nook/` 目录)
- [ ] 默认 scaffold 文件清理（Vite 默认 App.tsx / *.css 删除 / 替换为自定义）
- [ ] 项目目录初始化

#### Step 3 · Initial Commit Setup（3 项）

- [ ] `git init` 完成
- [ ] `git remote add origin <github-url>` 完成
- [ ] 首次 commit + push 完成

#### Step 4 · Configuration Files（11 必需 + 4 推荐 · 全部 ✅）

- [ ] `package.json` 创建（含全部 scripts）
- [ ] `tsconfig.json` + `tsconfig.node.json` 创建（strict + path alias）
- [ ] `vite.config.ts` 创建（React + PWA plugins + alias）
- [ ] `tailwind.config.ts` + `postcss.config.js` 创建（tokens 注入）
- [ ] `.eslintrc.cjs` 创建（含 import/no-restricted-paths 规则）
- [ ] `.prettierrc` 创建
- [ ] `.gitignore` 创建（完整 exclude 列表）
- [ ] `.env.example` + `.env` 创建
- [ ] `wrangler.toml` 创建
- [ ] `supabase/config.toml` 创建
- [ ] `.editorconfig` + `.vscode/settings.json` + `.vscode/extensions.json` 创建（推荐）
- [ ] `.github/workflows/ci.yml` 创建

#### Step 5 · Dependency Installation（4 项）

- [ ] Runtime deps 安装（11 项）
- [ ] Dev deps 安装（12 项）
- [ ] Recommended deps 安装（10 项）
- [ ] Supabase CLI 安装（1 项）

#### Step 6 · Directory Initialization（5 项）

- [ ] `src/` 子目录全创建
- [ ] `src/main.tsx` + `src/App.tsx` 创建
- [ ] `public/{fonts,icons}/` 创建
- [ ] `supabase/{migrations,functions}/` placeholder 创建（`.gitkeep`）
- [ ] 项目根 `README.md` 创建

#### Step 7 · Token + Theme Injection（4 项）

- [ ] `tailwind.config.ts` ↔ `tokens/index.ts` 注入成功
- [ ] Vite alias `@/` → `src/` 解析正确
- [ ] `src/styles/index.css` 含 `@tailwind base/components/utilities` + `color-scheme: dark`
- [ ] `src/styles/tokens.css` 注入 CSS 变量

#### Step 8 · 4 Atomic Components（5 项）

- [ ] `Button.tsx` 实现（匹配 Button.spec.md）
- [ ] `Input.tsx` 实现（匹配 Input.spec.md）
- [ ] `Avatar.tsx` 实现（匹配 Avatar.spec.md）
- [ ] `Bubble.tsx` 实现（匹配 Bubble.spec.md）
- [ ] 4 组件单元测试 ≥ 80% 覆盖

#### Step 9 · i18n + Routes + Guards（4 项）

- [ ] `i18next` 初始化（含 ICU plural）
- [ ] `locales/{zh-CN,en}/translation.json` 完整
- [ ] `routes.tsx` 含 13 路由
- [ ] `RequireAuth` + `RequireOwner` guards

#### Step 10 · CI + Dark + Fonts + Verification（6 项）

- [ ] `.github/workflows/ci.yml` 含 typecheck/lint/test/build
- [ ] `:root { color-scheme: dark }` 全局
- [ ] `public/fonts/inter/*.woff2` + `jetbrains-mono/*.woff2` 复制
- [ ] `vite build` 0 error
- [ ] `npm run typecheck` 0 error
- [ ] `npm run lint` 0 error / warning

#### Final Verification（5 项）

- [ ] `npm run dev` 浏览器打开 `http://localhost:5173` → 深色渲染 + 13 路由全部可达
- [ ] `npm run test` 单元测试通过
- [ ] 断网后字体正常显示（自托管确认）
- [ ] DevTools 网络面板无 Google Fonts request
- [ ] 切换 zh-CN / en → UI 文案即时刷新（消息 body 不翻）

---

## 十、Bootstrap Risks（风险）

### 10.1 6 类风险 + 缓解

#### R-BS-01 · Supabase ANON_KEY 泄露到 public

| 维度 | 内容 |
|---|---|
| **风险** | ANON_KEY 误入 .git；公开后 RLS 仍可兜底，但增加攻击面 |
| **概率** | Medium |
| **影响** | Medium |
| **缓解** | 1) .gitignore 包含 `.env`；2) .env.example 永远不含真实值；3) RLS 7 张表 coverage 自动挡；4) verify_jwt 默认开 |

#### R-BS-02 · 字体自托管失败

| 维度 | 内容 |
|---|---|
| **风险** | 字体文件 copy 失败 / 版本错误 / 字符集不完整 |
| **概率** | Low |
| **影响** | High（违反 SPEC UI-5 硬禁） |
| **缓解** | 1) 字体从官方 source（rsms.me / JetBrains 官网）下载；2) 每个字体 2 个权重（inter: 400 + 600；mono: 400 + 700）；3) fonts.css 加 font-display: swap fallback to system；4) M7 Lighthouse CI 验证无 google fonts 请求 |

#### R-BS-03 · Tailwind tokens 注入失败

| 维度 | 内容 |
|---|---|
| **风险** | tokens/index.ts 与 tailwind.config.ts 颜色 / 半径 / 间距不匹配 → 业务代码看起来正常但实际走 system default |
| **概率** | Medium |
| **影响** | High（违反 SPEC UI-5 视觉一致性） |
| **缓解** | 1) 在 tailwind.config.ts 显式 `import tokens`；2) AC.AC.naming 在 M7 grep 验证；3) Lighthouse CI 视觉对比截图 |

#### R-BS-04 · path alias `@/` 在 CI/E2E 不生效

| 维度 | 内容 |
|---|---|
| **风险** | Vite alias 配置但 TS resolver 不识别 → CI typecheck 失败 |
| **概率** | Low |
| **影响** | High（Build 失败 = M1 完败） |
| **缓解** | 1) tsconfig.json `paths` 配置一致；2) vite.config.ts `resolve.alias` 一致；3) ESLint `import/resolver: typescript` 配置；4) CI 跑 typecheck + build 必须 0 error |

#### R-BS-05 · CI 工作流配置权限/Token 不足

| 维度 | 内容 |
|---|---|
| **风险** | CI 中 wrangler / supabase deploy 缺 token → CI 中触发 deploy 失败 |
| **概率** | Low |
| **影响** | Medium（CI warn，不阻塞 M1 Done） |
| **缓解** | 1) M1 阶段 CI 只跑 verify（不 deploy）；2) Project Lead 决定 deploy 路径（手动 / CI） |

#### R-BS-06 · Service Worker 在 dev 模式干扰测试

| 维度 | 内容 |
|---|---|
| **风险** | vite-plugin-pwa 在 dev 注册 sw → 缓存旧版本影响 HMR |
| **概率** | Medium |
| **影响** | Medium（开发体验下降） |
| **缓解** | 1) `registerType: 'autoUpdate'` 已配置；2) `devOptions.enabled` 默认 false；3) M1 时 SW 在 dev 不启用（生产 build 时才注册） |

### 10.2 风险 RAG 矩阵

| | Low Impact | Medium Impact | High Impact |
|---|---|---|---|
| **Low Probability** | 🟢 R-BS-05 (CI token) | 🟣 R-BS-06 (SW dev) | 🟢 |
| **Medium Probability** | 🟢 | 🟡 R-BS-01 (ANON key) · R-BS-03 (Token inject) | 🟡 R-BS-04 (alias) |
| **High Probability** | 🟢 | 🟢 | 🟡 R-BS-02 (字体) |

### 10.3 主要 2 项 Critical 风险

1. **R-BS-04**：path alias 不生效 → M1 Build 直接失败 → 不能 Done。
   **必检**：Step 4 后立即跑 `npm run typecheck` + `npm run build`。
2. **R-BS-02**：字体自托管失败 → Lighthouse CI 失败 + 违反 SPEC UI-5 硬禁。
   **必检**：Step 10 后跑 `npm run build` 含字体文件 + DevTools 检查网络请求。

### 10.4 验证矩阵（How to verify）

| 验证项 | 工具 | 通过条件 |
|---|---|---|
| TypeScript 严格通过 | `npm run typecheck` | 0 error |
| ESLint 通过 | `npm run lint` | 0 error / warning |
| Build 成功 | `npm run build` | exit 0，含 dist/ 输出 |
| 4 原子组件渲染 | `npm run dev` + 浏览器 | 4 组件正常显示 prop variants |
| 13 路由可达 | `curl -I http://localhost:5173/<each-route>` | 全部 200 或 404（占位）|
| i18n 切换 | 手动切换 zh-CN / en | UI 文案即时刷新 |
| Dark theme | 浏览器系统偏好调 Light | Nook 仍 dark |
| 字体自托管 | DevTools 网络 | 无 fonts.googleapis.com 请求 |
| CI 流程 | push to GitHub | CI 全绿 |
| Supabase client init | `import { supabase } from '@/lib/supabase'` | HTTP 200 |

---

## 十一、Stages × Bootstrap 任务映射

### 11.1 Bootstrap 输出与 M1 Tasks 的对应

| Bootstrap Step | 对应 T-M1-XX Task | 状态 |
|---|---|---|
| Step 1 (Platform) | 无（Project Lead 完成） |  |
| Step 2 (Vite scaffold) | T-M1-01 (Vite + React 18 + TS) | ⏳ Not Started |
| Step 3 (Initial commit) | T-M1-01 尾部 | ⏳ Not Started |
| Step 4 (Configs) | T-M1-01 (vite/tsconfig/eslint/prettier/wrangler/supabase/ci) | ⏳ Not Started |
| Step 5 (Deps) | T-M1-01 (npm install) | ⏳ Not Started |
| Step 6 (Directory) | T-M1-01 (src/* 创建) | ⏳ Not Started |
| Step 7 (Token injection) | T-M1-02 (Tailwind + Tokens) | ⏳ Not Started |
| Step 8 (4 atoms) | T-M1-05 (4 原子组件) | ⏳ Not Started |
| Step 9 (i18n + routes) | T-M1-03 (i18n) + T-M1-04 (13 routes + guards) | ⏳ Not Started |
| Step 10 (CI + dark + fonts + verify) | T-M1-06 (CI + 字体 + dark) | ⏳ Not Started |

> **Bootstrap Plan 完整覆盖 M1 的全部 6 个 Task**。当 Bootstrap 执行完成 = T-M1-01 ~ T-M1-06 全部 Done = M1 Foundation Done = git tag `v0.4.0`。

---

## 十二、Step-by-Step Execution Preview （执行预览 · 仅供理解）

> **本节展示执行阶段的命令清单（仅供参考，不在 Bootstrap Plan 阶段执行）**。真正的执行属于下一阶段（Project Initialization Execution）。

| Step | 关键命令（参考用，不在本文执行） | 时长 |
|---|---|---|
| 1 | (Project Lead) 创建 GitHub repo + Supabase project | 30 min |
| 2 | `npm create vite@latest nook -- --template react-ts` | 10 min |
| 3 | `git init && git add . && git commit -m "feat: scaffold" && git push origin main` | 5 min |
| 4 | 手写 11 configs（见 § 4.1-§ 4.14） | 30 min |
| 5 | `npm install <33 packages>` | 10 min |
| 6 | 创建 40+ 目录 + 14 占位页 | 15 min |
| 7 | `tokens/index.ts` ↔ tailwind.config.ts 接入 | 10 min |
| 8 | 4 原子组件实现 + unit tests | 60 min |
| 9 | i18n + 13 routes + guards | 45 min |
| 10 | CI + 字体 copy + global dark + verify | 30 min |

**总 AI 编程时间**：约 **4 hours** + dev server 启动调试 **30 min** ≈ **4.5 hour**。

---

## 结束语 · Stage 16 Definition of Done

- ✅ § 一 Bootstrap Overview（10 步流程 + 时长估算）
- ✅ § 二 Project Creation（命名 + 框架 + 参数 + 平台预创建）
- ✅ § 三 Dependency Planning（11 runtime + 12 dev + 10 recommended + 1 supabase CLI + 待定 optional + lazy）
- ✅ § 四 Configuration Planning（11 必需 + 4 推荐 · 全部 configs 内容清单）
- ✅ § 五 Directory Initialization（M1 立即创建 + 开发过程创建 + README 内容）
- ✅ § 六 Environment Planning（Node 20 · 包管理器 · env · 浏览器 · 网络要求）
- ✅ § 七 Documentation Initialization（spec/ + docs/ 复制策略 + 首次 commit 后维护规则）
- ✅ § 八 Git Initialization（步骤 · 首次 commit · 分支 · Tag · Conventional Commits 格式）
- ✅ § 九 Bootstrap Checklist（**30 项**逐条验证）
- ✅ § 十 Bootstrap Risks（6 类风险 + RAG + 验证矩阵）
- ✅ § 十一 Stages × Bootstrap 任务映射
- ✅ § 十二 Execution Preview（仅预览，非执行）
- ✅ ❌ 不创建项目 / 不安装依赖 / 不初始化 Git / 不写配置 / 不创建目录
- ✅ ❌ 不修改 Spec / Architecture / Structure / ADR / Coding / Git / WBS

---

*End of Nook Project Bootstrap Plan v1.0 — 2026-06-27 · Stage 16 · Frozen*
