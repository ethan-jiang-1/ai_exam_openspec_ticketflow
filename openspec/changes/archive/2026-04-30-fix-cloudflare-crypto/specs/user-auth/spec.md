## MODIFIED Requirements

### Requirement: UA-004 内存 Session 存储

`apps/server/src/lib/sessions.ts` SHALL 导出 `SessionStore` 类（create / get / destroy / clear 方法），内存 Map 存储。Session ID SHALL 通过全局 `crypto.randomUUID()`（Web Crypto API）生成，SHALL NOT 依赖 Node.js 专属模块（如 `import from 'crypto'`），确保 Node.js 和 Cloudflare Workers 双运行时兼容。

#### Scenario: create 生成合法 UUID session ID

- **WHEN** 调用 `store.create('user-1')`
- **THEN** SHALL 返回符合 UUID v4 格式的字符串，格式为 `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`

#### Scenario: get 检索已创建的 session

- **WHEN** 先调用 `store.create('user-1')` 获取 id，再调用 `store.get(id)`
- **THEN** SHALL 返回 `{ userId: 'user-1', createdAt: <number> }`

#### Scenario: destroy 删除 session

- **WHEN** 先调用 `store.create('user-1')` 获取 id，再调用 `store.destroy(id)`，最后调用 `store.get(id)`
- **THEN** SHALL 返回 `undefined`

#### Scenario: clear 清空所有 session

- **WHEN** 调用 `store.create('user-1')` 和 `store.create('user-2')` 后调用 `store.clear()`
- **THEN** 所有后续 `store.get(...)` SHALL 返回 `undefined`
