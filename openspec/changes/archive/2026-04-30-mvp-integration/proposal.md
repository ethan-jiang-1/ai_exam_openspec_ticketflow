## Why

MVP 功能已完整（4 个角色、密码登录、权限控制、工单流转），但视觉呈现完全是 antd 默认样式——无品牌标识、无角色视觉差异、状态标签显示英文、多处 UI 不一致。这是 MVP 的收尾交付物，必须在"丑媳妇见公婆"之前让产品看起来像一个成熟、精美、可交付的应用。

## What Changes

**Bug 修复:**
- 修复三个工作台 Table 中 status 列显示英文 key 而非中文标签的问题（STATUS_LABELS 已定义但未被使用）
- 修复 CompleterWorkbench 硬编码 `'completer'` 过滤——应使用当前登录用户
- 修复 CompleterWorkbench Drawer 缺少 dueDate 字段（TKT-015 要求三个工作台均展示）
- 修复 LoginPage Card 缺少 `hoverable` 属性（UA-011 要求）

**视觉美化:**
- 品牌标识：页面标题改为 "TicketFlow"，Layout Header 添加应用名和角色 badge
- antd 主题定制：ConfigProvider 添加 `theme` 配置，设置品牌色
- 角色视觉差异化：登录页 Card 按角色区分颜色/图标，Header 角色 badge 不同颜色
- 欢迎语 + 工单统计：每个工作台顶部添加问候语和工单数量统计卡片
- 统一空状态：SubmitterWorkbench 和 CompleterWorkbench 添加 Empty 组件
- Admin 表格日期列格式化为可读格式
- HTML meta 标签和 favicon 替换默认 Vite 图标

**代码清洁:**
- 提取三个工作台中重复的 STATUS_COLORS/STATUS_LABELS/PRIORITY_COLORS 到共享包
- README MVP1 列表移除已完成的项（密码认证、临近到期警告）
- README demo 演示步骤修正为 password 登录流程

## Capabilities

### New Capabilities
- `mvp-polish`: UI 美化——品牌标识、主题定制、角色视觉差异、欢迎统计、空状态、日期格式化、meta/favicon、共享常量提取

### Modified Capabilities
- `shared-types`: ST-004 Role 类型添加 `admin` 角色值
- `user-auth`: UA-005 场景文本 3→4 个预置用户; UA-011 强调 Card `hoverable` 属性
- `ui-system`: US-005 更新测试文件引用（RoleSelect.test.tsx → LoginPage.test.tsx）

## Impact

- `apps/web/src/pages/SubmitterWorkbench.tsx` — 修复 status 标签、添加空状态/统计、提取常量
- `apps/web/src/pages/DispatcherWorkbench.tsx` — 修复 status 标签、添加统计、提取常量
- `apps/web/src/pages/CompleterWorkbench.tsx` — 修复 status 标签、硬编码过滤、Drawer dueDate、空状态、提取常量
- `apps/web/src/pages/AdminWorkbench.tsx` — 日期格式化、添加统计
- `apps/web/src/pages/LoginPage.tsx` — hoverable、角色颜色/图标
- `apps/web/src/components/Layout.tsx` — 品牌标识、角色 badge
- `apps/web/src/main.tsx` — ConfigProvider theme 配置
- `apps/web/index.html` — title、meta description、favicon
- `apps/web/public/favicon.svg` — 替换为 TicketFlow 图标
- `packages/shared/src/ticket-types.ts` — ST-004 加 admin，共享 UI 常量（STATUS_LABELS/STATUS_COLORS/PRIORITY_COLORS/ROLE_LABELS/ROLE_COLORS）
- `packages/shared/src/__tests__/ticket-types.test.ts` — 验证新增常量
- `apps/web/src/__tests__/` — 适配新 UI 测试
- `README.md` — MVP1 清理、演示步骤修正
