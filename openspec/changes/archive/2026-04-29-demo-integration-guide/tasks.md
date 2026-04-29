## 1. Status badge 样式

- [x] 1.1 在 `apps/web/src/App.css` 中新增 `.status-badge` 和 `.status-submitted`/`.status-assigned`/`.status-in_progress`/`.status-completed` 四个状态的样式 [WF-009]

## 2. 页面更新（依赖 1.1）

- [x] 2.1 修改 `apps/web/src/pages/SubmitterWorkbench.tsx`，状态列使用 status badge class [WF-009]
- [x] 2.2 修改 `apps/web/src/pages/DispatcherWorkbench.tsx`，无 status 列，无需修改 [WF-009]
- [x] 2.3 修改 `apps/web/src/pages/CompleterWorkbench.tsx`，状态列使用 status badge class [WF-009]

## 3. 集成测试

- [x] 3.1 创建 `apps/server/src/__tests__/integration.test.ts`，测试完整流转：create → assign → start → complete，验证每步状态变迁 [DG-001]

## 4. 演示说明

- [x] 4.1 在 `README.md` 的 Demo Roadmap 区域后新增"演示步骤"章节，包含启动服务、三个角色的操作步骤 [DG-002]

## 5. 验证（依赖 2.1~2.3, 3.1）

- [x] 5.1 运行 `pnpm -w run check`（build + test + lint）确认全部通过 [DG-001, DG-002, WF-009]
