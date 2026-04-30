## Context

当前 `SessionStore` 是纯内存 Map，session 无过期机制，cookie 无 `maxAge`。用户登录后 session 永久有效，直到浏览器关闭（session cookie）或手动登出。需要补上 24h TTL 这个基本安全机制。

## Goals / Non-Goals

**Goals:**
- Session 24h 自动过期，过期后 API 返回 401 `"会话已过期，请重新登录"`
- Cookie `maxAge` 设为 86400s（24h），浏览器侧也同步过期
- 前端任何 API 调用收到 401 时，自动登出 + 跳转 `/login` + 显示过期提示
- 过期 session 内存可被清理，不泄漏

**Non-Goals:**
- 不引入 Redis/DB 持久化 session（仍为内存存储）
- 不改变现有登录/登出流程
- 不引入 refresh token 或滑动过期
- 不添加 session 计数或并发登录限制

## Decisions

### 1. TTL 检查放在 `get()` 方法中

**选择**：`SessionStore.get()` 内部比较 `Date.now() - session.createdAt > TTL`，过期则自动 `delete` 并返回 `undefined`。

**替代方案**：
- 定时器轮询清理：增加复杂度（setInterval 管理），对 MVP1 过度设计
- 仅在 `cleanExpired()` 中清理，`get()` 不管：过期 session 仍可被访问，存在安全窗口

**理由**：`get()` 是唯一读取入口，在此检查零额外开销，且保证过期后立即不可访问。

### 2. Cookie 存在但 session 不存在 → 区分处理

**选择**：`sessionMiddleware` 中，若 cookie 存在但 `get()` 返回 `undefined`，返回 401 `{ error: "会话已过期，请重新登录" }`；若 cookie 不存在，保持现有行为（`user=null`，由 `requireAuth` 返回 401 `"未登录"`）。

**理由**：cookie 存在说明曾经登录过，session 消失只可能是过期或服务端清理，前端应提示"过期"而非"未登录"，引导用户重新登录。

### 3. Cookie maxAge 与 session TTL 一致

**选择**：登录时 `setCookie(c, 'ticketflow-session', sessionId, { ..., maxAge: 86400 })`。

**理由**：双重保障——即使服务端 TTL 检查被绕过，浏览器也会在 24h 后自动删除 cookie。`maxAge` 单位是秒，86400 = 24 × 3600。

### 4. 前端 401 拦截：CustomEvent 模式

**选择**：`client.ts` 在收到 401 响应时，`window.dispatchEvent(new CustomEvent('auth:expired'))`。`AuthContext` 在 `useEffect` 中监听该事件，触发 logout + 跳转 `/login?expired=1`。`LoginPage` 检测 URL 参数 `expired=1`，显示 `message.warning("会话已过期，请重新登录")`。

**替代方案**：
- AuthContext 提供 fetch wrapper：client.ts 需要导入 AuthContext，导致循环依赖
- 每个组件自行处理 401：重复代码，容易遗漏

**理由**：CustomEvent 解耦 client.ts 和 AuthContext，无需 import 循环，且所有 API 调用自动覆盖。

**实现细节**：`client.ts` 的 `handleResponse` 在检查 `!response.ok` 后、throw 前，若 `status === 401` 则 `window.dispatchEvent(new CustomEvent('auth:expired'))`。AuthContext 使用 `window.location.href = '/login?expired=1'` 跳转（全页刷新），避免引入 `useNavigate` 和 Router 上下文耦合。去重通过 `useRef(false)` 标记实现，dispatch 时置 true，跳转后重置。

### 5. 过期清理策略

**选择**：`create()` 时调用 `cleanExpired()`（惰性清理），`cleanExpired()` 遍历 Map 删除所有过期条目。同时导出 `cleanExpired()` 供测试使用。

**理由**：`create()` 调用频率低（仅在登录时），开销可忽略。无需引入 setInterval。

## Directory Layout

```
apps/server/src/
├── lib/
│   └── sessions.ts          # +TTL 参数, get() 过期检查, cleanExpired()
├── middleware/
│   └── auth.ts              # sessionMiddleware: cookie 存在 + session 过期 → 401
├── routes/
│   └── auth.ts              # login: setCookie +maxAge
└── __tests__/
    ├── sessions.test.ts     # +TTL 过期测试, cleanExpired 测试
    └── auth.test.ts         # +session 过期 401 测试

apps/web/src/
├── api/
│   └── client.ts              # handleResponse: 401 → CustomEvent('auth:expired')
├── context/
│   └── AuthContext.tsx         # +监听 auth:expired → logout + location.href 跳转（含去重）
├── pages/
│   ├── LoginPage.tsx           # +检测 ?expired=1 → message.warning
│   └── LoginPageDev.tsx        # +检测 ?expired=1 → message.warning
└── __tests__/
    ├── AuthContext.test.tsx    # 新增: mock fetch 401 → 验证 logout + 跳转 + 去重
    ├── LoginPage.test.tsx      # +?expired=1 → 显示 warning 消息
    └── LoginPageDev.test.tsx   # +?expired=1 → 显示 warning 消息
```

## Risks / Trade-offs

- [内存 session 重启丢失] → 当前已是内存存储，TTL 不改变此特性。用户需在服务重启后重新登录，属于已知限制
- [过期判断依赖系统时钟] → `Date.now()` 在单机上一致；Cloudflare Workers 也支持 `Date.now()`，无兼容问题
- [CustomEvent 仅在浏览器环境可用] → `client.ts` 仅在浏览器中使用，安全
- [惰性清理可能导致少量过期 session 残留] → 最多残留到下次登录，内存占用微不足道（每个 session < 100 bytes）

## Open Questions

1. **24h 是否固定，还是可配置？** — 当前设计固定 24h。若未来需要可配置，只需将 TTL 作为 `SessionStore` 构造参数，不阻塞当前实现
2. **是否需要"滑动过期"（每次请求刷新 TTL）？** — 当前为绝对过期（从登录时刻算起）。滑动过期更友好但更复杂，留到 MVP2 评估
3. **Cloudflare Workers 中 `crypto.randomUUID()` 是否可用？** — 已在 UA-004 中验证，本 change 不改变 ID 生成方式
