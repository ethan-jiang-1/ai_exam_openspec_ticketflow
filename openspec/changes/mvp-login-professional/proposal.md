## Why

当前 `/login` 是一个卡片式用户选择界面（4 张角色卡片，各自输入密码），明显是调试/开发用的 UI。MVP 已到交付阶段，需要一个专业的登录页：用户名输入框 + 密码输入框 + 登录按钮。同时保留现有调试界面作为 `/login-dev`，方便开发阶段快速切换用户测试。

## What Changes

- **新建正式登录页 `LoginPage`**：antd `Form` + `Input` 用户名 + `Input.Password` 密码 + `Button` 登录，专业简洁
- **保留调试登录页**：当前 `LoginPage` 重命名为 `LoginPageDev`，路由改为 `/login-dev`
- **Dev 快捷下拉**：正式登录页底部添加 `import.meta.env.DEV` 守卫的 `Select` 下拉，选择预置用户后自动填入用户名，输入密码即可登录
- **路由拆分**：`/login` → LoginPage（正式），`/login-dev` → LoginPageDev（调试）

## Capabilities

### New Capabilities
- `login-professional`: 正式登录 UI——用户名/密码表单、表单校验、Enter 键行为、loading 状态、Dev 快捷下拉

### Modified Capabilities
- `user-auth`: UA-011 登录页需求修改——`/login` 改为表单式登录，新增 `/login-dev` 路由保留卡片式调试登录

## Impact

- `apps/web/src/pages/LoginPage.tsx` — 重写为正式登录表单
- `apps/web/src/pages/LoginPageDev.tsx` — 新建，当前 LoginPage 迁移并重命名
- `apps/web/src/App.tsx` — 新增 `/login-dev` 路由，引入 LoginPageDev
- `apps/web/src/__tests__/LoginPage.test.tsx` — 重写测试（表单渲染、校验、登录、dev 下拉）
- `apps/web/src/__tests__/LoginPageDev.test.tsx` — 新建，当前 LoginPage 测试迁移
- `openspec/specs/user-auth/spec.md` — UA-011 需求修改
