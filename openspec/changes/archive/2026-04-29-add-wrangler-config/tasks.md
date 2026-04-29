## 1. 添加 Wrangler 配置文件

- [x] 1.1 在仓库根目录创建 `wrangler.jsonc`，包含 name、compatibility_date、assets（directory + not_found_handling）配置项，不含 main 字段 [DT-007]
- [x] 1.2 运行 `pnpm check` 验证 lint + typecheck + test + build 全绿（新增配置文件不影响现有流程）[DT-007]
