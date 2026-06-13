---
name: full-flow
description: 全流程验证——submitter 创建工单 → dispatcher 指派 → completer 完成，三角色流转
role: submitter
steps:
  # 阶段1: submitter 创建工单
  - action: relogin
    role: submitter
    password: changeme
  - action: goto
    path: /workbench/submitter
  - action: wait
    selector: .ant-btn, button
    timeout: 5000
  - action: fill
    selector: input[placeholder*="标题"]
    value: 全流程冒烟测试工单
  - action: fill
    selector: textarea, input[placeholder*="描述"]
    value: 这是一条由全流程冒烟场景自动创建的测试工单
  - action: click
    selector: button:has-text("提交工单")
  - action: wait
    timeout: 4000
  - action: check
    url: /workbench/submitter
    noError: true

  # 阶段2: dispatcher 指派给 completer
  - action: logout
  - action: relogin
    role: dispatcher
    password: changeme
  - action: wait
    selector: .ant-table, h1, h2
    timeout: 10000
  - action: click
    selector: .ant-table-row .ant-select
  - action: wait
    timeout: 1500
  - action: click
    selector: .ant-select-item-option:has-text("完成者")
  - action: wait
    timeout: 500
  - action: click
    selector: .ant-table-row button:has-text("指")
  - action: wait
    timeout: 3000

  # 阶段3: completer 开始处理 → 完成
  - action: logout
  - action: relogin
    role: completer
    password: changeme
  - action: wait
    selector: .ant-table, h1, h2
    timeout: 10000
  - action: click
    selector: button:has-text("开始处理")
  - action: wait
    timeout: 8000
  - action: click
    selector: button:has-text("完")
  - action: wait
    timeout: 3000
  - action: check
    noError: true
expect:
  noError: true
---

# 全流程验证

验证工单核心业务流程的三角色流转：submitter 创建 → dispatcher 指派 → completer 完成。

- **角色**: submitter → dispatcher → completer（通过 relogin 切换）
- **预期**: 全流程无错误，工单最终状态为已完成
