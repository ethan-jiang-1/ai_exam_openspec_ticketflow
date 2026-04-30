## 1. SessionStore TTL 单元测试 + 实现 [UA-004]

- [x] 1.1 编写 SessionStore TTL 测试（sessions.test.ts）：构造 ttlMs=1 的 store，过期 session 返回 undefined、cleanExpired 清理过期/保留未过期、create 调用前惰性执行 cleanExpired、destroy 行为不变 [UA-004]
- [x] 1.2 实现 SessionStore：构造可选 ttlMs 参数（默认 86,400,000）、get() 内 Date.now() 检查过期并自动 delete、cleanExpired() 遍历清理、create() 调用前执行 cleanExpired() [UA-004]
- [x] 1.3 验证 SessionStore 单元测试通过：`pnpm --filter server test sessions`

## 2. Cookie maxAge + Session 过期中间件测试与实现 [UA-006] [UA-009]

- [x] 2.1 编写/更新 auth 集成测试（auth.test.ts）：使用 `vi.useFakeTimers()` + `vi.advanceTimersByTime(25h)` 模拟过期，验证携带过期 cookie 返回 401 `{ error: "会话已过期，请重新登录" }`；更新现有 "returns 401 with invalid session cookie" 测试，增加 error message 断言；确保无 cookie 仍返回 "未登录" [UA-009]
- [x] 2.2 登录 setCookie 增加 `maxAge: 86400`；更新登录成功测试断言 `Set-Cookie` 包含 `Max-Age=86400` [UA-006]
- [x] 2.3 实现 sessionMiddleware：cookie 存在但 `sessionStore.get()` 返回 undefined 时返回 401 `{ error: "会话已过期，请重新登录" }`；cookie 不存在行为不变（user=null） [UA-009]
- [x] 2.4 验证 auth 集成测试通过：`pnpm --filter server test auth`

## 3. 前端 401 拦截测试与实现 [UA-029] [UA-030]

- [x] 3.1 新增 AuthContext 401 拦截测试（AuthContext.test.tsx）：mock fetch 返回 401 → 验证 dispatch `auth:expired` CustomEvent、user 变为 null、跳转到 `/login?expired=1`；mock 两次连续 401 → 验证 logout 仅调用一次（去重） [UA-029]
- [x] 3.2 更新 LoginPage 和 LoginPageDev 过期提示测试：`?expired=1` 参数 → 显示 `message.warning("会话已过期，请重新登录")`；不带参数 → 不显示 [UA-030]
- [x] 3.3 在 client.ts 的 `handleResponse` 中实现：`!response.ok` 分支内，若 `status === 401` 则 `window.dispatchEvent(new CustomEvent('auth:expired'))`，然后再 throw [UA-029]
- [x] 3.4 在 AuthContext 中监听 `auth:expired` 事件：`useRef` 标记去重，收到事件后 `window.location.href = '/login?expired=1'` [UA-029]
- [x] 3.5 在 LoginPage.tsx 和 LoginPageDev.tsx 中检测 URL search params `expired=1`，显示 `message.warning("会话已过期，请重新登录")` [UA-030]
- [x] 3.6 验证前端测试通过：`pnpm --filter web test`

## 4. 集成验证

- [x] 4.1 运行 `pnpm check` 确认 build + test + lint 全绿
