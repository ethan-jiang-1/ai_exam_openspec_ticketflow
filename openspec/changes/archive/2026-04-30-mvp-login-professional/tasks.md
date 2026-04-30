## 1. LoginPageDev 测试创建

- [x] 1.1 创建 `LoginPageDev.test.tsx`：从当前 `LoginPage.test.tsx` 迁移测试内容，测试卡片渲染（4 张角色卡片、displayName、角色描述中文）、密码输入、登录按钮交互、密码错误 message.error 提示、getUsers API 失败错误提示、已登录重定向 [LP-006]

## 2. LoginPage 测试重写

- [x] 2.1 重写 `LoginPage.test.tsx`：测试表单渲染（用户名 Input、密码 Input.Password、登录 Button）、空字段校验错误提示、登录成功跳转、密码错误 message.error 提示、login 期间按钮 loading、已登录重定向、dev 下拉渲染与选择填入用户名 [LP-001] [LP-002] [LP-003] [LP-004] [LP-005]

## 3. LoginPageDev 页面创建

- [x] 3.1 创建 `LoginPageDev.tsx`：将当前 `LoginPage.tsx` 完整内容迁移到此文件，组件名改为 `LoginPageDev`，其余逻辑（用户列表获取、卡片渲染、密码输入、登录调用、已登录重定向）完全保持不变 [LP-006]

## 4. LoginPage 页面重写

- [x] 4.1 重写 `LoginPage.tsx` 基础结构：antd `Form` + `Input`（用户名，placeholder "请输入用户名"）+ `Input.Password`（密码，placeholder "请输入密码"）+ `Button type="primary" block`（登录，"登录"），页面居中布局（minHeight: 100vh）。实现 `onFinish` 提交流程（调用 `auth.login` + try/catch + `message.error`）+ 登录按钮 `loading` 状态。已登录用户重定向到对应工作台（useEffect 检测 user + navigate）。loading 期间渲染 antd Spin。 [LP-001] [LP-003] [LP-005]
- [x] 4.2 添加 Enter 键行为：用户名 Input 按 Enter → 通过 ref focus 密码 Input；密码 Input 按 Enter → `form.submit()` 提交表单 [LP-003]
- [x] 4.3 添加表单校验：`Form.Item` rules — username `{ required: true, message: '请输入用户名' }`，password `{ required: true, message: '请输入密码' }`，`validateTrigger: 'onSubmit'` [LP-002]
- [x] 4.4 添加 Dev 快捷下拉区域：`import.meta.env.DEV` 条件渲染虚线边框容器（`border: '1px dashed #d9d9d9'`, `borderRadius: 8`, `padding: 16`），顶部标注 "开发模式 (Dev Only)"（灰色小字），内嵌 antd `Select`（placeholder "快速选择用户 (Dev)"）。mount 时调用 `getUsers()` 获取用户列表，option label 格式 `{displayName} ({role})`，选择后 `form.setFieldsValue({ username })` 填入用户名字段。getUsers 失败时 Select 为空（graceful degradation，不显示 error message） [LP-004]

## 5. 路由注册

- [x] 5.1 `App.tsx` 新增 `/login-dev` 路由：`import LoginPageDev from './pages/LoginPageDev'`，`<Route path="/login-dev" element={<LoginPageDev />} />` [UA-011] [LP-006]

## 6. 验证

- [x] 6.1 运行 `pnpm check`（build + test + lint）确认全绿
- [x] 6.2 运行 `node scripts/e2e-smoke.mjs` 确认 E2E 通过
- [x] 6.3 启动 `pnpm dev` 人工验证：`/login` 正式登录页（表单 UI、校验、登录流程、dev 下拉）、`/login-dev` 调试登录页（卡片 UI 保持不变）：`/login` 正式登录页（表单 UI、校验、登录流程、dev 下拉）、`/login-dev` 调试登录页（卡片 UI 保持不变）
