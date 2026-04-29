## ADDED Requirements

### Requirement: DT-005 Workspace 显式 TypeScript 依赖

每个包含 `tsc` 调用构建步骤的 workspace SHALL 在其 `package.json` 的 `devDependencies` 中显式声明 `typescript` 依赖，确保在隔离构建环境中 `tsc` 命令可用。当前涉及 `packages/shared` 和 `apps/web`。

#### Scenario: Cloudflare Pages 构建成功
- **WHEN** Cloudflare Pages 执行 `pnpm run build`
- **THEN** `packages/shared` 的 `tsc --noEmit` 步骤 SHALL 成功执行，不报 `tsc: not found`

#### Scenario: 本地构建不受影响
- **WHEN** 在本地执行 `pnpm run build`
- **THEN** 所有 workspace 构建 SHALL 与变更前行为一致，退出码为 0

### Requirement: DT-006 packageManager 字段声明

根 `package.json` SHALL 声明 `packageManager` 字段，值为 `pnpm@10.27.0`，确保构建平台使用正确的包管理器版本。

#### Scenario: Cloudflare 识别 pnpm 版本
- **WHEN** Cloudflare Pages 初始化构建环境
- **THEN** SHALL 使用 `packageManager` 字段指定的 pnpm 版本执行依赖安装
