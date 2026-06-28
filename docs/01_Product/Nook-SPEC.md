# Nook · Specification v1.0 (Live)

> **唯一可信的产品需求来源（Single Source of Truth）**。
> 后续所有设计 / 开发 / 测试 / 部署必须严格遵循本 Spec。
> 内容**仅**由以下 5 份已确认的源文档归纳而成（不发明新需求）：
> 1. `Nook-DESIGN.md`（视觉 + tokens + 动效）
> 2. `Nook-PRODUCT.md`（产品定位 + 反模式 + 功能分级）
> 3. `../02_Architecture/Nook-ARCHITECTURE.md`（技术选型 + 限额）
> 4. `Nook-INTERVIEW-spec.md`（6 道 Interview 决定）
> 5. `prompt/components/*.spec.md`（4 个原子组件的 React API）

---

## 0. 元规则 · 版本管理与权威定义

### 0.1 文档性质
- 本 Spec 是「活」文档（Live spec）：不冻结，演进通过版本号追加 / 修订。
- 当前版本: **Nook v1.0**。
- 任何**与本 Spec 矛盾**的代码、组件实现、组件 .spec.md 文档 → 视为 bug，必须以本 Spec 为准。

### 0.2 引用规则
- 本 Spec **不复制** 详细 token 值 / 颜色 hex / architecture 选型。这些引用对应源文档。
- 引用采用 `[来源: 文档名 § X.Y]` 形式。

### 0.3 命名约定
- 功能 ID: `F-<DOMAIN>-<NN>`（如 `F-AUTH-01`、`F-MSG-03`）
- 业务流 ID: `BF-<NN>`
- API 能力 ID: `CAP-<NN>`
- 验收 ID: `AC.<NN>`

### 0.4 变更日志
| 日期 | 版本 | 变更 |
|---|---|---|
| 初次 | v1.0 | 基于 Interview-spec.md + 现有 4 份源文档生成（12 轮 ask_user 答案已合并） |
| 2026-06-27 | **v1.0.1** | **Docs-only patch**：同步 Stage 6 Follow-ups — FU-1（`Nook-PRODUCT.md` 删除 Web Push / 迁 M12 → NEVER N0）+ FU-2（`../02_Architecture/Nook-ARCHITECTURE.md` § 2.7 i18n 从 3 语改双语 zh-CN+en）。FU-3/FU-4 业务逻辑项依旧推迟至 v1.1+。详见 `Nook-SPEC-FREEZE-v1.0.1.md`。 |

---

## 1. 项目概述（Project Overview）

### 1.1 项目名称
- **正式产品名称**: `Nook v1.0`
- 嵌入式标识: Settings 标题、PWA manifest 的 `name` / `short_name`、`[N] Nook` Tab 标题前缀、Footer "Nook v1.0" 文字。
- [来源: § 1.1 由本 Spec Round 1 Q1 决定: "Nook v1.0"]

### 1.2 项目简介
Nook 是一个只服务"你和你的少数密友"的私人聊天网站。
它不是产品、不是工具、不是社区、不是另一个微信。
是「深夜书房」——屏蔽整个互联网社交噪音、与外界隔绝的一间小房间。
[来源: Nook-PRODUCT.md § 0 / § 3.1]

### 1.3 产品定位
> **"少数密友的数字避难所"**（A Digital Sanctuary）

- 没有商业目的（不规模化、不商业化、不上市）。
- 跨端（PC + 移动）但**不等同** 24 小时在线；跨端是为了让对话像水般无缝延续。
- 不与微信/Discord/Telegram 比功能完整度；比的是"信号噪声比"。
[来源: Nook-PRODUCT.md § 3.1]

### 1.4 核心价值
> **零噪音的信息获取权。**
弹出的每一条消息都**绝对**是你关心的。
没有订阅号 / 群发助手 / 推送营销 / 机器人提醒 / 广告。
没有"已读"压力，没有"看起来很忙"的状态表演。
**100% 信噪比。**
[来源: Nook-PRODUCT.md § 3.3]

### 1.5 目标用户

#### 1.5.1 主要用户画像

| 用户层 | 人数 | 描述 |
|---|---|---|
| **Owner**（产品发起人） | 1 | 注册 Nook 的人；永远是系统中唯一的 Owner。 |
| **好友（Friends）** | 5–15 | 邀请进来的少数密友。 |
| **总人数上限（社交）** | ≤ 20 | 一旦超过建议主动切回微信群，不让 Nook 长大。 |

- 共同的画像假设：20 岁左右；UI/设计敏感；偏好简短私人表达；对"朋友圈"感到疲劳。
[来源: Nook-PRODUCT.md § 3.4 + INTERVIEW § 0]

#### 1.5.2 反画像（不该成为 Nook 用户的）
- ❌ 无法忍受纯文字的人
- ❌ 期待语音/视频通话的人
- ❌ 习惯"+@所有人"的强势表达者
- ❌ 把 Nook 当作"备份微信"的人
[来源: Nook-PRODUCT.md § 3.4]

### 1.6 使用场景（Use Cases）

| ID | 场景 | 体量 | 释义 |
|---|---|---|---|
| UC-A | 深夜无感灌水 (Late-night Banter) | 高频 | 凌晨场景，绕开微信的 50 个未读，直接对 Few 朋友发想说的话。 |
| UC-B | 高清原图流 (High-fidelity Sharing) | 中频 | 聚会后原图一张一张发，附简短文字点评。 |
| UC-C | 赛博陪伴 (Ambient Co-presence) | **灵魂** | 几天不说话也能打开 Nook，看到"他们都在这条流里"的事实本身。 |

[来源: Nook-PRODUCT.md § 3.5]

**反参照（边界场景）**：❌ 群体投票 / ❌ 临时陌生人 / ❌ 工作汇报 → 切回专门的工具。

### 1.7 产品边界（Scope Boundaries）

#### 1.7.1 ✅ 在边界内（v1.x 永久做）
- 1:1 / 多人**纯文字**聊天
- **单张**原图、原文件分享（高保真、无压缩，文件 ≤ 50 MB）
- 6 emoji 反应（`👍 ❤️ 😂 👀 🔥 🙏`，后端枚举）
- 消息回复 / 撤回 / 删除 / 编辑（限 2 分钟）
- Typing 指示器（灵魂）
- Ambient 在线状态（呼吸光点）
- **全端同步**（PC + 移动）
- **30 天消息自动清理**（文字 + 图片 + 文件 一体）
- Invite-only 邀请制（唯一入口）
[来源: Nook-PRODUCT.md § 3.6 + INTERVIEW § 0/§ 2/§ 5.1]

#### 1.7.2 ❌ 永久不在边界内（Never-Do / Hard Boundaries）
- 已读回执
- 语音消息 / 语音通话 / 视频通话
- Sticker Market / 表情包商店
- 朋友圈 / 动态墙 / 个人主页
- 群公告 / 群待办 / 群管理工具
- 加好友二维码 / 通讯录导入
- 多设备登录管理 / 设备列表
- 红包 / 支付
- 白天模式 / 换肤（含 light mode 切换）
- Web Push / 系统通知 / 邮件通知
- Email 验证邮件 / Email 通知邮件
- 隐身模式
- "最后在线时间"显示
[来源: Nook-PRODUCT.md § 2 + INTERVIEW § 5.1]

#### 1.7.3 🟡 v1.1+ 视反馈决定（Future）
- 全局搜索
- 消息转发 / Pin / 星标
- 链接预览（默认关闭）
- 端到端加密（E2EE）
- Passkey 登录（WebAuthn）
- 自托管（自家 VPS）
- 数据导出（GDPR 自我所有权）
- 原生 iOS/Android 壳
[来源: Nook-PRODUCT.md § 3.6 待定 + INTERVIEW § 5.2 + ARCH § 9]

### 1.8 MVP 范围（v1.0）

| 项 | 值 | 来源 |
|---|---|---|
| 最大群数（硬上限） | **4** | INTERVIEW § 2.2 CONV-3 + Round-1 Q3 (硬上限确认) |
| 每群成员上限 | **8** | INTERVIEW § 2.2 CONV-4 |
| 社交目标总人数 | ≤ 20 | Nook-PRODUCT § 6 |
| 30 天 TTL 适用 | 文字 + **图片** + **文件**（一体） | INTERVIEW § 2.3 MSG-9 + § 2.4 + Round-2 Q8（不提供"先存本机"赖皮按钮）|
| 默认头像 | 首字母圆（注册时**零**上传） | INTERVIEW § 2.1 AUTH-9 + Q2 |
| Friend 加入起步态 | 自动 1:1（与 Owner）| INTERVIEW § 2.1 AUTH-6 + Q3 |
| 系统通知 | **完全不要**（纯应用内未读小红点） | INTERVIEW § 2.6 + Q4 |
| Password reset | **不发邮件**；Owner 在 admin 后台**手动重置** | INTERVIEW § 2.1 AUTH-7 + Q6 |
| Email 用途 | **仅做账号 ID**，不显示给其他朋友 | INTERVIEW § 2.7 SEC-1 + Q6 |
| 浏览器支持 | 现代 Evergreen（无版本下限）| Round-3 Q1 |
| i18n v1.0 | **zh-CN + en 双语** | Round-3 Q2 + INTERVIEW § 2.9 |

### 1.9 后续版本路线图（Roadmap）

| 版本 | 节拍 | 主要目标 |
|---|---|---|
| **v1.0**（本文档） | 4–6 周个人 MVP | 5 个朋友"进得来、发得出、看得见" |
| **v1.1** | 2–3 周灵魂打磨 | Ambient 在线状态 · 6 emoji 反应 · Typing 动画精修 · Sentry 收口 |
| **v1.2** | 2–3 周容器升级 | 编辑 `（edited）` · 时间分组 · 应用内未读文案 · 断网重连 status light |
| **v2.0** | 视需求 | E2EE 端到端 + Client Crypto.subtle + 可选自托管 Supabase + 原生 App 壳 |

[来源: Nook-PRODUCT.md § 5 + ../02_Architecture/Nook-ARCHITECTURE.md § 9]

---

## 2. 功能需求（Functional Requirements）

> 全部 9 个功能域，**禁止遗漏 INTERVIEW-spec § 2 中任何一项**。每项按 SPEC.txt § 2 字段展开。

### 2.1 AUTH 域 — 用户 / 账号 / 邀请

#### F-AUTH-01 · Owner 注册
- **功能描述**: 通过 email + password 创建 Nook 第一个账号；发起 Nook 的"打开"
- **用户目标**: 拥有自己的 Nook 实例
- **前置条件**: 系统尚无 Owner
- **主流程**: 输入 email + password（两次确认）→ POST Supabase Auth signUp → profiles 自动写入 **role='owner'**（强制初始值）→ 跳 `/home` → UI 空状态 → 引导创建第一个 invite
- **异常流程**: E1 email 已注册 → 红字提示；E2 密码不一致 / 长度 < 8 → 表单内联错误；E3 网络抖动 → 失败可重试
- **成功条件**: profiles row(role='owner') 创建；JWT 设置；跳 `/home`
- **失败条件**: profile 写入失败 → 留在 `/welcome` 显示 toast
- **优先级**: **Must**（INTERVIEW § 2.1 AUTH-1）
- **关联验收**: AC.01

#### F-AUTH-02 · Owner 登录
- **用户目标**: 已注册的 Owner 重新打开 Nook
- **前置条件**: 注册过、当前未登录
- **主流程**: `/login` 输入 email + password → POST signInWithPassword → `/home`
- **异常流程**: 错密码 → 统一返回"凭证错误"（不区分用户/密码）；网络挂 → 失败重试
- **成功条件**: JWT 设置 + 跳 `/home`
- **失败条件**: 留在 `/login`
- **优先级**: **Must**（AUTH-2）
- **关联**: AC.01

#### F-AUTH-03 · Owner 创建 Invite (target=any)
- **用户目标**: 把朋友拉进 Nook，并自动建立与 owner 的 1:1
- **前置条件**: 已登录为 Owner
- **主流程**: `/invite/new` 选"默认（自动 1:1）" → INSERT invites(target_kind='any') → URL `https://nook.app/invite/<token>` 复制到剪贴板
- **异常流程**: 复制失败 → 手动显示链接文本 + 重试按钮
- **成功条件**: invites row 写入；token URL 浏览器剪贴板可粘贴
- **失败条件**: 留在页面显示错误
- **优先级**: **Must**（AUTH-3 + AUTH-6 的入口）
- **关联**: AC.02

#### F-AUTH-04 · Owner 创建 Invite (target=conversation)
- **用户目标**: 把新朋友直接拉进某个已存在的群（不创建 1:1）
- **前置条件**: Owner 已登录；目标群未满 8 人（CONV-4）
- **主流程**: 选"指定群" → 选择 group → INSERT invites(target_kind='conversation', target_conversation_id=X) → 复制链接
- **异常流程**: 目标群已满 8 人 → 按钮显示 disabled 并 hover-tooltip "该群已满 8 人"
- **成功条件**: invites row 写入
- **失败条件**: 服务拒绝 → toast 错误
- **优先级**: **Must**（AUTH-3 + AUTH-4 + CONV-4）
- **关联**: AC.02 / AC.14

#### F-AUTH-05 · Friend 通过 Invite 注册落页
- **用户目标**: 加入 Nook
- **前置条件**: token 未过期（24h）且未使用
- **主流程**: 点开 `https://nook.app/invite/<token>` → UI 拉 GET/查询 invite 详情（验证：未过期、未用、被邀请人的存在）→ 显示邀请人（Owner）display_name + 头像 + 「欢迎来到 Nook」文案 → 输入 email + password（无邮箱验证邮件）→ POST Supabase Auth signUp → profiles INSERT role='friend'
- **异常流程**: E1 token 过期 / 已用 → 404 页；E2 邀请人 (Owner) 账号已删除 → 404；E3 网络抖动 → 重试
- **成功条件**: 注册成功；服务端根据 invite.target_kind 进行下一步（F-AUTH-06 或 F-AUTH-07）
- **失败条件**: 落页 404 不允许继续
- **优先级**: **Must**（AUTH-4 + AUTH-5）
- **关联**: AC.03

#### F-AUTH-06 · Friend 注册后自动 1:1 with Owner (★灵魂)
- **用户目标**: 第一步就能跟发起人聊，不需要任何"我已被加入 Nook"提示窗
- **前置条件**: invite.target_kind = 'any'
- **主流程**: 服务端检查 → INSERT conversations(kind='one_to_one', name=null) + INSERT conversation_members(owner, friend) → 标 invite.used_by/used_at → 跳转 `/home` 并**自动 hover 进刚加入的 1:1**
- **异常流程**: 极端 case — Owner 已被 self-delete → 自动改为"加入失败"提示，不创会话
- **成功条件**: 1:1 会话可见，owner 侧栏出现该朋友；服务端邀请标记 used_at
- **失败条件**: 落错误页或回 invite 页
- **优先级**: **Must**（INTERVIEW Q3 决定的关键功能）

#### F-AUTH-07 · Owner 重置 Friend 密码 (admin)
- **用户目标**: 朋友忘记密码时恢复访问
- **前置条件**: Friend 账号存在
- **主流程**: `/settings/admin` → 选 friend → 弹 modal "重置密码" → 输入新密码 + 双确认 → 调用 supabase.auth.admin.updateUserById → UI 显示 "重置成功"，朋友下次用新密码登录
- **异常流程**: 新密码强度 < 8 → 表单错误；服务端拒绝 → toast
- **成功条件**: friend 可用新密码登录
- **失败条件 / 副作用**: 无邮件通知；不修改 left_at
- **优先级**: **Must**（AUTH-7 + INTERVIEW Q6）
- **关联**: AC.16

#### F-AUTH-08 · 修改自己 Display Name
- **用户目标**: 修改自己显示名
- **前置条件**: 已登录
- **主流程**: `/settings/profile` → 输入新 name（1–40 字符）→ 保存 → UI 立即更新（自己 + 其他人会话侧栏 + 头像旁初始化计算）
- **异常流程**: 空 / 超长 → 内联错误
- **成功条件**: profiles.display_name 已更新；每隔页面已 reactive
- **优先级**: **Must**（AUTH-8）
- **关联**: AC.06

#### F-AUTH-09 · 上传 / 替换 / 删除 自己头像
- **用户目标**: 用真实的头像代替默认首字母
- **前置条件**: 已登录
- **主流程**: `/settings/profile` → 上传（≤ 5 MB 单图，客户端压缩）→ 客户端 EXIF strip → 直传 Supabase Storage → profiles.avatar_url 写入 → 全端 reactive 更新；删除头像 → profiles.avatar_url=NULL → 退回首字母占位
- **异常流程**: 文件 ≥ 5 MB → 拒绝上传；非图像 MIME → 拒绝
- **成功条件**: 自己 + 其他朋友看到新头像
- **优先级**: **Must**（AUTH-9 + INTERVIEW Q2 "可后补上传"）
- **关联**: AC.13

#### F-AUTH-10 · 修改 UI 语言 (zh-CN / en)
- **用户目标**: 切换界面语言
- **前置条件**: 已登录
- **主流程**: `/settings/profile` 选择 `zh-CN` 或 `en` → localStorage 保存 → 整页 i18n 切换；好友之间的"显示名"不翻译，但 UI 文案翻译
- **优先级**: **Must**（I18N-2）
- **关联**: AC.AC.i18n

### 2.2 CONV 域 — 会话

#### F-CONV-01 · 列出所有 accessible 会话（侧栏）
- **用户目标**: 看到自己当前所有 1:1 + 群
- **前置条件**: 已登录
- **主流程**: `/home` → 侧栏 SELECT conversations JOIN conversation_members WHERE user_id=auth.uid() → 按 `MAX(messages.created_at) DESC` 倒序（CONV-5 不允许字母序）
- **异常流程**: 无会话 → 空状态插画 + 「去 `/invite/new`？」或「等朋友加你」
- **优先级**: **Must**（CONV-5 + 视觉规范 DESIGN § 6）

#### F-CONV-02 · Owner 创建新群
- **用户目标**: 创建 1 个新群
- **前置条件**: 当前群数 < 4（**硬上限**，DB + UI 双重拦截）
- **主流程**: `/invite/new-group` 选模式 "新群" → 输入群名（可空，UI 暂用首字母）→ Owner 直接进群 → 可继续邀请（按 F-AUTH-04）
- **异常流程**: 已达 4 群上限 → UI 按钮 disabled + 提示 "Nook 已达 4 群上限，请先合并"
- **成功条件**: conversations row 写入；conversation_members(role='owner') 写入
- **失败条件**: 服务拒绝 → toast
- **优先级**: **Must**（CONV-2 + CONV-3 + CONV-6 + Round-1 Q3 确认硬上限）

#### F-CONV-03 · 拉取某会话的消息列表
- **用户目标**: 打开会话看到历史+最新
- **主流程**: TanStack Query 拉最近 50 条（按 created_at DESC）→ Realtime 订阅新消息 → IndexedDB (Dexie) 缓存近 1000 条
- **优先级**: **Must**（基础）

#### F-CONV-04 · 重命名群 (owner only)
- **用户目标**: 修改群名
- **前置条件**: Owner 是该群成员
- **主流程**: `/group/:id/settings` → 输入新名（≤ 40 字符）
- **优先级**: **Should**（默认）

#### F-CONV-05 · 加入群（受邀）
- **前置条件**: invite.target_kind = 'conversation'，target_conversation_id 有效
- **主流程**: 注册完成后服务端 INSERT conversation_members（role='member'）；member_count < 8 触发器允许；否则 raise exception → 客户端显示 invite 失效提示
- **优先级**: **Must**（CONV-7 + AUTH-5 + CONV-4）

### 2.3 MSG 域 — 消息

#### F-MSG-01 · 发送纯文字
- **用户目标**: 在 composer 输入文字并发送
- **前置条件**: 当前已选某会话；登录态
- **主流程**: composer 输入 → Realtime Presence.publish(typing=true) → 按 Enter（或 Send icon）→ INSERT messages(kind='text', body) → 服务端 Realtime broadcast → 自己 + 其他人 append
- **异常流程**: E1 网络断 → 进 IndexedDB outbox，重连后批量 replay；E2 服务端错误 → UI 标"发送失败" + signal-warning dot
- **成功条件**: 消息入库 + Realtime broadcast 成功
- **失败条件**: outbox pending；用户能手动重试
- **优先级**: **Must**（MSG-1）

#### F-MSG-02 · 发送单张图片
- **前置条件**: 文件 ≤ 50 MB；MIME = image/*
- **主流程**: 拖拽 / 选图 → 客户端 EXIF strip + canvas 压缩（最大 2560px / WebP q=0.78；> 2 MB 二压 q=0.6）→ 直传 Supabase Storage → INSERT attachments → INSERT messages(kind='image', attachment_id)
- **异常流程**: MIME 非 image → 拒绝；上传 > 50 MB → 拒绝
- **优先级**: **Must**（MSG-2 + MEDIA-1/2/3）

#### F-MSG-03 · 发送单文件 (≤ 50 MB)
- **前置条件**: ≤ 50 MB；MIME 不限
- **主流程**: 客户端拿 File → 直传 Supabase Storage（不压缩） → INSERT attachments（mime/size_bytes/original_name）→ INSERT messages(kind='file', attachment_id)
- **优先级**: **Must**（MSG-3 + MEDIA-2）

#### F-MSG-04 · 引用 / 回复一条消息
- **主流程**: 长按 / hover message menu → 选"回复" → composer 上方出现 surface-2 引用卡（左 2px accent线 · sender 名 · 单行 truncate 被引用消息 body）→ 用户发新消息时 INSERT messages(reply_to_id = X) → 服务端 broadcast
- **优先级**: **Must**（MSG-4 + DESIGN § 7.3）

#### F-MSG-05 · 编辑自己的消息（2 分钟守护窗）
- **主流程**: 在 2 分钟窗口内点消息 hover menu → "编辑" → inline editor → save → UPDATE messages SET body=?, edited_at=now() → UI 重新渲染，末尾加 `（edited）` 微标签
- **异常流程**: 已超过 2 分钟 → 编辑按钮 disabled
- **优先级**: **Should**（MSG-5 + ROADMAP v1.2 的 S3）

> **注**: INTERVIEW § 2.3 标 MSG-5 来源 Nook-PRODUCT S3；但 Nook-PRODUCT S3 描述为 SHOULD；INTERVIEW 在 § 2.3 标 SHOULD 也是一致的。本 Spec 保留 S 级，与 INTERVIEW 不矛盾。

#### F-MSG-06 · 撤回自己的消息（软撤回）
- **主流程**: 任意时刻点消息 hover menu → "撤回" → UPDATE messages SET recalled_at=now()（**DB row 不删**） → UI 在双方都渲染为"已撤回"占位
- **异常流程**: 服务器已硬清（30 天 TTL） → 撤回失败 UI 显示 "消息已不存在"
- **优先级**: **Must**（MSG-6）

#### F-MSG-07 · 删除自己的消息（本地）
- **用户目标**: 在自己的客户端 UI 上彻底抹去（不影响其他朋友端）
- **主流程**: hover menu → "删除" → DELETE messages WHERE id=X AND sender_id=auth.uid() → 自己客户端消失，其他朋友端**仍可见**
- **优先级**: **Must**（MSG-7，与 MSG-6 不同）

#### F-MSG-08 · Typing 指示器
- **主流程**: composer 输入时 Realtime Presence.publish({typing: true}) → 其他端 Presence.subscribe 触发 typing 三点降速动画（4 px 半径，--ink-muted 颜色，120ms 错落，DESIGN § 9.4）→ 输入停顿 / clear → Presence.publish({typing: false})
- **优先级**: **Must**（MSG-8 + 灵魂）

#### F-MSG-09 · 6 emoji 反应
- **主流程**: hover 消息 → 弹 6 个 emoji 行（限 👍❤️😂👀🔥🙏）→ 点 → INSERT reactions（去重）→ 服务器 broadcast → UI 更新计数
- **异常流程**: 后端枚举校验，非 6 个 emoji 拒绝
- **优先级**: **Should**（MSG-10 + S2）

#### F-MSG-10 · 30 天自动清理（pg_cron）
- **定时**: 每日 03:00 UTC（来源 INTERVIEW § 3.2）
- **逻辑**: DELETE messages WHERE created_at < now() - '30 days' → 关联 attachments + storage.objects 同步删除
- **不删**: profiles / conversations / conversation_members（结构永久保留）
- **优先级**: **Must**（MSG-9 + 跨附件类型 === INTERVIEW § 2.3 + § 2.4 MSG-9）
- **关联**: AC.15

#### F-MSG-11 · 列出"未读"会话
- **主流程**: 后端每次 fetch 计算 unread_count；前端轮询 + Realtime push 增量更新
- **优先级**: **Must**（NOTIF-1）
- **关联**: AC.12

### 2.4 MEDIA 域 — 附件

延续 § 2.3 F-MSG-02/03。补充以下 cross-cutting 能力。

#### F-MEDIA-01 · 失败重传 outbox
- **用户目标**: 弱网 / 离线时发送的消息不丢
- **主流程**: 网络断 → 消息进 IndexedDB outbox（带 client_msg_id + state=pending）→ 网络回 → SW background sync → 服务端 Realtime 返回来的同一条合流（按 client_msg_id dedupe）→ outbox state=delivered
- **优先级**: **Must**（MEDIA-6）
- **关联**: AC.17

### 2.5 ST 域 — 状态 / 在场

#### F-ST-01 · Ambient 在场状态
- **主流程**: Realtime Presence.track({in_session_id, online: true}) → 其他端订阅 → 渲染 6 px lavender 圆点 + 可选 pulse
- **优先级**: **Should**（S1 + ST-1）
- **关联**: AC.11

#### F-ST-02 · Tab title 未读数
- **主流程**: unread_count > 0 → `document.title = [N] Nook_v1.0`；回到 0 → 恢复 "Nook v1.0"
- **优先级**: **Must**（NOTIF-4）
- **关联**: AC.12

#### F-ST-03 · 强制深色
- **主流程**: `:root { color-scheme: dark }`；不存 light mode 切换入口
- **优先级**: **Must**（DESIGN N9 / UI-6）

### 2.6 NOTIF 域 — 通知（仅应用内）

#### F-NOTIF-01 · 应用内未读小红点
- **主流程**: 进入会话 → 该会话内有未读消息 → 侧栏 ListItem.Trailing 渲染 accent-soft-bg 圆角 chip + 数字（> 9 显示 "9+"）；点入 → 清该会话未读
- **优先级**: **Must**（NOTIF-1 + INTERVIEW Q4）
- **关联**: AC.12

#### F-NOTIF-02 · iOS Safari PWA 后台补偿
- **主流程**: PWA 在后台失联 → 用户返回前台 → 全量 reconcile（fetch unread + Realtime resync）
- **优先级**: **Must**（NOTIF-3 衍生）
- **关联**: AC.12

#### F-NOTIF-03 · **无系统通知**
- **强制**: 不调 Notification API；不调 Web Push；不调 Email 通道。所有存在 / 不在场通知仅靠 F-NOTIF-01 应用内红点。
- **优先级**: **Must**（INTERVIEW Q4 + NOTIF-2）
- **关联**: AC.12

### 2.7 SEC 域 — 隐私 / 安全

> 来自 ARCHITECTURE § 2.3 RLS + INTERVIEW § 2.7

#### F-SEC-01 · Email 仅做账号 ID
- **强制**: UI 永远不向其他朋友显示 email（即使对方是 owner）
- **优先级**: **Must**（SEC-1）

#### F-SEC-02 · 邀请一次性 + 24h 过期
- **逻辑**: invite.used_at 设置后失效；expires_at < now() 失效；pg_cron 清理
- **优先级**: **Must**（SEC-2/3 + INTERVIEW § 3.2 pg_cron）

#### F-SEC-03 · Postgres RLS 全表启用
- **强制**: profiles / invites / conversations / conversation_members / messages / attachments / reactions 7 张表全部启用 RLS；每个表至少 1 条 SELECT policy
- **优先级**: **Must**（SEC-4 + ARCHITECTURE § 2.3）
- **关联**: AC.AC.rls

#### F-SEC-04 · Owner admin 后台
- **能力**: 列出朋友 / 重置密码 / 看会话数 / 看 SQL 配额；**仅 role='owner'** 可见
- **优先级**: **Must**（SEC-5 + INTERVIEW Q6 衍生）

#### F-SEC-05 · 未认证访问拦截
- **逻辑**: 任何 protected 页面在未登录时跳转 `/login?redirect=<orig>`
- **优先级**: **Must**（SEC-6）

#### F-SEC-06 · Friend 删除 (left_at 软标记)
- **主流程**: Owner 在 admin 后台选 friend → 弹 modal 显示严重后果 ("X 加入的所有会话将显示『已离开』占位；你可在未来重新邀请") → 输入 **`confirm`** 字 → 提交 → **UPDATE conversation_members SET left_at=now() WHERE user_id=X AND conversation_id IN (所有 X 参与的群 + 与 X 的 1:1)**
- **重邀请（Round-1 Q4 决定）**: 占位可见后 Owner 可重新邀请同一 email → 重新注册（视为新 Friend）→ 直接加入（left_at=null）
- **优先级**: **Must**（SEC-7 + ROUND-1 Q4 + ROUND-2 Q3 "输 confirm 字"）

### 2.8 UI / 响应式

#### F-UI-01 · PC / 移动流式适配
- **≥ 1024px**: 侧栏 320 px + 聊天窗口 960 px 居中
- **< 1024px**: 单栏 + 推入抽屉（侧栏为 overlay）
- **优先级**: **Must**（UI-1/2 + DESIGN § 4.3）

#### F-UI-02 · 触达目标 ≥ 44 px
- **强制**: 所有交互元素 min 44 × 44 px
- **优先级**: **Must**（UI-3 + DESIGN § 10.1#5）

#### F-UI-03 · 减动效偏好
- **主流程**: `@media (prefers-reduced-motion: reduce)` → `:root --duration-*` 降为 0ms；Bubble 入场 + 抽屉滑入 + Presence pulse 均失效
- **优先级**: **Must**（UI-7 + DESIGN § 9.6）
- **关联**: AC.AC.motion

#### F-UI-04 · PWA 可安装
- **主流程**: manifest.json + Service Worker + install banner（弱化提示，不强制）
- **优先级**: **Must**（UI-4 + ARCH § 2.1）
- **关联**: AC.AC.pwa

#### F-UI-05 · 字体自托管
- **强制**: Inter WOFF2 + JetBrains Mono WOFF2 自托管；绝不引 Google Fonts CDN
- **优先级**: **Must**（UI-5 + ARCH § 7 + components/README § 1.4.1）
- **关联**: AC.AC.fonts

### 2.9 I18N 域 — 国际化

#### F-I18N-01 · 双语 (zh-CN + en)
- **默认**: zh-CN；浏览器语言 fallback en
- **优先级**: **Must**（I18N-1/2 + Round-3 Q2 确认）
- **关联**: AC.AC.i18n

#### F-I18N-02 · ICU MessageFormat
- **支持**: plural / variable / select（用于未读数 count 等）
- **优先级**: **Must**（I18N-4 + ARCH § 2.7）

#### F-I18N-03 · 消息原文不翻译
- **强制**: display_name 与 message body **不翻**（用户在客户端输入原文即可）
- **优先级**: **Must**（I18N-3）

---

## 3. 非功能需求（Non-functional Requirements）

### 3.1 性能

| ID | 指标 | 目标值 | 测量方法 |
|---|---|---|---|
| NF-PERF-01 | 首屏 LCP（CF Pages 边缘） | ≤ 1.5 s | Lighthouse CI |
| NF-PERF-02 | Typing 出现延迟 | ≤ 250 ms | 浏览器 Performance API |
| NF-PERF-03 | 消息列表 render (50 条) | ≤ 100 ms | React Profiler |
| NF-PERF-04 | Realtime 断连重连 | ≤ 3 s 自动恢复 | 实测 |

来源: Nook-INTERVIEW § 6.2 NN 性能 / ARCH § 2.4 supabase realtime 限速

### 3.2 安全

- **NF-SEC-N01**: Postgres RLS 全表启用（强制，F-SEC-03）
- **NF-SEC-N02**: Sentry 默认关 PII；message body + email **不入**监控
- **NF-SEC-N03**: JWT 存 HttpOnly Secure Cookie
- **NF-SEC-N04**: 不写 message body 到任何日志（LogSnag 只含 event 类别）
- **NF-SEC-N05**: Client 端 EXIF strip 完成后才上传图
- **NF-SEC-N06**: 邀请 token ≥ 24 byte 加密随机（pgcrypto `gen_random_bytes(24)`）
来源: ARCH § 2.5 + INTERVIEW § 6.2 NN Sentry

### 3.3 稳定性

- **NF-STAB-N01**: Sentry free tier（5k error/月）足够 1 年用量
- **NF-STAB-N02**: pg_cron 失败时 mailbox alert via Supabase logs；不靠"人盯"
- **NF-STAB-N03**: 消息发送失败 fall back → IndexedDB outbox（NF-MSG-FALLBACK）
- **NF-STAB-N04**: Realtime 断网时 app 全功能仍可浏览历史

### 3.4 可维护性

- **NF-MAINT-N01**: 所有字面值走 Nook-DESIGN-TOKENS.ts（**严禁业务代码写 hex**）
- **NF-MAINT-N02**: 组件 API 在 `prompt/components/*.spec.md` 唯一定义；实现文件 `src/components/<Name>.tsx` 严格对应
- **NF-MAINT-N03**: Spec 是 Live doc，但**所有变更走 ask_user + 新增 F-ID / CAP-ID**，不删除历史条目

### 3.5 可扩展性

- **NF-EXT-N01**: v1.0 → v1.1 / v1.2 / v2.0 的迁移通过 schema 迁移文件（`supabase/migrations/0xxx_*.sql`）+ Edge Functions 增量
- **NF-EXT-N02**: i18n 多加一种语言（如 ja-JP）只在 `src/lib/i18n/locales/` 增加 JSON 文件 + types

### 3.6 可访问性（Accessibility）

| 项 | 规则 | 来源 |
|---|---|---|
| NF-A11Y-N01 | 所有交互元素 ≥ 44 × 44 px | F-UI-02 + DESIGN § 10.1 |
| NF-A11Y-N02 | focus-visible 显示 `2px var(--color-accent-soft-ring)` + `outline-offset: 3px` | DESIGN § 5.4 |
| NF-A11Y-N03 | Icon-only Button 强制 `aria-label` | components/Button.spec.md |
| NF-A11Y-N04 | 异步 / loading 状态 `aria-busy="true"` | 同上 |
| NF-A11Y-N05 | 编辑 / 撤回 / 删除 等破坏性操作有二步确认（F-SEC-06 输 confirm 字） | ROUND-2 Q3 |
| NF-A11Y-N06 | Tab key traverse: header → side → main → composer → footer | 全局 |
| NF-A11Y-N07 | 颜色对比：accent 与 canvas 至少 4.5:1（验证 typography） | DESIGN § 10.1#4 |

### 3.7 响应式

- 断点 4 个（mobile 480 / tablet 768 / laptop 1024 / desktop 1280 / largeDesktop 1440）；v1.0 不必 5 段全部完美，但 laptop + mobile 两个必须通过（NF-RESP-N01）
[来源: ARCH § 2.11 + INTERVIEW § 6.2 NN 响应式]

### 3.8 浏览器兼容性（NN-N01）
- **现代 Evergreen**（无版本下限）。[来源: ROUND-3 Q1]
- 不支持：IE11 / Safari < 14 / 任何非常规内核浏览器。

### 3.9 PWA
- manifest.json + Service Worker + 可安装（NF-PWA-N01）
[来源: ARCH § 2.1 + INTERVIEW § 6.8 UI-4]

### 3.10 日志
- 前端 console（dev）+ LogSnag free tier（1k 事件/月）（NF-LOG-N01）
- 后端 Supabase logs 默认 7 天（NF-LOG-N02）
- **绝不写 message body 或 email 到日志**（红线 NF-LOG-N03）
[来源: ARCH § 2.13]

### 3.11 监控
- Sentry free tier（5k error/月）(NF-MON-N01)
- Cloudflare Analytics（NF-MON-N02）
- Supabase Dashboard 自带（NF-MON-N03）
[来源: ARCH § 2.14]

### 3.12 错误处理

| 错误源 | 处理 |
|---|---|
| 发送消息失败 | outbox + yellow dot + 重试入口 |
| 图片压缩失败 | toast: 「图片处理失败」+ 不阻塞 compose |
| EXIF strip 异常 | 客户端 fallback，仅 strip 部分，正常上传 |
| 网络断 | 自动 reconnect，3s 内 |
| 邀请 expired / used | 落 404 page 「邀请已失效，请联系 Owner」 |
| 群满 8 人 | 服务拒绝 + UI 阻止 invite 创建 |
| 已 4 群 | 按钮 disabled + hover-tooltip |
| Supabase 5xx | 错误页 + Sentry 记录 |
[来源: 综合 INTERVIEW § 6.1/6.2]

---

## 4. 用户角色（User Roles）

### 4.1 全部角色

Nook v1.0 有且仅有 **2 个角色**：**Owner** 与 **Friend**。
没有 admin sub-role，没有协管、没有 guest、没有 bot 概念。

### 4.2 角色定义

| 属性 | Owner | Friend |
|---|---|---|
| **存在数量** | 恰好 1 人 | 5–15 人（社交目标 ≤ 20） |
| **来源** | 系统初始化 (F-AUTH-01) | 通过 invite 注册 (F-AUTH-03~05) |
| **profiles.role** | `'owner'` | `'friend'` |
| **是否可被邀请** | ❌ 永远 Owner 唯一 | ❌ |
| **可转让** | ❌ | n/a |
| **创建邀请** | ✅ 全类型（target=any / target=conversation） | ❌ 仅可接受 |
| **创建群** | ✅ | ❌ |
| **`/settings/admin` 可见** | ✅ | ❌ (404) |
| **重置 Friend 密码** | ✅ | ❌ |
| **删除 Friend 账号** | ✅ (F-SEC-06) | ❌ |
| **修改自己 display_name / avatar / 语言** | ✅ | ✅ |
| **发消息 / 上传图 / 上传文件** | ✅ (在任何自己 membership 的会话) | ✅ |
| **撤回 / 删除自己的消息** | ✅ | ✅ |
| **加入 conversation** | 任何自己创建 + 受邀 | 仅受邀 |
| **离开 conversation** | 仅解散（删除群将单独说明 — v1.0 ❌） | ❌ |

### 4.3 角色关系



```
Owner (1, 单点永久)
  │  邀请 ─────► Friend (5-15)
  │              │
  │   软删 (left_at=now) ◄──┐
  │                          │ 通过 F-CONV-05 重邀请（如 email 相同，可视为同一人返回）
  │              └─► 占位可视 + 可重邀请 (ROUND-1 Q4 决定)
```



### 4.4 权限边界（要点重申）

- **邀请链永远是 Owner → Friend**: Friend 不能邀请别人（CONV-6 反管理者准则）。这避免了"组织裂变"。
- **Owner 不能修改自己 role**: Owner 永远是 Owner；若 Owner 自删账号 → Nook 进入孤儿态，所有 Friends 看到的 1:1 显示 "Owner 已离开" 占位（扩展说明见 F-SEC-06 异常）。
- **Friend→Owner 升级**：❌ v1.0 不支持
- **隐身 / 现身**：❌ 不支持，role='online'/'offline' 仅由 presence 推断

来源: Nook-PRODUCT § 3.6 + INTERVIEW § 2.1/§ 2.7 + ROUND-1 Q2

---

## 5. 页面规格（Page Specification）

> 全部 v1.0 页面枚举。每页按 SPEC.txt § 5 字段展开。

### 5.1 总路由表

| Path | 谁可访问 | 页面目标 |
|---|---|---|
| `/`（根） | 任何人 | 根据登录态重定向（已登 → `/home`；未登 → `/welcome`） |
| `/welcome` | 未登录 | 入口引导：登录 vs. 注册 Owner |
| `/login` | 未登录 | 仅 Owner 登录（F-AUTH-02）。**Friend 通过 invite 注册，没有"登录页"对外暴露** |
| `/welcome/register` | 未登录 | Owner 注册（F-AUTH-01） |
| `/invite/new` | **Owner** | Owner 创建 Invite（手动 / 新群），F-AUTH-03/04 |
| `/invite/:token` | 任何人 (validate) | Friend 注册落地（F-AUTH-05） |
| `/home` | 已登录 | 主聊天 SPA |
| `/settings` | 已登录 | 个人 / 管理 tab 入口 |
| `/settings/profile` | 已登录 | 修改 display_name / avatar / 语言（F-AUTH-08/09/10） |
| `/settings/admin` | **仅 Owner** | 列朋友、重置密码、删除 friend |
| `/settings/admin/:friendId/reset-password` | **仅 Owner** | modal 路由 |
| `/settings/admin/:friendId/delete` | **仅 Owner** | modal 路由 (F-SEC-06) |
| `/group/:id/settings` | Owner 在该群 | 重命名群（F-CONV-04） |
| `/404` | 任何人 | invite 失效 / 路由不存在 / 邀请者已注销 |
| `/error` | 任何人 | 通用错误页 + Sentry + "回到 home" 按钮 |

[来源: Round-2 Q1 决定] 「独立路由」结构。

### 5.2 `/welcome`（入口引导）

- **目标**: 让用户知道下一步是登录还是注册
- **主要功能**:
  - 显示 logo（`Nook v1.0` 文字 mark）+ 1 行 tagline
  - 2 个 link: 「登录」→ `/login`；「创建 Nook（仅 1 次）」→ `/welcome/register`
- **组件**: Logo · Button `intent=neutral` × 2
- **进入条件**: 未登录 + 任意根路径 fallback
- **退出条件**: 用户点 link 或新 register/login
- **状态**:
  - **Loading**: n/a
  - **Empty**: 这是 base 默认态
  - **Error**: 注册/登录报错从子页带过来 → 顶部 toast
  - **Success**: 子页跳转后此页不再渲染

#### 响应式
- Mobile: 单列；Logo 居中；按钮堆叠
- PC: 最大宽度 480 px 居中
[来源: DESIGN § 10.1]

### 5.3 `/welcome/register`

- **目标**: 创建 Nook 第一人
- **主要功能**: 表单 email + password + confirm → F-AUTH-01
- **组件**: Input (form variant) + Button (intent=accent)
- **进入条件**: `/welcome` → 创建链接
- **退出条件**: 表单成功提交后跳 `/home`
- **状态**:
  - 提交中：spinner + disable submit
  - 已存在：error 文本 "该邮箱已被使用"
- **响应式**: 同 § 5.2

### 5.4 `/login`

- **目标**: Owner 重新登录
- **主要功能**: email + password → F-AUTH-02
- **状态**: 失败统一提示 + 走 F-AUTH-02 异常流程
- 注意: v1.0 没有"忘记密码"按钮（Friend→owner 改密码也只能在 admin UI；Owner 自删 = Nook 死）

### 5.4a `/invite/new` (仅 Owner)

- **目标**: Owner 创建 Invite（target=any 自动 1:1 / target=conversation 加入已存在群）
- **主要功能**:
  - 选 "默认（自动 1:1）" 或 "指定群" → 选目标群（≤ 8 人未满）
  - Click 创建 → INSERT invites + UI 复制 URL `https://nook.app/invite/<token>` 到剪贴板
  - toast 提示"通过微信发给朋友"
- **组件**: RadioGroup + GroupPicker + Button(intent=accent) + CopyToClipboard
- **进入条件**: 已登录为 Owner
- **退出条件**: 创建完成 → 跳 `/home`
- **状态**:
  - **Loading**: 创建中 - 按钮 spinner, 复制后 URL 静默输出
  - **Empty**: 默认态
  - **Error**: 复制 API 不可用 → 退化为显示完整 URL + 手动复制说明；服务拒绝 → toast
  - **Success**: 跳 /home, toast "邀请已创建"
- **响应式**: 同 § 5.2，但字段按 mobile-first

[来源: F-AUTH-03 / F-AUTH-04 + INTERVIEW § 2.1 AUTH-3 / AUTH-4] 

### 5.5 `/invite/:token`

- **目标**: 给"被邀请的朋友"清晰上下文 + 注册入口
- **主要功能**:
  - GET 拉取 invite 详情 → 验证（未过期 / 未用 / Owner 存在）
  - 显示 Owner 的 `display_name` + 头像 + 一段 "邀请你加入 Nook v1.0" 文字
  - 注册表单（email + password）→ F-AUTH-05
  - 注册成功后：服务端根据 invite.target_kind 走 F-AUTH-06 或 F-CONV-05 → 跳 `/home`
- **组件**: Avatar (其他用户预览) · Input (form variant) · Button · 引用块（侧栏另一些）
- **进入条件**: 任何 URL 带 `:token` 进入此路由
- **退出条件**: 注册成功 → `/home`；邀请失效 → `/404`
- **状态**:
  - **Loading**: 拉 invite 时
  - **Empty**: n/a
  - **Error**: invite 失效 → /404
  - **Success**: 进入注册表单
- **响应式**: 同 5.2 但 mobile-first

### 5.6 `/home`（核心 SPA）

- **目标**: 承载所有 chat 功能
- **主要功能**:
  - **侧栏**: F-CONV-01（list）+ avatar + presence dot
  - **聊天区**: F-CONV-03 拉消息 + F-MSG-* send/edit/delete/recall/reply/react
  - **Composer**: floating island (DESIGN § 7)
  - **未读小红点**: F-NOTIF-01
  - **PWA 安装 banner**（弱提示）
- **侧栏点自己 avatar （Round-2 Q2）**: 点自己的 avatar → 弹出 popover 显示 display_name + 头像预览 + 「修改资料」按钮 → click 跳 `/settings/profile`。Popover 不遮盖聊天区，hover-off 自动关闭。
- **组件**: Avatar · Bubble · Composer · ListItem · UnreadDot · 各种 modal · ProfilePopover
- **进入条件**: 已登录 + 任何 unmatched path fallback
- **退出条件**: logout（v1.0 不暴露 logout？但应留路由）→ `/welcome`
- **状态**:
  - **Loading**: 拉首屏 50 条消息
  - **Empty**: 无会话 → S6 空状态引导（"用 invite 把朋友拉进来"）
  - **Error**: realtime 失联 → toast + 重连
  - **Success**: 标准 chat view
- **响应式**: PC 两栏 / Mobile 单栏 drawer（NF-RESP-N01 + UI-1/2）

### 5.7 `/settings`（tab 入口）

- **目标**: 集中所有"用户个人+管理"
- **主要功能**: 显示入口卡片 → "个人资料" + "管理" (Owner 才可见)
- **状态**: 已登录

### 5.8 `/settings/profile`

- **目标**: 修改自己 display_name / avatar / 语言
- **主要功能**: F-AUTH-08 / F-AUTH-09 / F-AUTH-10
- **组件**: Input · Avatar (preview) · FileInput · LangSwitch
- **状态**:
  - Loading: 上传头像时
  - Empty: 默认态
  - Error: 上传 > 5 MB / MIME 错 / 字段为空
  - Success: 字段已更新
- **响应式**: 同 § 5.2

### 5.9 `/settings/admin` （仅 Owner）

- **目标**: 全局管理：列朋友、重置密码、删除账号
- **主要功能**:
  - 显示 friend 列表（**不显示 email，只显示 display_name**）
  - 每行右侧: 「重置密码」「删除」
- **状态**:
  - Empty: N/A（只要有朋友，列表就有；只要没朋友，引导"先去建 invite"）
  - Error: 删除 / 重置失败 → toast
- **响应式**: 同 § 5.2

### 5.10 `/settings/admin/:friendId/reset-password`

- **目标**: 重置 friend 密码（F-AUTH-07）
- **主要功能**: modal → new password + confirm
- **状态**: form 内联错误；成功后 toast + 关闭

### 5.11 `/settings/admin/:friendId/delete`

- **目标**: 删除 friend (F-SEC-06)
- **主要功能**:
  - 弹 modal 显示严重后果
  - **输入 `confirm` 字才能 enable 提交按钮**（ROUND-2 Q3 决定）
- **状态**: form 内联错误；成功后 toast + friend 列表实时刷新

### 5.12 `/group/:id/settings` （Owner only）

- **目标**: 重命名群（F-CONV-04）
- **状态**: 不允许改成空字符串

### 5.13 `/404` 与 `/error`

- **目标**: 兜底错误页
- **主要功能**: 给用户一句话原因 + 「回到 /home」按钮 + 不显示堆栈
- **响应式**: 全屏居中

---

## 6. 业务流程（Business Flow）

> 12 条核心业务流，每条用以下结构：
> - 主流程 (happy path)
> - 异常流程 (可能出错)
> - 状态变化
> - 闭环检查表

### BF-01 · Owner 注册（Nook 起始）

**主流程**:


```
[User → /welcome/register]
  → 输入 email + password + confirm
  → POST signUp（带 role='owner' claim）
  → profiles row(role='owner') INSERT
  → JWT 设 Cookie
  → 跳 /home
  → 屏幕侧栏显示空状态
  → UI 提示 "去建第一个 invite"
```



**异常**:
- E1: email 已存在 → 红字，**明确不揭示**账号是否真的存在
- E2: 密码 < 8 字符 → 内联错误
- E3: 服务挂 → toast + Sentry

**状态变化**: auth.users ← INSERT；public.profiles ← INSERT(role='owner')；浏览器 cookie ← set JWT

**闭环**: ✅ 用户的 "Nook" 已可登录；✅ 还没有任何 friend；✅ UI 引导明显。

---

### BF-02 · Owner 创建 Invite (target=any)

**主流程**:


```
[Owner → /invite/new → 选 "默认（自动 1:1）"]
  → INSERT invites (token=hex24, target_kind='any', expires_at=now+24h, created_by=owner.id)
  → UI 复制 https://nook.app/invite/<token> 到剪贴板
  → toast "链接已复制，通过微信发给朋友"
```



**异常**:
- E1: 复制 API 不可用 → 退化为显示完整 URL 含复制按钮 + 手动复制说明
- E2: 写入失败 → toast + Sentry

**状态变化**: invites ← INSERT

**闭环**: ✅ URL 可分享；✅ 24h 倒计时开始；✅ pg_cron 持续清理过期。

---

### BF-03 · Owner 创建 Invite (target=conversation)

**主流程**:


```
[Owner → /invite/new → 选 "指定群" → pick group（≤ 8 人未满）]
  → INSERT invites (target_kind='conversation', target_conversation_id=X)
  → UI 复制链接
```



**异常**:
- E1: group 满 8 人 → 按钮 disabled
- E2: 已达 4 群上限 → 即使没满，新建群按钮 disabled（CONV-3 硬上限）

**闭环**: ✅ + 朋友将直接加入群，不创建 1:1。

---

### BF-04 · Friend 加入（首次落地）

**主流程** (假设 invite target=any):


```
[Friend → click https://nook.app/invite/<token>]
  → 浏览器加载 /invite/:token
  → UI 拉 invite 详情 + Owner profile
  → 显示 Owner 名 + 头像 + "邀请你加入 Nook v1.0"
  → 表单 (email + password)
  → POST signUp
  → profiles INSERT (role='friend')
  → 服务端检查 invite.target_kind='any'
  → 后端自动建 conversation(kind='one_to_one', name=NULL) + 2 行 conversation_members
  → 自标记 invite.used_by / used_at
  → 跳 /home，UI 自动 hover 进刚加的 1:1
```



**异常**:
- E1: invite token 过期或已用 → 404
- E2: Owner 账号已 gone → 404
- E3: 注册失败 → 表单错误

**状态变化**: auth.users ← INSERT；profiles(role='friend') ← INSERT；conversations ← INSERT；conversation_members ← INSERT(×2)；invites.used_at ← UPDATE

**闭环**: ✅ Friend 首发即能与 Owner 聊天；✅ Owner 侧栏自动出现 Friend；✅ invite 一次性失效。

---

### BF-05 · 发送纯文字消息

**主流程**:


```
[User 在 composer 输入]
  → 每次 keystroke → Realtime Presence.publish({typing: true})
  → 其他端订阅 → typing 三点降速动画
[User 按 Enter]
  → TanStack Query mutationFn (insert message)
  → INSERT messages(kind='text', body, sender_id=self.id)
  → Mutation onSuccess → 清空 composer + Presence.publish({typing: false})
  → 服务端 Realtime broadcast
  → 自己 + 其他朋友 append
```



**异常**:
- E1: 网络断 → 入 IndexedDB outbox + 显示 "未发送" 黄点
- E2: 网络恢复 → SW background sync → replay
- E3: 服务 5xx → outbox pending + 重试 ×1
- E4: 消息 > 表单字段上限 → 客户端截断 + toast

**状态变化**: messages ← INSERT (success)；outbox ← INSERT (offline case)；messages ← DELETE from outbox (sync 成功后)

**闭环**: ✅ 消息进所有端；✅ Typing 关闭；✅ Composer 清空。

---

### BF-06 · 发送单张图片

**主流程**:


```
[User drag / click attach icon → 选 < 50 MB image/* file]
  → 客户端 File → createImageBitmap
  → EXIF strip（读元数据但不传）
  → canvas 缩放 max 2560 px, toBlob('image/webp', 0.78)
  → 若 > 2 MB → 二压 q=0.6
  → 拿到 Blob → 直传 Supabase Storage（signed URL）
  → INSERT attachments (mime, size_bytes, width, height, original_name='img')
  → INSERT messages(kind='image', attachment_id, sender_id)
  → Realtime broadcast
```



**异常**:
- E1: 文件 ≥ 50 MB → 客户端拒绝，无请求发出
- E2: MIME 非 image/* → 拒绝
- E3: EXIF strip 失败 → fallback，仍上传像素
- E4: 客户端压缩 canvas 失败 → toast 中断

**状态变化**: attachments ← INSERT；messages ← INSERT；Storage ← PUT；outbox ← INSERT (offline case)

**闭环**: ✅ 图片可见；✅ EXIF 未上传；✅ 30 天到点时被 pg_cron 同步硬删。

---

### BF-07 · 引用 / 回复一条消息

**主流程**:


```
[User hover message → menu → "回复"]
  → composer 上方 surface-2 卡亮起（左 2px accent；sender 名；单行 truncate body）
  → 在 composer 输入新消息 → INSERT messages(reply_to_id=X, body)
  → 服务端 broadcast
```



**异常**: E1 被引用消息已被 TTL 清 → reply_to_id = set NULL（FK 已预设）→ 引用卡显示 "(原消息已过期)"

**闭环**: ✅ 新消息下方显示 "Replying to ..." 区段；✅ 引用卡随 composer 清空而折叠收起。

---

### BF-08 · 编辑消息（2 分钟时间窗）

**主流程**:


```
[User 距消息 < 2 min → hover menu → "编辑"]
  → inline editor
  → save → UPDATE messages SET body = ?, edited_at = now() WHERE id = X
  → UI 重新渲染，末尾加 (edited) 微标签
```



**异常**: E1 超过 2 分钟 → 编辑按钮 disabled（hover tooltip 提示）

**闭环**: ✅ 双方看到已编辑版；✅ (edited) 印记显示；✅ 数据库留痕 edited_at。

---

### BF-09 · 撤回消息（软撤回）

**主流程**:


```
[User hover message → menu → "撤回"]
  → UPDATE messages SET recalled_at = now() WHERE id = X
  → 服务端 broadcast recalled_at
  → 所有端在消息位置渲染 "已撤回" 占位（inert 表面）
```



**异常**: E1 消息已被 30 天 TTL 清 → UI 显示撤回失败。E2 已经完全过了 30 天 → DB row 不存在 → toast 错误。

**状态变化**: recalled_at 字段由 NULL → now()

**闭环**: ✅ UI 占位可见；✅ DB row 保留（"已撤回"占位自身的渲染数据）

---

### BF-10 · 删除消息（本地）

**主流程**:


```
[User hover message → menu → "删除"]
  → DELETE messages WHERE id = X AND sender_id = self.id
  → 仅自己端 UI 移除（其他朋友不受影响）
```



**异常**: E1 不知是不是 RLS 触发的删除失败 → toast。

**闭环**: ✅ 自己端消息消失；✅ 其他朋友继续看到原文；✅ 与撤回完全不同。

---

### BF-11 · 6 emoji 反应

**主流程**:


```
[User hover 消息 → 6 个 emoji 行（👍❤️😂👀🔥🙏）弹出]
  → 点 emoji → INSERT reactions(message_id, user_id, emoji)
  → 服务端 broadcast reactions count
  → UI 更新（自己 + 其他人）
  → 再次点同 emoji → DELETE reaction（自 toggle）
```



**异常**: E1 服务端枚举校验失败（试图传 7th emoji） → 拒绝。
E2 同一 user 同一 emoji 唯一（PK 兜底去重）。

**闭环**: ✅ 计数实时；✅ toggle 可逆。

---

### BF-12 · 30 天 TTL 自动清理

**主流程**:


```
[pg_cron 每日 03:00 UTC]
  → DELETE messages WHERE created_at < now() - '30 days' RETURNING attachment_id
  → 对每个 attachment_id → DELETE storage.objects WHERE name = (storage_path)
  → DELETE attachments WHERE id IN (...)
  → 不删 profiles / conversations / conversation_members
```



**异常**: E1 storage.objects 删除失败（孤儿 attachments）→ 手动 v1.1 脚本清理。

**闭环**: ✅ 30 天前消息硬删；✅ 用户不在乎"我同意被清理 / 我想备份"——这是产品决策（F-NOTIF 不提供备份提示，Round-2 Q8 决定）

---

### BF-13 · Owner 重置 Friend 密码

**主流程**:


```
[Owner → /settings/admin → 选 friend → 点 "重置密码"]
  → modal 输 new password + confirm
  → 服务端 admin API: supabase.auth.admin.updateUserById(friend.id, password=new)
  → UI 关闭 modal + toast "已重置，请通知朋友"
```



**异常**: E1 密码不满足 8 字符 → 表单错误。

**闭环**: ✅ Friend 凭新密码可登录（无邮件通知）。

---

### BF-14 · Owner 删除 Friend (F-SEC-06)

**主流程**:


```
[Owner → /settings/admin → 选 friend → 点 "删除"]
  → modal 显示严重后果:
    - "X 加入的所有会话将显示『已离开』占位"
    - "你可在未来重新邀请（如 email 相同，可恢复）"
  → 必须输入 confirm 字才能提交
  → 服务端批量: UPDATE conversation_members SET left_at = now() WHERE user_id = X AND conversation_id IN (...)
  → 朋友侧侧栏消失；其历史消息显示 `已离开 sender` 标记
```



**异常**:
- E1 Owner 输入了非 confirm → 提交按钮仍 disabled
- E2 重邀请（Round-1 Q4 决定）: 同 email 重新注册 → F-AUTH-05 重发，但旧 data 历史仍按 left_at 标记

**闭环**: ✅ left_at 标记可见；✅ Owner 可重新邀请同一 email 的人。

---

### BF-15 · Offline Sync（IndexedDB Outbox）

**主流程**:


```
[网络断开]
  → Send 按钮仍可点
  → mutationFn 失败 → 写 IndexedDB outbox → 标记 state='pending'
  → Composer 清空（即便消息未真发出）
  → UI 显示 "未送达" 黄点
[网络恢复]
  → Service Worker background sync
  → Dexie outbox 顺序 replay → POST messages (含 client_msg_id)
  → 服务端 Realtime 返回相同 client_msg_id → 客户端 dedupe
  → outbox state='delivered' → 黄点消失
```



**闭环**: ✅ 离线时消息不丢；✅ 网络回来后字面"补发"到达收件端。

---

### 业务流程闭环表（BF ↔ Domain/Feature）

| BF | 主用功能 (F-*) | 异常 ↔ Error handling |
|---|---|---|
| BF-01 注册 | F-AUTH-01 | NF-SEC-N0x |
| BF-02 / BF-03 Invite | F-AUTH-03/04 + F-CONV-05 | F-SEC-02 |
| BF-04 加入 | F-AUTH-05/06 + F-CONV-05 | /404 + F-SEC-02 |
| BF-05~11 Msg 系列 | F-MSG-01..11 | NF-3.12 错误表 |
| BF-12 30 天清理 | F-MSG-10 | F-SEC-N03 |
| BF-13 重置密码 | F-AUTH-07 | F-AUTH-07 main + exception |
| BF-14 删 friend | F-SEC-06 | "输 confirm" ROUND-2 Q3 |
| BF-15 离线同步 | F-MEDIA-01 | F-MEDIA-01 main + exception |

---

## 7. 数据需求（Data Requirements）

> **仅业务数据视角，不定义表 schema**。表 schema 在 `../02_Architecture/Nook-ARCHITECTURE.md § 3` + `Nook-INTERVIEW-spec.md § 3`。
> 每类数据: 来源 / 用途 / 生命周期 / 可否删除 / 可否恢复。

### DR-01 · 账号身份 (`auth.users`)
- **来源**: Supabase Auth 自动生成（注册时）
- **用途**: 唯一身份主键；不可对外暴露
- **生命周期**: 创建后永久保留
- **是否允许业务层删除**: ❌ 不允许（即使 Owner 删自己的，依然需通过 supabase.auth.admin.deleteUser；不在 v1.0 暴露给 Owner 自删）
- **可否恢复**: ❌ 不可（即便 invite 重发 + 同 email = 新 auth.users.id）

### DR-02 · 用户档案 (`public.profiles`)
- **来源**: trigger on auth.users INSERT（自动）
- **字段**: id / display_name / avatar_url / role / created_at
- **用途**: 朋友列表展示、消息署名、头像预览
- **生命周期**: 与 auth.users 永远共生（FK cascade）
- **业务可写**: display_name (F-AUTH-08)、avatar_url (F-AUTH-09)、role 永远不变
- **可否删除**: ❌ 不会 delete，只软标 left_at

### DR-03 · 加入会话的"当前成员" (`public.conversation_members`)
- **来源**: invite 注册 / owner 加 friend 入群
- **字段**: conversation_id / user_id / role / joined_at / **left_at**
- **生命周期**: 
  - 活跃成员 left_at = null
  - 软删 left_at 标记 (F-SEC-06)
  - 重新邀请 = （同 email 通过 Invite link 注册 → 新建 auth.users.id → INSERT 新 conversation_members）
- **可否删除**: 不真删；left_at 标记视为删
- **可否恢复**: ✅ 同 email 重新 invite → 但身份是"新 user"

### DR-04 · 对话 (`public.conversations`)
- **字段**: id / kind ('one_to_one'|'group') / name / avatar_url (群组可选) / created_by / created_at
- **生命周期**: 永不被删（即使所有成员都 left_at，会话历史仍留）
- **群数硬上限**: 4 (Round-1 Q3 + CONV-3)
- **每群成员上限**: 8 (CONV-4)

### DR-05 · 消息 (`public.messages`)
- **字段**: id / conversation_id / sender_id / body / kind ('text'|'image'|'file') / attachment_id / reply_to_id / edited_at / recalled_at / created_at
- **生命周期**:
  - created_at 30 天后被 pg_cron 硬删（F-MSG-10）
  - edited_at 永久保留
  - recalled_at 永久保留（即使 30 天后消息被清理...等等，看 § 3 关于 recalled + TTL 的注释）

> ⚠️ **冲突点**: INTERVIEW § 3 "messages.recalled_at 软撤回" 表明 recall row 永久保留；但 "30 天清理" 整条 messages 会被删。两规则如何在 DB 层并存？
> **解法**：
> - pg_cron 删的是 `messages WHERE created_at < -30 days`，**包括** recalled_at 不为 null 的；
> - 也就是说：30 天前的消息 包括 已撤回 占位都会被删；
> - 客户端需对"recall row 但引用别消息的"也做 set null 处理掉 reply_to_id（FK 已 ON DELETE SET NULL）；
> - "已撤回占位"是 30 天前的占位本身也会被剥 → UI 看不到任何已撤回了。
> **这是 SPEC 的明确决策**，与 INTERVIEW § 5 不冲突（30 天是硬上限，无论什么标记）。

- **可否业务层删除 (UI delete)**: ✅ sender 可 F-MSG-07（仅自己端）
- **可否恢复**: ❌ 30 天硬清后不可

### DR-06 · 附件 (`public.attachments`)
- **字段**: id / storage_path / mime / size_bytes / width / height / original_name / created_at
- **生命周期**: 与 message 同时被 30 天清理
- **EXIF**: 服务端永远不存原始 metadata（默认防御）

### DR-07 · 反应 (`public.reactions`)
- **字段**: (message_id, user_id, emoji) PK / created_at
- **生命周期**: 与 message 同时清（FK cascade）
- **emoji:** 6 个枚举（pg enum）

### DR-08 · 邀请 (`public.invites`)
- **字段**: token / created_by / target_kind / target_conversation_id / expires_at / used_by / used_at
- **生命周期**:
  - 24h 后过期（expires_at = now() + 24h）
  - 用过 → used_at 设置
  - pg_cron 每天 4:00 清过期 + 已用超 1 天 (INTERVIEW § 3.2)
- **可否恢复**: ❌ token 一旦发完就回不去

### DR-09 · Typing 状态（**不存表**）
- Supabase Realtime Presence（内存广播），零存储
- 生命周期: 连接断开即清

### DR-10 · 客户端本地缓存 (IndexedDB / Dexie)
- **热**: in-memory 最近 100 条 (Zustand)
- **温**: IndexedDB 最近 1000 条 (Dexie)
- **冷**: 服务端 Postgres
- **生命周期**: 与登录态挂钩；清除浏览器即清
- **可否恢复**: 重新登录 → 服务端拉取最新

### DR-11 · 配置 (`localStorage`)
- **语言**: `zh-CN` / `en`
- **用户喜好**: 不存关键数据
- **生命周期**: 永不过期；用户清浏览器则重置

---

## 8. 接口需求（API Requirements）

> **只列能力，不定义 HTTP/WS 协议细节**。协议细节在 ARCHITECTURE.md § 2 中已锁（Supabase 协议）。

### CAP-01 · 注册
- 输入: email + password
- 输出: 新 auth.users.id + profile

### CAP-02 · 登录
- 输入: email + password
- 输出: JWT cookie + 跳 home

### CAP-03 · 创建邀请 (Owner)
- 输入: target_kind ('any' | 'conversation') + 可选 target_conversation_id
- 输出: invite token + URL

### CAP-04 · 接受邀请（Friend 注册）
- 输入: token + email + password
- 输出: 新 friend 账号 + 新 conversation membership

### CAP-05 · 创建会话（Owner 创建群）
- 输入: name (可选)
- 输出: conversation.id
- 副作用: Owner 自动加入 conversation_members(role='owner')

### CAP-06 · 拉取消息列表
- 输入: conversation_id + (last_seen_created_at, limit)
- 输出: messages[]

### CAP-07 · 订阅消息（Realtime）
- 输入: conversation_id
- 输出: 新消息流

### CAP-08 · 订阅 Presence
- 输入: conversation_id(s)
- 输出: in-session users + typing[]

### CAP-09 · 发送文字消息
- 输入: conversation_id + body + reply_to_id? + client_msg_id
- 输出: messages.id
- 失败: outbox queue

### CAP-10 · 上传图片
- 输入: file/blob (image/* ≤ 50 MB)
- 输出: attachment.id + URL

### CAP-11 · 上传文件
- 输入: file/blob (< 50 MB)
- 输出: attachment.id + URL

### CAP-12 · 编辑消息
- 输入: messages.id + new body (sender only, < 2 min)
- 输出: edited_at

### CAP-13 · 撤回消息
- 输入: messages.id (sender only)
- 输出: recalled_at（DB row 不删)

### CAP-14 · 删除消息（本地）
- 输入: messages.id (sender only)
- 输出: DELETE row（仅自己端受影响)

### CAP-15 · emoji 反应
- 输入: messages.id + emoji ∈ {👍 ❤️ 😂 👀 🔥 🙏}
- 输出: count + self-toggle state

### CAP-16 · 修改自己 display_name
- 输入: new name
- 输出: profiles.display_name

### CAP-17 · 上传 / 替换自己头像
- 输入: blob (≤ 5 MB image)
- 输出: avatar_url

### CAP-18 · 切换语言
- 输入: lang ∈ {'zh-CN', 'en'}
- 输出: localStorage

### CAP-19 · Owner 重置 friend 密码 (admin)
- 输入: friend.auth_id + new password (≥ 8 chars)
- 输出: 成功 / 失败

### CAP-20 · Owner 删除 friend (F-SEC-06)
- 输入: friend.auth_id
- 输出: 所有 conversation_members 左标 left_at
- 副作用: friend 账号 / profile / 历史保留

### CAP-21 · 拉取 unread counts
- 输入: self.id
- 输出: { conversation_id: count } map

### CAP-22 · 拉取自己所有 accessible 会话
- 输入: self.id
- 输出: conversations[] + 最近消息预览

### CAP-23 · 拉取会话成员列表
- 输入: conversation_id
- 输出: profiles[] + presence status

### CAP-24 · 30 天 TTL 自动清理（系统）
- 输入: pg_cron schedule
- 输出: 物理删除

### CAP-25 · 邀请清理（系统）
- 输入: pg_cron schedule
- 输出: 物理删除

---

## 9. 约束（Constraints）

### 9.1 业务约束（Hard Product Boundaries）

> 一切来自 § 1.7.2 Never-Do 列表的硬制约：

- ❌ **不再加**已读回执 / 语音消息 / 视频通话 / Sticker Market / 朋友圈 / 群公告 / 多设备管理 / 红包支付
- ❌ **不引入** light mode 切换入口（DESIGN N9）
- ❌ **不放** Web Push / 系统通知 / Email 通知
- ❌ **不暴露**隐身 / 状态伪装
- 任何"主流 IM 有，Nook 没"的功能进入 SPEC 之前必须先过 PRODUCT § 2 反模式清单

### 9.2 技术约束

来源: ARCHITECTURE + DESIGN + INTERVIEW

- **架构 (单一 vendor 优先)**: 不引入除 Supabase / Cloudflare / LogSnag / Sentry 以外的供应商
- **tar 严格依赖**: 不分微服务、不上 K8s、不上 GraphQL Federation
- **i18n 必须 ICU**: 不写手写拼字符串
- **Web Standards 不破**: 不要求 Node-only API；优先在 Edge Functions (Deno) 实现
- **TypeScript strict**: 不允许 `any`（除泛型边界）
- **CSS 不允许硬编码颜色 / 间距 / 圆角**: 一切走 Nook-DESIGN-TOKENS.ts

### 9.3 法律 / 合规约束

- **不存储商业敏感数据**; v1.0 不涉及 GDPR / 隐私法具体条款（owner 自主保留全部数据导出能力，v1.1+）
- **不发邮件**: 无订阅许可风险，无 email marketing 法相关
- **中国大陆访问者**: 不阻塞登录,但: (a) 不引 Google Fonts CDN, (b) 字体回退系统化, (c) 接受 Supabase 100–250ms 跨国延迟, (d) 提供 inter.cn 域备用 (Round 暂未决, 见 ROADMAP)

### 9.4 隐私要求

- 朋友间**永远不显示** email（SEC-1）
- EXIF strip（MEDIA-3）
- 日志不含 message body / email（NF-SEC-N04）
- Sentry 关 PII（NF-SEC-N02）
- 30 天消息硬清 + 附件硬清（MSG-9）
- 邀请 一次性 + 24h 过期（SEC-2/3）

### 9.5 部署要求（永久免费约束）

来源: ARCH § 0 + § 6

- **不允许**为"将来扩展"花一分钱
- **Cloudflare Pages** 无带宽上限（前端）
- **Supabase** free tier：500MB DB / 1GB Storage / 2GB 带宽/月 / 500k invocations/月
- **Cloudflare R2** 10GB / 1M ops/月（备用）
- **Sentry free** 5k error/月
- **LogSnag free** 1k 事件/月
- **GitHub Actions** 2000 min/月

### 9.6 免费额度边界预警

来源: ARCH § 6

- **Supabase Storage 是唯一可能 6–8 个月逼近的资源**（高清原图是主消耗）
  - 应急: v1.1 给出 "30 天前附件迁 R2 + 仅留文字" 脚本
- DB < 50% 利用 → 预警显示
- 实时 WebSocket 连接数 < 100 → 安心
- 流量 < 100 MB/月 → 安心

### 9.7 浏览器限制

来源: § 3.8 + ROUND-3 Q1 + INTERVIEW § 6.2 NN

- 现代 Evergreen（Chrome / Edge / Firefox / Safari 当前稳定版）无版本下限
- 不支持 IE / 非常规内核浏览器
- Service Worker 必须支持 → 现代浏览器均支持
- IndexedDB 必须支持 → 现代浏览器均支持

### 9.8 移动端限制

来源: INTERVIEW § 2.8 UI-2 + DESIGN § 4.3

- < 768 px 切换 mobile-first 单栏 layout
- 触达 ≥ 44 px
- iOS Safari PWA 必须可安装（meta tags + manifest）
- composer 在 < 768 px 贴底（破例接受屏幕小+键盘约束）
- 中英文混排: 中文 0.02em 字间距, 西文 0
- 国内浏览器对 Web Push 不可靠 → 应用内红点方案

### 9.9 大陆网络特别约束

来源: ARCH § 7 + INTERVIEW § 6.2 NN 字符渲染

- **绝不引** Google Fonts CDN（不稳定）
- Inter / JetBrains Mono 必须自托管（v1.0 必做）
- Supabase Cloud 主要 AWS region：跨国 100–250 ms 延迟可接受
- 备 v1.1 国内 FCM 缺失 → 应用内 unread 替代（**v1.0 已经只有应用内**）

### 9.10 决策清单（不可绕过 · ROUND-1/2/3 决定）

| 类别 | 决策 | 来自 |
|---|---|---|
| 产品正式名称 | Nook v1.0 | ROUND-1 Q1 |
| Owner 单点永久 | 不可转让、不可指定协管 | ROUND-1 Q2 |
| 4 群硬上限 | DB + UI 双重阻止 | ROUND-1 Q3 |
| left_at 处理 | 占位可见 + 可重邀请 | ROUND-1 Q4 |
| Settings 路由结构 | 独立路由 (/settings/profile, /settings/admin) | ROUND-2 Q1 |
| 自己头像点击 | 打开个人资料抽屉 | ROUND-2 Q2 |
| 删除朋友确认 | 输 confirm 字 | ROUND-2 Q3 |
| TTL 附件备份 | 不提供 | ROUND-2 Q4 |
| 浏览器支持 | 现代 Evergreen only | ROUND-3 Q1 |
| i18n v1.0 | 双语 (zh-CN + en) | ROUND-3 Q2 |
| 验收颗粒度 | per-row 详见列 | ROUND-3 Q3 |
| Spec 规则 | 活状 (Live Spec)，但所有修改用 ask_user + 新增 F-ID | ROUND-3 Q4 |

---

## 10. 验收标准（Acceptance Criteria）

> per-row 详见列（ROUND-3 Q3 决定）。
> 每条 AC 给出：
> - **Define of Done**（完成判定）
> - **用户可见行为**（在浏览器里看到什么）
> - **失败行为**（缺它时是 broken）

### AC.01 · 注册 / 登录（覆盖 F-AUTH-01/02）

- **DoD**:
  - Owner 注册成功且 profiles row 写入 role='owner'
  - Owner 第二次用相同 email 注册会被拒绝
- **用户可见行为**:
  - 表单提交 → 200ms 内 spinner → 跳 `/home`
  - 失败时 inline error（不弹 toast）
- **失败行为** (broken 状态):
  - 没显示错误就跳页 → 视为坏
  - profile 没写入 role='owner' → 视为 owner role 系统异常，见红

### AC.02 · 创建 Invite（F-AUTH-03/04）

- **DoD**: invite row 写入 DB; URL 可在浏览器剪贴板
- **用户可见**: 点 "创建" 后浮 toast「链接已复制」+ 一行可读 URL
- **失败**: 链接未复制 / DB 写入失败 → red toast + 不消失

### AC.03 · Friend 加入 (BF-04)

- **DoD**: 同 email 注册 + 自动 1:1 (若 target=any) 或加入群 (若 target=conversation)
- **用户可见**: 注册表单提交 → 直接跳 `/home` 并 hover 进的刚加的会话
- **失败**: 
  - invite 已过期 → 跳 `/404`，文案「邀请已失效，请联系 Owner」
  - invite 已用 → 同上

### AC.04 · 1:1 聊 (F-MSG-01)

- **DoD**: owner ↔ friend 间文字消息互见实时
- **用户可见**: 一端发，对方 250 ms 内看到 3 点 → 看到气泡
- **失败**: 发送方气泡不出现 / 对方无 3 点 / 对方看不到气泡 → 任一即为坏

### AC.05 · Typing 指示器 (F-MSG-08)

- **DoD**: 对方输入时看到 3 点 (--ink-muted, 4 px 半径, 120 ms 错落)
- **用户可见**: 输入 → 对方头像旁显示点; 输入停顿 → 0.5s 内消失
- **失败**: 没有任何视觉指示 / 静态闪白 / 不同步

### AC.06 · 修改 display_name (F-AUTH-08)

- **DoD**: 自己 + 其他人 全端 reactive 更新 display_name
- **用户可见**: 改完瞬间侧栏和历史消息署名更新
- **失败**: 自己改名其他端不更新 → 重连后才更新 → 视为坏

### AC.07 · 引用 / 回复 (F-MSG-04)

- **DoD**: composer 上方显示引用卡；发消息后引用源在消息下显示
- **用户可见**: 选 reply 引用卡亮；发出消息有 "Replying to ..." 区段
- **失败**: 引用卡不出现 / 发出消息无引用区段 → 坏

### AC.08 · 编辑 (F-MSG-05)

- **DoD**: 2 分钟内可改; 改完末尾有 (edited)
- **用户可见**: 内容变化, 末尾印记即时出现
- **失败**: 改完后 (edited) 不出现 / 超过 2 分钟仍可改 → 坏

### AC.09 · 撤回 (F-MSG-09)

- **DoD**: 双端 UI 显示「已撤回」占位; DB row 仍在, recalled_at 已有值
- **用户可见**: 撤回后双方看到 inert 占位
- **失败**: 撤回后消息消失 / 撤回后对方看不出区别 → 坏

### AC.10 · 删除 (F-MSG-07)

- **DoD**: 仅自己端的 row 删除 (RLS); 朋友端仍可见
- **用户可见**: 自己的消息消失; 朋友端不变
- **失败**: 消息双方都不见 / 朋友端也删除 → 坏 (违反我们"自己 delete 不影响朋友"规则)

### AC.11 · 在线状态 (F-ST-01)

- **DoD**: 朋友在线时对方头像旁 6 px lavender 圆点
- **用户可见**: 上线 1s 内圆点出，离线 10s 内圆点没
- **失败**: 圆点永远不出现 / 颜色错 / 静态不呼吸

### AC.12 · 应用内 Unread (F-NOTIF-01, F-NOTIF-02)

- **DoD**: 离开会话 → 对方发消息 → 回到侧栏 → 该会话有未读红点; Tab title `[N] Nook v1.0`
- **用户可见**: 红点准确数; Tab title 与红点同步
- **失败**: 红点不出现 / Tab title 不变化 / 计数错 → 任一坏

### AC.13 · 头像上传 (F-AUTH-09)

- **DoD**: 设置页可上传; 上传后所有端显示新头像; 删除头像后退回首字母
- **用户可见**: 头像立即更新, 没有任何刷新需求
- **失败**: 上传报错 / EXIF 数据泄露 / 头像换错人 → 坏

### AC.14 · 群 + 8 人上限 (F-CONV-02 + F-AUTH-04 + F-CONV-05)

- **DoD**: 群 < 8 人时可加入; 满 8 后服务端拒绝新加入; 已建 4 群后无法建第 5 个
- **用户可见**: 第 5 个建群按钮 disabled; 第 9 个 invite 按钮 disabled
- **失败**: 第 5 个群能建 → 硬违规; 第 9 个能进群 → 硬违规

### AC.15 · 30 天 TTL (F-MSG-10)

- **DoD**: 30 天前消息 + 附件均不存在 (DB + Storage)
- **用户可见**: 第 31 天回看历史, 看不到那条 message + 图
- **测试方法**: 手动改 created_at 到 -31 天, 等次日 03:00 pg_cron 跑
- **失败**: pg_cron 没跑 / 没删 storage 对象 / 删得不彻底 → 坏

### AC.16 · 重置密码 (F-AUTH-07 + BF-13)

- **DoD**: Owner 在 admin 后台改密码后, 朋友能凭新密码登录
- **用户可见**: admin UI 显示「已重置」; friend 重新登录成功
- **失败**: 改完密码 friend 登不进去 / 改错对象 → 坏

### AC.17 · 离线 (F-MEDIA-01 + BF-15)

- **DoD**: 断网时发消息进 outbox；网络回时自动同步
- **用户可见**: 离线时消息带黄点 (未送达); 网络回 yellow dot 变绿/灰 (已同步)
- **失败**: 黄点永不消失 / 网络回消息不见 → 坏

### AC.18 · 编辑二次确认 (F-SEC-06 / ROUND-2 Q3)

- **DoD**: 删 friend 必须输入 confirm 字才能提交
- **用户可见**: 输入框错误时按钮 disabled
- **失败**: 任何可绕过 → 视为坏 (这是删除的二次保护)

### AC.AC.rls · RLS 全表启用 (F-SEC-03)

- **DoD**: 7 张业务表全 RLS；至少每表 1 条 SELECT policy
- **测试**: 用普通 friend JWT 试着查其他人的私 data → 应 0 行
- **失败**: 任何能跨用户读到数据 → 硬违规

### AC.AC.motion · 减动效兼容 (F-UI-03)

- **DoD**: `prefers-reduced-motion: reduce` 时所有入场动效 ≈ 0 ms
- **测试**: 浏览器偏好打开 → 气泡入场仍然能用但无动画
- **失败**: 入场动画还在 → 坏

### AC.AC.pwa · PWA 可安装 (F-UI-04)

- **DoD**: manifest.json 服务; Service Worker 注册; 浏览器显示 "添加到桌面"
- **失败**: 不可安装 / Service Worker 报错 → 坏

### AC.AC.fonts · 字体自托管 (F-UI-05)

- **DoD**: Inter + JetBrains Mono 由 public/fonts/ 提供; 不引 fonts.googleapis.com
- **测试**: 断网后刷新 → 字体显示; 检查控制台无 google fonts 请求
- **失败**: 离线时字体回退到系统非 Inter → bad

### AC.AC.i18n · 双语 (F-I18N-01)

- **DoD**: zh-CN + en 完整覆盖; localStorage 持久; 浏览器语言 auto fallback
- **测试**: 切换语言 → 所有 UI 文案 (flex) 跟着切; **消息 body 不切**
- **失败**: 部分 UI 未翻译 / 消息 body 被翻译 → 坏

### AC.AC.i18n.plural · ICU plural

- **DoD**: `{count, plural, =0 {无未读} one {1 条} other {# 条}}` 正确渲染
- **失败**: 只有 #/other → i18n 不完整

### AC.AC.naming · Token compliance

- **DoD**: 业务代码 0 处写裸 hex 或 px 数值
- **测试**: grep `#[0-9a-f]{3,6}` 在 src/ 仅允许在 Nook-DESIGN-TOKENS.ts 内
- **失败**: 业务代码出现裸值 → 视为 Single-Source-of-Truth 违反

### AC.AC.perf · LCP ≤ 1.5s

- **DoD**: 在 CF Pages 边缘首次加载 LCP ≤ 1.5s
- **测试**: Lighthouse CI 在 PR 上跑
- **失败**: > 1.5s → 视为回归

### AC.AC.dark · 全页面无 light mode 残留

- **DoD**: 一遍所有路由: `/welcome*`, `/login`, `/home`, `/invite/:token`, `/settings*` 均深色 rendered
- **测试**: 浏览器调浅色系统偏好, 刷新, 所有页还是深色
- **失败**: 任何页出现白 flash → 坏

### AC.AC.responsive · 4 断点不崩

- **DoD**: 1440 / 1024 / 768 / 375 px 4 个断点都好看
- **测试**: 手动 resize / Playwright 截图
- **失败**: 任一断点 < 44 px 触达 / 文字溢出 / 布局重叠 → 坏

### AC.AC.i18n.lite · 主要 UI 字符串 i18n 覆盖率

- **DoD**: 所有用户可见文案走 i18n key，不硬编码
- **测试**: grep 业务代码中得不存在硬编码中文/英文 UI 字符串
- **失败**: 硬编码 → 视为 i18n 不完整

### AC.AC.30day.cap · 30 天消息非永久

- **DoD**: 任意 message + attachment 在 30 天后必须被 pg_cron 删
- **失败**: 长度 > 30 天的消息存在 → 违反硬约束

---

## 11. 与未来 SPEC 版本的关系

- 本 Spec 是 `v1.0`。
- 任何 "新增功能" 走 Nook-PRODUCT.md § 2 反模式清单 → 同意后再走 `v1.1` 起新 spec。
- 任何 "现有功能收敛" 也走新 spec（不改 v1.0 内容）。
- 修改决策: 见 § 0.4 变更日志的追加。

---

## 12. 文档使用说明

- 本 Spec 是**实现者最先打开、最后打开的同一份文件**。
- 与 Nook-DESIGN / Nook-PRODUCT / Nook-ARCHITECTURE **冲突时，以本 Spec 为准**。
- 但**视觉 token 值必须以 Nook-DESIGN-TOKENS.ts 为准**（本 Spec 不复制 hex/px）。
- 组件 API 必须以 `prompt/components/*.spec.md` 为准（本 Spec 只列功能，不列 API）。

---

— END —
