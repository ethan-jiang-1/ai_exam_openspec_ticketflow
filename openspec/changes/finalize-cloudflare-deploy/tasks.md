## 1. D1 迁移应用 [DT-007]

- [x] 1.1 确认 `wrangler.jsonc` 中 `database_id` 已替换为真实 ID `f74097dc-dcf9-4dce-a3a8-fae898ef4b0a` — [DT-007]
- [ ] 1.2 执行 `npx wrangler d1 migrations apply ticketflow-db --remote` 将 Drizzle 生成的迁移应用到远程 D1 数据库 — [DT-007 Scenario: D1 数据库绑定可用]

## 2. 部署验证 [DT-007]（依赖 1.2 完成）

- [ ] 2.1 推送代码触发 Cloudflare Workers Builds 部署（或在已认证环境执行 `npx wrangler deploy`），确认部署成功且不报 database_id 错误 — [DT-007 Scenario: Workers 部署成功]
- [ ] 2.2 验证 `GET https://<worker-domain>/health` 返回 JSON `{"status":"ok"}`（Worker 处理，非 HTML）— [DT-007 Scenario: API 端点由 Worker 处理]
- [ ] 2.3 验证 `GET https://<worker-domain>/` 返回 HTML（静态资产）— [DT-007 Scenario: Wrangler 配置文件存在且格式正确]
- [ ] 2.4 验证 `GET https://<worker-domain>/workbench/submitter` 返回 HTML（SPA 路由，非 404）— [DT-007 Scenario: SPA 路由正确处理]

## 3. 云端播种 [DT-007]（依赖 2.* 完成）

- [ ] 3.1 通过 `curl POST /api/tickets` 创建 5 条演示数据（覆盖全部 4 种 status：submitted ×2, assigned, in_progress, completed），全程走 Drizzle ORM，无原始 SQL — [DT-007 Scenario: D1 数据库绑定可用]
- [ ] 3.2 验证 `GET https://<worker-domain>/api/tickets` 返回 5 条记录 — [DT-007 Scenario: API 端点由 Worker 处理]
