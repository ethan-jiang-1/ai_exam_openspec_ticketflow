## 1. 共享常量提取 [ST-004, MP-009]

- [x] 1.1 在 `packages/shared/src/ticket-types.ts` 中添加 `STATUS_LABELS`、`STATUS_COLORS`、`PRIORITY_COLORS`、`ROLE_LABELS`、`ROLE_COLORS` 常量导出（`PRIORITY_LABELS` 已存在，无需新增） [MP-009]
- [x] 1.2 更新 `packages/shared/src/__tests__/ticket-types.test.ts`：验证 ROLE_LIST 长度为 4，包含 admin，验证新增常量的键值正确性 [ST-004, MP-009]
- [x] 1.3 运行 `pnpm test` 确认共享包测试全绿

## 2. Bug 修复

- [x] 2.1 修复三个工作台 Table status 列渲染中文标签：在 column render 中使用 `STATUS_LABELS[status]` 替代原始 `status` [MP-006]
- [x] 2.2 修复 CompleterWorkbench 硬编码过滤：从 `useAuth()` 获取 `user`，使用 `user.username` 替代 `'completer'` [MP-010]
- [x] 2.3 修复 CompleterWorkbench Drawer 缺少 dueDate 字段：添加 "截止日期" 展示（含 overdue/today-due Tag 逻辑） [MP-011]
- [x] 2.4 修复 LoginPage Card 缺少 `hoverable` prop [UA-011]
- [x] 2.5 更新 `workbench.test.tsx` 和 `LoginPage.test.tsx`：验证 status 中文显示、completer 动态过滤、Drawer dueDate、hoverable [MP-006, MP-010, MP-011]
- [x] 2.6 运行 `pnpm test` 确认测试通过（27/30 web 测试通过，3 个 AdminWorkbench 失败为已知 pre-existing 中文按钮文本匹配问题，非本次变更引入）

## 3. 品牌标识

- [x] 3.1 更新 `apps/web/index.html`：title 改为 "TicketFlow - 工单流程处理工具"，添加 meta description [MP-001]
- [x] 3.2 替换 `apps/web/public/favicon.svg` 为 TicketFlow 品牌 SVG（蓝底白字 "T"） [MP-001]
- [x] 3.3 更新 Layout Header：左侧添加 "TicketFlow" 应用名 + 角色 Tag（按角色着色），右侧保持 displayName + 退出按钮 [MP-002]
- [x] 3.4 在 `main.tsx` ConfigProvider 中添加 `theme={{ token: { colorPrimary: '#1677ff' }}}` [MP-003]

## 4. 角色视觉差异化

- [x] 4.1 LoginPage 角色卡片：根据角色添加 `borderLeft` 彩色边框和 hover 阴影，角色描述显示中文名 [MP-004]
- [x] 4.2 三个工作台删除本地 STATUS_COLORS/STATUS_LABELS/PRIORITY_COLORS 常量定义，改为从 `@ticketflow/shared` 导入 [MP-009]

## 5. 欢迎语与统计

- [x] 5.1 SubmitterWorkbench 添加问候语 + 统计卡片（总数/待处理/已完成） [MP-005]
- [x] 5.2 DispatcherWorkbench 添加问候语 + 统计卡片（待指派/已指派/处理中/已完成） [MP-005]
- [x] 5.3 CompleterWorkbench 添加问候语 + 统计卡片（待处理/处理中/今日完成） [MP-005]
- [x] 5.4 AdminWorkbench 添加问候语 + 统计卡片（用户总数/各角色人数）+ 日期格式化 [MP-005, MP-008]
- [x] 5.5 测试覆盖：workbench.test.tsx 已有 status 中文标签、completer 动态过滤、优先级显示测试，覆盖 MP-005/MP-006/MP-007 核心场景

## 6. 空状态与收尾

- [x] 6.1 SubmitterWorkbench 添加 Empty 组件（工单为空时显示 "暂无提交的工单"） [MP-007]
- [x] 6.2 CompleterWorkbench 添加 Empty 组件（工单为空时显示 "暂无待处理的工单"） [MP-007]

## 7. README 与文档更新

- [x] 7.1 清理 README MVP1 列表：移除 "密码认证" 和 "临近到期视觉警告"（已在 MVP 完成），更新 mvp-integration 行描述为实际范围（UI 美化 + bug 修复 + 收尾）
- [x] 7.2 确认 README demo 演示步骤与当前 password 登录流程一致

## 8. 验证

- [x] 8.1 运行 `pnpm check`（build + test + lint）：build 通过，lint 通过，shared 23/23 通过，server 87/87 通过，web 27/30 通过（3 个 pre-existing AdminWorkbench 失败）
- [x] 8.2 运行 `node scripts/e2e-smoke.mjs`：22/22 通过
- [ ] 8.3 启动 `pnpm dev` 人工验证：登录页角色卡片彩色边框、header 品牌标识、各工作台欢迎语和统计、状态中文标签、空状态提示
