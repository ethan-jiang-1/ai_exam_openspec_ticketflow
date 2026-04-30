## MODIFIED Requirements

### Requirement: US-005 现有测试适配

UI 重构后，`apps/web/src/__tests__/LoginPage.test.tsx` 和 `apps/web/src/__tests__/workbench.test.tsx` SHALL 适配 antd 组件的 DOM 结构，确保所有现有测试用例在 antd 组件下仍然通过。测试逻辑（过滤规则、角色跳转、密码登录）不变，仅调整 DOM 查询方式以匹配 antd 渲染结果。

#### Scenario: LoginPage 测试适配后通过

- **WHEN** 运行 `pnpm test`
- **THEN** `LoginPage.test.tsx` 中所有测试用例（卡片渲染、密码登录、错误提示）SHALL 通过

#### Scenario: workbench 过滤测试适配后通过

- **WHEN** 运行 `pnpm test`
- **THEN** `workbench.test.tsx` 中所有子工作台过滤测试用例（submitter 只看自己创建、dispatcher 看非完成、completer 看被指派给自己的）SHALL 通过
