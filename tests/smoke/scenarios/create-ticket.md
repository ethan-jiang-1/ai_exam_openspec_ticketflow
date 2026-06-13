---
name: create-ticket
description: 工单创建验证——submitter 登录后创建工单，验证工单显示在列表中
role: submitter
steps:
  - action: goto
    path: /login
  - action: fill
    selector: input[placeholder*="用户名"]
    value: submitter
  - action: fill
    selector: input[placeholder*="密码"]
    value: changeme
  - action: click
    selector: button:has-text("登")
  - action: wait
    selector: h1, .ant-table, .ant-btn
    timeout: 10000
  - action: goto
    path: /workbench/submitter
  - action: wait
    selector: .ant-btn, button
    timeout: 5000
  - action: fill
    selector: input[placeholder*="标题"]
    value: 冒烟测试工单
  - action: fill
    selector: textarea, input[placeholder*="描述"]
    value: 这是一条由冒烟场景自动创建的测试工单
  - action: click
    selector: button:has-text("提交工单")
  - action: wait
    timeout: 3000
  - action: check
    url: /workbench/submitter
    contains: 冒烟测试工单
    noError: true
expect:
  url: /workbench/submitter
  contains: 冒烟测试工单
  noError: true
---

# 工单创建验证

验证 submitter 角色能正常登录、创建工单，新工单显示在列表中。

- **角色**: submitter
- **预期**: 提交后页面仍为 `/workbench/submitter`，列表中出现刚创建的工单标题
