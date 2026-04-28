# dev-tooling Specification

## Purpose
TBD - created by archiving change dev-env-setup. Update Purpose after archive.
## Requirements
### Requirement: DT-001 ESLint 代码检查

项目 SHALL 配置 ESLint flat config（`eslint.config.js`），使用 typescript-eslint 插件，支持所有三个工作区的 TypeScript 代码检查。

#### Scenario: 执行代码检查

- **WHEN** 在根目录执行 `pnpm lint`
- **THEN** ESLint SHALL 检查 `apps/web/src/`、`apps/server/src/`、`packages/shared/src/` 下的所有 `.ts`/`.tsx` 文件，退出码为 0

#### Scenario: 有问题的代码被检出

- **WHEN** 在任意工作区的 TypeScript 文件中写入 `const x: any = 1`（触发 no-explicit-any 规则）
- **THEN** `pnpm lint` SHALL 报告该问题且退出码非 0

### Requirement: DT-002 Prettier 代码格式化

项目 SHALL 配置 Prettier（`prettier.config.js`），统一所有工作区的代码格式。

#### Scenario: 执行代码格式化

- **WHEN** 在根目录执行 `pnpm format`
- **THEN** Prettier SHALL 格式化所有工作区的 `.ts`、`.tsx`、`.json` 文件

### Requirement: DT-003 Vitest 测试框架

项目 SHALL 配置 Vitest 测试框架，`apps/web`、`apps/server` 和 `packages/shared` 各自有独立的 `vitest.config.ts`。

#### Scenario: 运行所有测试

- **WHEN** 在根目录执行 `pnpm test`
- **THEN** Vitest SHALL 运行 `apps/web`、`apps/server` 和 `packages/shared` 的所有测试用例，输出通过/失败计数，退出码反映测试结果

#### Scenario: 单个工作区运行测试

- **WHEN** 在 `apps/server` 目录执行 `pnpm test`
- **THEN** 仅运行 `apps/server/vitest.config.ts` 中配置的测试文件

#### Scenario: health 端点测试通过

- **WHEN** 执行 `apps/server` 的测试
- **THEN** SHALL 包含一个测试用例验证 `GET /health` 返回 `{ "status": "ok" }` 和 200 状态码

#### Scenario: shared 类型导出测试通过

- **WHEN** 执行 `packages/shared` 的测试
- **THEN** SHALL 包含一个测试用例验证 `import { APP_INFO } from '../index'` 成功且 `APP_INFO.name` 为 `"ticketflow"`、`APP_INFO.version` 为 `"0.1.0"`

### Requirement: DT-004 统一开发脚本

项目根目录 `package.json` SHALL 定义以下 scripts：
- `dev`：通过 concurrently 同时启动前端和后端开发服务器
- `build`：按依赖顺序构建所有工作区
- `test`：运行所有工作区测试
- `lint`：执行 ESLint 检查
- `format`：执行 Prettier 格式化

#### Scenario: 全局开发脚本可用

- **WHEN** 开发者在项目根目录执行 `pnpm <script>`（script 为上述任一脚本名）
- **THEN** 对应脚本 SHALL 正确执行，退出码为 0（lint 和 test 要求代码无问题）

