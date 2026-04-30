## Context

当前 `/login` 是卡片式用户选择界面（4 张角色卡片，各自输入密码），适合开发阶段快速切换用户测试。MVP 已进入交付阶段，需要一个专业的用户名+密码表单式登录页。同时保留现有调试界面供开发使用。

约束：
- 后端 Auth API（`POST /api/auth/login`、`GET /api/auth/users`）不变
- AuthContext (`login(username, password)`) 接口不变
- antd 5 已在项目中，作为 UI 组件库
- Vite 的 `import.meta.env.DEV` 可在编译时区分开发/生产环境

## Goals / Non-Goals

**Goals:**
- 新的 `/login` 路由展示专业表单式登录页（用户名输入框 + 密码输入框 + 登录按钮）
- 现有卡片式调试登录保留在 `/login-dev` 路由
- 正式登录页在开发环境下提供快捷用户选择下拉
- 表单校验、Enter 键行为、loading 状态等专业体验细节

**Non-Goals:**
- 不修改后端 Auth API
- 不修改 AuthContext 接口
- 不添加"记住密码"、"忘记密码"等功能
- 不添加验证码、OAuth 等高级认证方式
- 不在生产构建中包含 dev 下拉的任何代码

## Decisions

### 1. 组件拆分

**决策：** 当前 `LoginPage.tsx` 内容迁移到新建的 `LoginPageDev.tsx`，`LoginPage.tsx` 重写为表单式登录。

- `LoginPage.tsx` — 正式登录：antd `Form` + `Input`（用户名）+ `Input.Password`（密码）+ `Button`（登录）
- `LoginPageDev.tsx` — 调试登录：保留当前卡片式 UI，4 张角色卡片各带密码输入和登录按钮

**理由：** 两个页面 UI 结构完全不同（表单 vs 卡片网格），共享逻辑只有 auth redirect 和 login 调用。放在两个文件中更清晰，各自独立测试。

### 2. 路由设计

**决策：** `/login` → `LoginPage`，`/login-dev` → `LoginPageDev`。`ProtectedLayout` 的未登录重定向目标保持 `/login`。

`/login-dev` 在生产构建中仍可访问（路由注册不消失），但页面本身无敏感信息。如果需要在生产环境完全隐藏，可在 `App.tsx` 中用 `import.meta.env.DEV` 条件注册路由，但当前不做此优化——路由注册本身不造成安全风险。

### 3. Dev 快捷下拉

**决策：** 在 `LoginPage` 底部添加 `import.meta.env.DEV` 守卫的 dev 下拉区域。该区域用浅色虚线边框包裹，顶部标注 "开发模式 (Dev Only)"，内嵌 antd `Select` 下拉。组件 mount 时调用 `getUsers()` 获取预置用户列表。选择用户后自动填入用户名字段，用户只需输入密码。

```tsx
{import.meta.env.DEV && (
  <div style={{ border: '1px dashed #d9d9d9', borderRadius: 8, padding: 16 }}>
    <div style={{ color: '#999', fontSize: 12, marginBottom: 8 }}>开发模式 (Dev Only)</div>
    <Select
      placeholder="快速选择用户 (Dev)"
      options={users.map(u => ({ value: u.username, label: `${u.displayName} (${u.role})` }))}
      onChange={(username) => form.setFieldsValue({ username })}
    />
  </div>
)}
```

**理由：**
- 虚线边框明确视觉边界，标注文字说明这是开发专属功能，避免误以为是生产功能
- `import.meta.env.DEV` 是 Vite 编译时常量，生产构建时整个容器（边框+标注+下拉）被 tree-shake 移除
- 不需要额外的环境变量或配置
- `getUsers()` 失败时 Select 为空（options 为空数组），不影响表单正常使用

**备选方案：** 将下拉放在 LoginPageDev。但 LoginPageDev 已经以卡片形式展示所有用户，不需要额外的下拉。放在 LoginPage 能弥补表单式登录在开发时"不记得用户名"的不便。

### 4. 表单行为

**决策：**
- 使用 antd `Form` 组件管理表单状态和校验
- `Form.Item` rules：username 和 password 均为 required（`{ required: true, message: '请输入用户名/密码' }`）
- 用户名输入框按 Enter → 焦点移到密码框（通过 `ref` + `focus()`）
- 密码输入框按 Enter → 触发 `form.submit()`
- 登录按钮绑定 `loading` 状态，提交期间显示 loading 并禁用按钮

**理由：** antd Form 提供完整的校验、布局、状态管理，无需手动管理 error 状态。Enter 键行为是用户对登录表单的普遍预期。

### 5. 测试策略

**决策：**
- `apps/web/src/__tests__/LoginPage.test.tsx` — 重写，覆盖：表单渲染、必填校验、登录成功跳转、登录失败提示、dev 下拉选择、已登录重定向
- `apps/web/src/__tests__/LoginPageDev.test.tsx` — 新建，迁移当前 LoginPage 测试内容（卡片渲染、密码输入、登录交互）

两个测试文件独立，各自 mock `useAuth` 和 `useNavigate`。

## Directory Layout

```
apps/web/src/
  pages/
    LoginPage.tsx          ← 重写：表单式登录
    LoginPageDev.tsx       ← 新建：当前卡片式 LoginPage 迁移
  __tests__/
    LoginPage.test.tsx     ← 重写：表单式登录测试
    LoginPageDev.test.tsx  ← 新建：卡片式登录测试（当前 LoginPage 测试迁移）
  App.tsx                  ← 新增 /login-dev 路由，引入 LoginPageDev
```

## Risks / Trade-offs

- **[Risk] `import.meta.env.DEV` 不是 100% 可靠的 tree-shaking 保证** → 如果 Vite 配置有 `define` 覆盖，DEV 可能在生产为 true。但当前项目使用 Vite 默认配置，DEV 在 `vite build` 时被替换为 `false`，后续 dead code elimination 会移除。风险很低。
- **[Risk] 两个登录页共享 auth redirect 逻辑（`useEffect` + `navigate`）** → 代码重复。可提取为 hook `useAuthRedirect`，但仅 5 行代码，抽象反而增加理解成本。当前保持重复。
- **[Risk] LoginPageDev 可能被生产环境用户意外访问** → 如果知道 `/login-dev` 路径就能访问。页面没有敏感功能（仍需输入密码），但可考虑未来加 `import.meta.env.PROD` 守卫显示 404。
- **[Trade-off] 两个文件 vs 一个文件用 mode prop** → 两个文件更清晰，各自独立，不需要 if/else 分支逻辑，测试也独立。选择两个文件。

## Open Questions

1. **是否需要为 `/login-dev` 添加生产环境 404 守卫？** 当前不做，因为页面无敏感信息。如果后续有人提出安全顾虑，可在 `LoginPageDev` 组件内部加 `if (import.meta.env.PROD) return <NotFound />`。
2. **dev 下拉是否需要加载状态？** `getUsers()` 是本地 API，响应 <100ms。但网络异常时 Select 为空（graceful degradation），用户体验可接受。如果后续需要，可加 loading 状态。
3. **是否需要在 LoginPageDev 也加 dev 下拉？** 当前不需要，卡片已经展示了所有用户。如果后续用户反馈在 dev 页也需要快速填充，可再加。
