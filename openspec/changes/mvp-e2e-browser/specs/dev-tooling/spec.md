# dev-tooling Specification

## Purpose
开发工具链配置规范：ESLint、Prettier、Vitest、统一脚本、TypeScript 依赖声明和部署配置。

## MODIFIED Requirements

### Requirement: DT-003 Vitest 测试框架

项目 SHALL 配置 Vitest 测试框架用于单元测试、组件测试和 API 集成测试，`apps/web`、`apps/server` 和 `packages/shared` 各自有独立的 `vitest.config.ts`。浏览器级 E2E 测试由 Playwright 负责，不在 vitest 范围内。

#### Scenario: 运行所有测试

- **WHEN** 在根目录执行 `pnpm test`
- **THEN** Vitest SHALL 运行 `apps/web`、`apps/server` 和 `packages/shared` 的所有测试用例（单元 + 组件 + API 集成），输出通过/失败计数，退出码反映测试结果

#### Scenario: `pnpm test` 不包含浏览器 E2E

- **WHEN** 在根目录执行 `pnpm test`
- **THEN** Vitest SHALL NOT 运行 `tests/e2e/` 目录下的 Playwright 测试

#### Scenario: 单个工作区运行测试

- **WHEN** 在 `apps/server` 目录执行 `pnpm test`
- **THEN** 仅运行 `apps/server/vitest.config.ts` 中配置的测试文件

#### Scenario: health 端点测试通过

- **WHEN** 执行 `apps/server` 的测试
- **THEN** SHALL 包含一个测试用例验证 `GET /health` 返回 `{ "status": "ok" }` 和 200 状态码

#### Scenario: shared 类型导出测试通过

- **WHEN** 执行 `packages/shared` 的测试
- **THEN** SHALL 包含一个测试用例验证 `import { APP_INFO } from '../index'` 成功且 `APP_INFO.name` 为 `"ticketflow"`、`APP_INFO.version` 为 `"0.1.0"`
