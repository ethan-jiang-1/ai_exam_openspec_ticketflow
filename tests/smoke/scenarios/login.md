---
name: login
description: 登录页验证——admin 用户登录后应跳转到管理员工作台
role: admin
steps:
  - action: goto
    path: /login
  - action: fill
    selector: input[placeholder*="用户名"]
    value: admin
  - action: fill
    selector: input[placeholder*="密码"]
    value: admin
  - action: click
    selector: button:has-text("登")
  - action: wait
    selector: .ant-layout, .ant-table, h1
    timeout: 10000
  - action: check
    url: /workbench/admin
    contains: 用户管理
expect:
  url: /workbench/admin
  contains: 用户管理
  noError: true
---

# 登录页验证

验证 admin 用户能正常登录并跳转到管理员工作台。

- **角色**: admin
- **预期**: 登录后 URL 包含 `/workbench/admin`，页面显示"用户管理"
