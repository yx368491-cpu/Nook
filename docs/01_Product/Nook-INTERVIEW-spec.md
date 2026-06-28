# Nook · INTERVIEW-spec v1.0

> 一份面对**实现**（不是产品定位）的 spec，汇总 6 道 interview 答复 + 3 份既有 spec（Nook-DESIGN / Nook-PRODUCT / Nook-ARCHITECTURE）的全部决策。
> **目标读者**：未来要在这一份 spec 上 build Nook v1.0 的人（或 AI agent）。
> **不重复既有的设计细节**：UI tokens 见 `Nook-DESIGN.md`；产品定位/反模式见 `Nook-PRODUCT.md`；技术选型/限额见 `../02_Architecture/Nook-ARCHITECTURE.md`。

---

## 0. 一句话定义

**Nook v1.0 = 一个静态前端 + Supabase 后端 + 邀请制"小型私人聊天 SPA"**。
- 4 个群 × 每人上限 8 人（实际社交目标：20 人以内）。
- 30 天 TTL 一体适用（文字 + 图片 + 文件）。
- 默认首字母头像 + 注册时零上传。
- 自动 1:1 与 owner 作为新朋友加入时的起步态。
- **无系统级推送**：纯靠打开页面 + 应用内 unread 红点。
- Email 仅做账号 ID，密码找回靠 owner 手动重置。

---

## 1. 与其他三份文档的关系

| 文档 | 边界 |
|---|---|
| `Nook-DESIGN.md` | UI tokens / 间距 / 阴影 / 动画 / 字体细节。本 spec 不重写这些，只**引用**。 |
| `Nook-PRODUCT.md` | 定位 / 反模式 / 功能分级。本 spec 在它的基础上加 **6 个明确数字 + 6 个明确流程**。 |
| `../02_Architecture/Nook-ARCHITECTURE.md` | 技术栈选型 / Postgres schema / 部署 / 限额 / CI。本 spec 在它的基础上 **不发明新选型**，只把 spec 当 "填写完整字段"的层级。 |

> 本 spec 是**实现者最先打开、最后打开的同一份文件**。

---

## 2. v1.0 Must Have 功能清单（基于 Interview 后的实际收敛）

### 2.1 用户 / 账号 / 邀请

| Code | 功能 | 来源 |
|---|---|---|
| AUTH-1 | Owner 注册（Email + Password） | Nook-PRODUCT M9 |
| AUTH-2 | Owner 登录 | Nook-PRODUCT M9 |
| AUTH-3 | Owner 创建 invite token（24 h 过期，可绑定到具体会话或通用） | Nook-PRODUCT M9 |
| AUTH-4 | Friend 通过 invite link 进入注册页 | Nook-PRODUCT M9 |
| AUTH-5 | Friend 通过 invite 注册（Email + Password，**无邮箱验证邮件**） | Interview Q6 |
| AUTH-6 | 注册成功后**自动创建与 owner 的 1:1 会话** | Interview Q3 |
| AUTH-7 | Owner 在 admin 后台重置 friend 密码（**手动**，无邮件） | Interview Q6 |
| AUTH-8 | 任意 user 修改自己的 display name | Nook-PRODUCT M1 衍生 |
| AUTH-9 | 任意 user 上传/替换自己的头像（可选；默认首字母圆） | Interview Q2 |

### 2.2 会话

| Code | 功能 | 来源 |
|---|---|---|
| CONV-1 | 1:1 会话（"name=null"，UI 上用对方 display_name） | Nook-PRODUCT M2 |
| CONV-2 | 群会话（name 可选，1 个或多个 owner 创建） | Nook-PRODUCT M2 |
| CONV-3 | **群数硬上限 = 4** | Nook-PRODUCT M2 |
| CONV-4 | **每群成员硬上限 = 8** | Interview Q5 |
| CONV-5 | 侧栏排序 = 最近消息时间倒序（无钉选 / 无字母序） | Nook-PRODUCT 反模式 |
| CONV-6 | 群只能由 owner 创建；已存在 4 个时拒绝创建 | Nook-PRODUCT 反管理者 |
| CONV-7 | Owner 可邀请朋友加入某个群（在 settings / 群 detail 里） | Nook-PRODUCT M2 衍生 |

### 2.3 消息

| Code | 功能 | 来源 |
|---|---|---|
| MSG-1 | 发送/接收纯文字 | Nook-PRODUCT M1 |
| MSG-2 | 发送/接收单张图片（原图，超 2560px 客户端压缩到 2560×2560，WebP 输出） | Nook-PRODUCT M7 + 架构 2.10 |
| MSG-3 | 发送/接收单个大文件（≤ 50 MB） | Nook-PRODUCT M8 |
| MSG-4 | 引用/回复（消息卡片在 composer 上方 surface-2） | Nook-PRODUCT M4 + DESIGN 7.3 |
| MSG-5 | 编辑消息（2 分钟内，含 `(edited)` 标记） | Nook-PRODUCT S3 |
| MSG-6 | 撤回消息（**软撤回**：UI 上显示"已撤回"，DB 仍存 record） | Nook-PRODUCT M5 |
| MSG-7 | 删除消息（本地） | Nook-PRODUCT M6 |
| MSG-8 | Typing 指示器（Realtime Presence，三点降速 120 ms 错落） | Nook-PRODUCT M3 + DESIGN 9.4 |
| MSG-9 | **30 天统一 TTL**（文字、图片、文件）到点硬删（pg_cron） | **Interview Q1** |
| MSG-10 | 6 emoji 反应（👍❤️😂👀🔥🙏）枚举，限后端校验 | Nook-PRODUCT S2 |
| MSG-11 | **无已读回执**（永不实现） | Nook-PRODUCT 反模式 |
| MSG-12 | **无语音消息**（永不实现） | Nook-PRODUCT 反模式 |
| MSG-13 | **无视频/语音通话**（永不实现） | Nook-PRODUCT 反模式 |

### 2.4 附件 / 媒体

| Code | 功能 | 来源 |
|---|---|---|
| MEDIA-1 | 上传图片：客户端 canvas 压缩到 2560×2560 / WebP q=0.78；> 2 MB 强制 q=0.6 | 架构 2.10 |
| MEDIA-2 | 上传文件（≤ 50 MB）：原样二进制上传到 Supabase Storage | 架构 2.6 |
| MEDIA-3 | **图片原图 EXIF 全部 strip**（位置、设备、相机信息） | **加：Interview 衍生** |
| MEDIA-4 | 图片预览：圆角 12 px，与气泡几何一致 | DESIGN 8.6 |
| MEDIA-5 | 文件预览：圆角 8 px 卡片 + 文件名 + 大小 + 下载按钮 | DESIGN 衍生 |
| MEDIA-6 | 失败重传：客户端 IndexedDB outbox 队列 + Service Worker background sync | 架构 2.9 |

### 2.5 状态 / 在线

| Code | 功能 | 来源 |
|---|---|---|
| ST-1 | Ambient 在线状态（侧栏朋友旁 6 px lavender blue 呼吸光点） | Nook-PRODUCT S1 + DESIGN 9.5 |
| ST-2 | **Typing 三点降速动画**（颜色 --ink-muted，4 px 半径） | Nook-PRODUCT M3 + DESIGN 9.4 |
| ST-3 | 离线状态视觉（subtle 文字颜色，无装饰） | 衍生 |
| ST-4 | **无"最后在线时间"（永不实现）** | 加：Interview 反模式 |
| ST-5 | **无隐身模式（永不实现）** | 加：Interview 反模式 |

### 2.6 通知

| Code | 功能 | 来源 |
|---|---|---|
| NOTIF-1 | **应用内 unread 红点指示**（基于 Realtime + 后端每次 fetch） | **Interview Q4** |
| NOTIF-2 | **无 Web Push / 系统级通知 / 邮件通知** | **Interview Q4** |
| NOTIF-3 | iOS Safari PWA 在后台失联后，回到前台时**自动同步未读** | Interview Q4 衍生 |
| NOTIF-4 | Tab title 显示未读数（`[N] Nook` 格式） | 衍生 |

### 2.7 隐私 / 安全

| Code | 功能 | 来源 |
|---|---|---|
| SEC-1 | Email 不显示给其他朋友（UI 上只显示 display_name） | 隐私默认 |
| SEC-2 | 邀请 token 一次性使用（use_at 设置后失效） | Nook-PRODUCT M9 |
| SEC-3 | Invite token 在 24 小时后过期 | 架构默认 |
| SEC-4 | Supabase RLS 全表启用 + 至少每表 1 条 SELECT policy | 架构 2.3 |
| SEC-5 | Owner admin 后台：列朋友 / 重置密码 / 看会话数 / 看 SQL 状态（**仅 owner**） | **Interview Q6 衍生** |
| SEC-6 | Friend-only access：未认证用户访问任何页面跳转 login | 默认 |
| SEC-7 | **朋友删除账号**（必须由 owner 操作）：保留其历史消息但显示"已离开"占位 | **加：Interview 衍生** |

### 2.8 UI / 响应式

| Code | 功能 | 来源 |
|---|---|---|
| UI-1 | PC（≥ 1024 px）：侧栏 320 px + 聊天窗口 960 px 居中 | DESIGN 4.3 |
| UI-2 | 窄屏（< 1024 px）：单栏 + 推入抽屉 | DESIGN 5.2 |
| UI-3 | 触达目标 ≥ 44 px | DESIGN 10.1 |
| UI-4 | PWA：manifest.json + Service Worker + 可安装 | 架构 2.1 |
| UI-5 | 字体：Inter WOFF2 自托管（**绝不走 Google Fonts CDN**） | 架构 § 7 |
| UI-6 | 强制深色（无 light mode 切换） | DESIGN N9 |
| UI-7 | 减动效偏好（prefers-reduced-motion）必须尊重 | DESIGN 9.6 |

### 2.9 国际化

| Code | 功能 | 来源 |
|---|---|---|
| I18N-1 | 默认中文（zh-CN），自动回落 en | 衍生 |
| I18N-2 | 用户在设置里切换语言，存 localStorage | 架构 2.7 |
| I18N-3 | 消息内容不做翻译（用户输入原文） | 默认 |
| I18N-4 | ICU MessageFormat（支持复数 / 变量） | 架构 2.7 |

---

## 3. 数据模型（Postgres Schema，完整字段）

> 下列 schema 与 `../02_Architecture/Nook-ARCHITECTURE.md` § 3 一致，但**新增**几个 Interview 衍生字段（加粗标注）。



```sql
-- 0. 启用扩展
create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";   -- Supabase 支持

-- 1. profiles（与 auth.users 1:1）
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 40),
  avatar_url text,                       -- **加：nullable；null 时前端渲染首字母圆头像**
  role text not null default 'friend',   -- **加：'owner' 或 'friend'，决定 admin 后台能否看到**
  created_at timestamptz default now()
);

-- 2. invites
create type invite_target_kind as enum ('conversation', 'any');

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  token text unique not null default encode(gen_random_bytes(24), 'hex'),
  created_by uuid not null references public.profiles(id),
  target_kind invite_target_kind not null,    -- 'conversation' (加入指定群) 或 'any' (★ 之后自动 1:1 with owner)
  target_conversation_id uuid references public.conversations(id),
  expires_at timestamptz not null default (now() + '24 hours'),
  used_by uuid references public.profiles(id),
  used_at timestamptz,
  created_at timestamptz default now()
);

create index invites_token_idx on public.invites(token);
create index invites_unused_idx on public.invites(expires_at) where used_at is null;

-- 3. conversations
create type conversation_kind as enum ('one_to_one', 'group');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind conversation_kind not null,
  name text,                              -- 1:1 时为 null；群组时可能为 null（用户未取名）
  avatar_url text,                        -- **加：群可选；缺省渲染首字母**
  created_by uuid not null references public.profiles(id),
  created_at timestamptz default now()
);

-- **加：** 4 个群上限由 owner 实现（业务约束），DB 不显式约束。
-- **加：** 每群 8 人上限由 conversation_members 触发器在 INSERT 时校验。

create or replace function check_group_member_limit()
returns trigger language plpgsql as $$
declare
  members_count int;
  conv_kind conversation_kind;
begin
  select kind into conv_kind from public.conversations where id = NEW.conversation_id;
  if conv_kind = 'group' then
    select count(*) into members_count from public.conversation_members where conversation_id = NEW.conversation_id;
    if members_count >= 8 then
      raise exception 'group_at_capacity_8';
    end if;
  end if;
  return NEW;
end;
$$;

create trigger conversation_members_insert
  before insert on public.conversation_members
  for each row execute function check_group_member_limit();

-- 4. conversation_members
create type member_role as enum ('owner', 'member');

create table public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role member_role not null default 'member',
  joined_at timestamptz default now(),
  -- **加：** 朋友被 owner 删除账号时，软标记离开（仍保留其历史消息）
  left_at timestamptz,                    -- **加：nullable；同时 conversations 还能查到他发了什么**
  primary key (conversation_id, user_id)
);

-- 5. messages
create type message_kind as enum ('text', 'image', 'file');

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text,                              -- text 用；非 text 消息时 null
  kind message_kind not null default 'text',
  attachment_id uuid references public.attachments(id),
  reply_to_id uuid references public.messages(id) on delete set null,
  edited_at timestamptz,
  recalled_at timestamptz,                -- 软撤回
  -- **加：** 30 天统一 TTL 在 pg_cron 实现；不显式列。
  created_at timestamptz default now()
);

create index messages_conv_created_idx on public.messages(conversation_id, created_at desc);
create index messages_sender_idx on public.messages(sender_id, created_at desc);

-- 6. attachments
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,             -- Supabase Storage 内部路径
  mime text not null,
  size_bytes bigint not null,
  width int, height int,                  -- 图片才有
  original_name text,
  -- **加：** EXIF strip 由客户端完成；DB 不存原始元数据隐私（默认防御）
  created_at timestamptz default now()
);

-- 7. reactions（限 6 个底层系统 emoji）
create type reaction_emoji as enum ('👍','❤️','😂','👀','🔥','🙏');

create table public.reactions (
  message_id uuid references public.messages(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  emoji reaction_emoji not null,
  created_at timestamptz default now(),
  primary key (message_id, user_id, emoji)
);

-- 8. **加：** typing_indicators — **不存表**，用 Supabase Realtime Presence
```



### 3.1 RLS 策略（每表 SELECT/INSERT/UPDATE/DELETE 各一条）

> 全部表启用 RLS，且至少每条命令（SELECT/INSERT/UPDATE/DELETE）有专门 policy。

| 表 | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| profiles | 自己 + 同一会话的成员 | self (via trigger) | self | self |
| invites | created_by 自己 OR owner | created_by 自己 | created_by 自己 | — |
| conversations | 成员可见 | owner-only | members (rename) | owner-only |
| conversation_members | 同一会话的成员 | 群 owner 加入 | — | owner-only kick |
| messages | members of conversation | members with sender_id=self | sender_id=self (2 min) | sender_id=self |
| attachments | members via messages.conversation_id | sender only | — | sender only |
| reactions | members via messages.conversation_id | self | — | self |

### 3.2 pg_cron 任务



```sql
-- 每日 03:00 跑清理：30 天前所有消息 + 关联附件 + 关联 storage 对象
select cron.schedule(
  'cleanup-30d-mesages',
  '0 3 * * *',
  $$
  with old as (
    delete from public.messages
    where created_at < now() - interval '30 days'
    returning attachment_id
  )
  delete from public.storage.objects
  where name in (select storage_path from public.attachments where id in (select attachment_id from old));
  $$
);

-- 每日 04:00 清理已用 / 过期 invite
select cron.schedule(
  'cleanup-invites',
  '0 4 * * *',
  $$ delete from public.invites where (used_at is not null and used_at < now() - interval '1 day') or (expires_at < now()); $$
);
```



---

## 4. 6 大流程时序（实现级）

### 4.1 【Owner 注册】(一次性)



```
1. 访问 https://nook.app/
2. UI 显示"创建你的 Nook"：输入 Email + Password（两次密码确认）
3. POST Supabase Auth signUp
   → profiles row 自动 trigger 写入，role='owner'
4. 跳转 /home ：空状态（无会话）
5. UI 引导："创建你的第一个 1:1 链接，发给你想邀请的朋友"
   → Owner 点击"创建 1:1 邀请" → 触发 INVITE 创建
```



### 4.2 【Owner 创建邀请并发出】



```
1. Owner 在 /invite/new 页：
   - 选择目标：默认 "any"（自动 1:1）；可选"指定群"
   - 点击创建
2. INSERT invites (target_kind, target_conversation_id=可选)
3. UI 复制 https://nook.app/invite/<token> 到剪贴板
4. Owner 用微信粘给朋友（自带朋友圈外的渠道）
```



### 4.3 【Friend 加入】(第一次落地)



```
1. 朋友打开 https://nook.app/invite/<token>
2. UI 拉 GET /api/invites/:token（验证未过期、未使用）
3. 显示邀请人（owner）的 display_name + 头像 + 欢迎语
4. 输入 Email + Password → 注册
5. POST Supabase Auth signUp → 触发 profiles INSERT
6. （★Interview Q3）服务端检查：invite.target_kind = 'any' 或 'conversation'：
   - 'any' → 后端自动创建 1:1 conversation（owner + friend）
   - 'conversation' → 把 friend 加入 invites.target_conversation_id
7. 标记 invite.used_by / used_at
8. 重定向 /home，自动 hover 进刚加的会话（如果 1:1）
```



### 4.4 【发送消息】



```
1. Composer 输入文字（Zustand: draft=string, hasContent=true）
2. Realtime channel('presence:conversation_id', 'peer_A').track({ typing: true })
   → 其他人 saw typing 三点
3. 按 Enter（或点击 send icon）：
   a. mutationFn: insert message(reply_to_id?, body)
   b. mutation onSuccess: 清空 composer / 发布 typing=false
   c. 服务端 Realtime broadcast → 自己 + 其他人看到
4. 失败 → 进 IndexedDB outbox，UI 标"未送达"+ 黄点
```



### 4.5 【图片发送】



```
1. 用户拖拽图片到 composer / 点击附件 icon
2. 客户端：
   a. File → createImageBitmap
   b. canvas 缩放 max 2560 px，toBlob('image/webp', 0.78)
   c. 若 size > 2 MB → 二次 q=0.6
   d. EXIF strip（客户端读取元数据但不上传，仅上传像素）
3. 拿到 Blob → POST Supabase Storage 直传（signed URL）
4. attachments INSERT (storage_path, mime, size, width, height)
5. messages INSERT (kind='image', attachment_id)
6. Realtime broadcast
```



### 4.6 【30 天 TTL 自动清理】

> 已在 § 3.2 描述 pg_cron。每天 03:00 自动执行：
- 删 30 天前所有 messages
- 删对应 attachments
- 删 Supabase Storage 对象
- **不删** profile / conversation / conversation_members（这些永久保留结构）

---

## 5. v1.0 不做的事（永久不做 + v1 不做）

### 5.1 永久不做（产品硬边界）

| 不做 | 来自 |
|---|---|
| 已读回执 | Nook-PRODUCT § 2 + 2.3.5 MSG-11 |
| 语音消息 | Nook-PRODUCT § 2 + 2.3.5 MSG-12 |
| 语音 / 视频通话 | Nook-PRODUCT § 2 + 2.3.5 MSG-13 |
| 表情包商店 / Sticker | Nook-PRODUCT 永久不做 |
| 朋友圈 / 动态墙 | Nook-PRODUCT 永久不做 |
| 群公告 / 群管理工具 | Nook-PRODUCT 永久不做 |
| 白天模式 | DESIGN N9 |
| Web Push / 系统通知 | **Interview Q4** |
| 隐身模式 | **Interview 衍生（§ 2.5 ST-5）** |
| "最后在线时间" | **Interview 衍生（§ 2.5 ST-4）** |
| Email 验证邮件 / 通知邮件 | **Interview Q6** |

### 5.2 v1 不做（v1.1+ 看朋友反馈）

| Future | 来自 |
|---|---|
| 消息转发 / Pin / 星标 | Nook-PRODUCT Future F1-F4 |
| 全局搜索 | Nook-PRODUCT Future F1 |
| 链接预览 | Nook-PRODUCT Future F6 |
| 端到端（E2EE） | Nook-ARCHITECTURE v2.0 |
| Passkey 登录（WebAuthn） | Nook-ARCHITECTURE v1.1 |
| 自托管（自买 VPS） | Nook-ARCHITECTURE v2.0 |
| 数据导出（GDPR 自我所有权） | Future 衍生：v1.1 提供 |
| 多设备 session 管理 UI | Nook-PRODUCT 永久不做（哲学） |

---

## 6. v1.0 验收清单（Acceptance Criteria）

> 这是 v1.0 完工"定义上的完成"的对照表。任何一项没完工，**不算 v1.0 shipped**。

### 6.1 必备 AA（Acceptance）

| 区域 | 验收项 |
|---|---|
| 注册 | Owner 能注册并看到 admin 引导 |
| 邀请 | Owner 能创建邀请并复制链接 |
| 加入 | Friend 点开邀请 → 注册 → 自动进与 owner 的 1:1 |
| 1:1 文字 | 双方能发文字消息，互见实时 |
| Typing | 对方打字时自己看得到三点 |
| 引用 | 选中某消息 → 引用 → composer 浮出预览 → 发送 → 消息下方显示引用源 |
| 编辑 / 撤回 | 2 分钟内能改；能撤回；对方看到"（已编辑）"或"已撤回" |
| 图片 | 单张原图，客户端 2560 px 压缩 strip EXIF；上传到 Supabase Storage；显示 |
| 文件 | 单文件 ≤ 50 MB；下载链接 |
| Reactions | 6 emoji 任选；同一人重复同一 emoji 自动去重 |
| 在线状态 | 朋友头像旁呼吸光点（仅在线时显示） |
| Unread | 离开会话 → 对方发消息 → 回到侧栏 → 该会话有未读小红点；Tab title `[N] Nook` |
| 自托管头像 | 用户能在设置页上传头像；下次显示新头像；删除头像 → 退回首字母 |
| 群聊 | Owner 创建群（最多 4 个）；邀请朋友加入（每群最多 8 人）；超额服务端拒绝 |
| 持久化 | 跨端：PC 发消息，手机 PWA 重连后能拉到 |
| 离线 | 断网时发送 → 进 outbox；网络恢复自动同步 |
| 30 天 TTL | 手动验证：把消息 created_at 调到 31 天前，第二天 pg_cron 自动清理 |
| 密码重置 | Owner 在 admin 后台给 friend 重置密码；friend 用新密码登录成功 |
| 消息撤回删除的反 UI 行为 | 删除时 DB 还保留（软撤回）；UI 渲染"已撤回"占位 |

### 6.2 必备 NN（Non-functional）

| 区域 | 验收项 |
|---|---|
| 暗色 | 一遍所有页面，无 light mode 残留 |
| 响应式 | 在 1440 / 1024 / 768 / 375 px 4 个断点都好看（无溢出 / 缩放错乱 / 触达 < 44 px） |
| 减动效 | `prefers-reduced-motion: reduce` 时所有入场动效改为 0 ms，仍可用 |
| 字符渲染 | Inter 永远自托管（断网也能看） |
| Console | 浏览器 console 无 error（warning 仅 Sentry 配置无关时可接受） |
| Sentry | 服务端接入；消息内容 / email 不入 Sentry |
| CI | GitHub Actions：typecheck + lint + test 全绿 |
| Deploy | Push main → 40 秒内 Cloudflare Pages 部署完成 |
| 性能 | 首屏 LCP ≤ 1.5 s（CF Pages 边缘） |
| 限额预警 | Supabase DB / Storage 占用率 < 50% |

---

## 7. v1.0 实施任务分解（来自 Interview 后的真实收敛）

> 这是给 Nook 的 **3 个 Sprint** 拆分，每个 Sprint 约 1 周个人工作量。

### Sprint 1（搭建骨架）

- 项目脚手架：React 18 + Vite + TS + Tailwind + Radix UI + Zustand + TanStack Query
- 字体自托管：Inter WOFF2 + JetBrains Mono WOFF2（不放 Google CDN）
- Supabase 项目：建环境 + .env.local 范本
- DB migrations：0001_init.sql（含 8 个表、RLS、pg_cron）
- 部署：CF Pages 自动部署设置 + custom domain 占位
- CI：GitHub Actions（typecheck + lint + Vitest）

### Sprint 2（核心 chat）

- UI 实现（Nook-DESIGN tokens）
  - 侧栏 + 聊天窗口 + composer + 气泡
- 邀请注册流程（Owner + Friend）
- 自动 1:1 创建（Interview Q3）
- 文字消息收发 + 引用 + 编辑 + 撤回
- Typing 指示器（Realtime Presence）
- 离线 outbox（IndexedDB + SW）
- 在 Supabase 上跑通真数据

### Sprint 3（媒体 + 边界）

- 图片上传（客户端压缩 + EXIF strip）
- 文件上传（≤ 50 MB）
- Reactions（6 emoji 枚举）
- Ambient 在线状态（呼吸光点）
- 应用内 unread 红点（**无 Web Push**）
- 30 天 TTL pg_cron 实测
- Owner admin 后台（重置密码 + 看朋友列表）
- 验收清单走一遍

### Sprint 4（打磨 + 朋友试用）

- Polishing：所有页面 4 个断点手动走查
- Sentry 接入 + 屏蔽 email / message body
- 邀请 5 个真实朋友试跑 1 周
- v1.0 ship

---

## 8. 设计检查清单（开发期随时对照）

| 检查项 | 答案 |
|---|---|
| 默认背景 | canvas #0F1115 |
| 主色 | accent #7B85F0（极克制） |
| 信号色 | success #34D399（功能、不装饰） |
| 字体 | Inter + ss03（自托管） |
| 主字号 | 16 px / 400 / 1.55 |
| 圆角主力 | 12 px |
| 头像默认 | 首字母 50% 圆 |
| 头像可选 | 设置页面上传 |
| 凹口形状 | "飞机翼"软矩形 |
| 阴影 | 偏重（0.32–0.50 透明度） |
| 装饰 | 极少 |
| 渐变 | 禁用 |
| 动效时长 | ≤ 200 ms |
| 减动效 | 必须尊重 prefers-reduced-motion |
| 触达尺寸 | ≥ 44 px |
| 暗色默认 | 是 |
| 字体来源 | 永远自托管（不走 Google Fonts） |

---

## 9. 部署 + CI 验收清单

- Cloudflare Pages 自动部署：push main → 部署 < 60 s
- Supabase 生产项目（free tier）：DB / Storage / Realtime / Auth / Edge Functions 全部工作
- Supabase migrations 文件可重放（down + up 都跑通）
- Edge Function `cleanup-messages` + `cleanup-invites` 可手动 cron 触发
- Sentry 接入（免费层，5k error/月）
- GitHub Actions：每 PR 跑 typecheck + lint + test；main 推送自动部署
- Repo 私有不公开（v1.0 阶段）

---

## 10. v1.0 之后怎么走（伏笔）

| 触发 | v1.1+ 升级 |
|---|---|
| 朋友中有人想用 passkey | 启用 WebAuthn 跳过密码 |
| 朋友提"我想导出我的对话" | 加"导出我的对话"按钮（JSON dump） |
| Storage 接近 600 MB | 加"30 天前附件迁 R2 + 只留文字"脚本 |
| 朋友提"我担心端到端" | v2.0：客户端 E2EE + 客户端 Crypto.subtle 加密 |
| 任何朋友提"应该能做 X" | 先看 Nook-PRODUCT § 0 + 2 的**反模式清单**，再决定 |
| 任何一个朋友"溢出" 20 人的容量 | 切回群 + 微信；不让 Nook 长大 |

---

## 11. 文档使用说明

- 这是当前**最新的实现 spec**。
- 任何 dev 在动手写代码前先打开这一份。
- 任何 spec 与已存在的 Nook-DESIGN / Nook-PRODUCT / Nook-ARCHITECTURE 冲突，**以本 spec 为准**（含 Interview 后的实际收敛）。
- 本 spec 不替代另外 3 份的设计 token 与反模式清单；这两块请直接读原文件。

---

— END —
