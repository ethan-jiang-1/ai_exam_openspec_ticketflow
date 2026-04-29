## 1. 依赖声明

- [ ] 1.1 在 `apps/web/package.json` 的 dependencies 中添加 `react-router-dom: "^7.14.2"` [FE-001]
- [ ] 1.2 执行 `pnpm install` 更新 lockfile [FE-001]

## 2. 验证（依赖 1.2）

- [ ] 2.1 运行 `pnpm -w run check`（build + test + lint）确认全部通过 [FE-001 Scenario 2]
- [ ] 2.2 确认部署后 Cloudflare Pages 构建通过（需部署验证）[FE-001 Scenario 3]
