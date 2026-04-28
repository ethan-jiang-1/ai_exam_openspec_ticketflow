## ADDED Requirements

### Requirement: ESLint 代码检查

项目 SHALL 配置 ESLint，使用 typescript-eslint 插件，支持所有三个工作区的 TypeScript 代码检查。

#### Scenario: 执行代码检查

- **WHEN** 在根目录执行 `pnpm lint`
- **THEN** ESLint SHALL 检查所有工作区的 TypeScript 文件，报告代码质量问题

### Requirement: Prettier 代码格式化

项目 SHALL 配置 Prettier，统一所有工作区的代码格式。

#### Scenario: 执行代码格式化

- **WHEN** 在根目录执行 `pnpm format`
- **THEN** Prettier SHALL 格式化所有工作区的代码文件

### Requirement: Vitest 测试框架

项目 SHALL 配置 Vitest 测试框架，前后端工作区均可编写和运行测试。

#### Scenario: 运行所有测试

- **WHEN** 在根目录执行 `pnpm test`
- **THEN** Vitest SHALL 运行所有工作区的测试用例，报告通过/失败结果

#### Scenario: 单个工作区运行测试

- **WHEN** 在 `apps/server` 目录执行 `pnpm test`
- **THEN** 仅运行该工作区的测试用例

### Requirement: 统一开发脚本

项目根目录 package.json SHALL 定义以下 scripts：
- `dev`：同时启动前后端开发服务器
- `build`：构建所有工作区
- `test`：运行所有测试
- `lint`：执行 ESLint 检查
- `format`：执行 Prettier 格式化

#### Scenario: 全局开发脚本可用

- **WHEN** 开发者在项目根目录
- **THEN** 所有上述 scripts SHALL 可通过 `pnpm <script>` 执行
