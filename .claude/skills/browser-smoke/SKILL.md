---
name: browser-smoke
description: Browser smoke test — open a deployed URL with Playwright, measure load speed, extract DOM content, semi-randomly click around, detect errors, produce human-readable report.
metadata:
  author: ticketflow
  version: "1.0"
---

Browser smoke test skill. Use Playwright to open a deployed URL, measure page load speed, extract DOM content summary, semi-randomly click interactive elements, detect console/network/antd errors, and produce a structured JSON + human-readable Markdown report.

## Core Engine

The core engine is `.claude/skills/browser-smoke/scripts/browser-smoke.mjs` — a standalone Playwright script that does all the actual browser automation, data collection, and report generation. This skill is the user-facing layer; the script is what does the work.

The script can also be invoked directly:
```bash
node .claude/skills/browser-smoke/scripts/browser-smoke.mjs --url <url>
# or via pnpm
pnpm smoke -- --url <url>
```

This is useful for CI pipelines or cron jobs where Claude Code is not available.

## Commands

| Input | Action |
|-------|--------|
| `/browser-smoke on` | Enable smoke testing |
| `/browser-smoke off` | Disable smoke testing |
| `/browser-smoke status` | Show current state (enabled/disabled + default URL) |
| `/browser-smoke` | Run smoke test against the default URL |
| `/browser-smoke <url>` | Run smoke test against a specific URL |
| `/browser-smoke default-url <url>` | Change the default URL |
| `/browser-smoke <url> --clicks N --readonly` | Run with custom options |

## State File

The skill maintains state in `.browser-smoke-state.json` at the project root:

```json
{
  "enabled": true,
  "defaultUrl": "https://ai-exam-openspec-ticketflow.ethan1-jiang.workers.dev"
}
```

**CRITICAL**: Always READ the file first, modify only the relevant field, then WRITE back. Never overwrite the entire file with only one field — you must preserve both `enabled` and `defaultUrl`.

On first use (file does not exist), create it with the defaults above.

## Running a Smoke Test

When the user invokes `/browser-smoke` or `/browser-smoke <url>`:

1. **Check state**: Read `.browser-smoke-state.json`.
   - If `enabled` is `false`, reply: "冒烟测试已关闭，输入 `/browser-smoke on` 开启" and STOP. Do NOT run the script.
   - If `enabled` is `true`, continue.

2. **Determine URL**: If no URL provided, use `defaultUrl` from state file. If URL provided, use it directly.

3. **Run the script**:
   ```bash
   node .claude/skills/browser-smoke/scripts/browser-smoke.mjs --url <url> [--clicks N] [--readonly] [--output-dir <dir>]
   ```
   Pass through any additional flags the user provided.

4. **Read the JSON output**: The script prints a JSON object to stdout. Parse it.

5. **Present the report** in Chinese, covering these four dimensions:

   **加载速度**: Report `firstByte`, `domReady`, `fullLoad` in ms, and the verdict (快/正常/慢/不可用).

   **页面内容**: Report `title`, `interactiveCount`, whether `hasErrorKeywords` is true. Summarize `visibleTextSample` briefly (what the page looks like).

   **交互探测**: Report how many elements were clicked, breakdown of results (navigated/contentChanged/noChange/clickFailed). If any click produced errors, list them.

   **综合判定**:
   - 🟢 健康 (healthy) — no errors of any kind
   - 🟡 警告 (warning) — slow loading but no other errors
   - 🔴 异常 (unhealthy) — errors found

   If there are errors, list each one with details (type, message, URL, status code).

6. **Tell the user where the report files are saved**:
   ```
   data/smoke-reports/<timestamp>.json  ← machine-readable
   data/smoke-reports/<timestamp>.md    ← human-readable
   ```

## State Management Commands

### `/browser-smoke on`
1. Read `.browser-smoke-state.json`
2. Set `enabled` to `true`, keep `defaultUrl` unchanged
3. Write back
4. Reply: "冒烟测试已开启 ✅"

### `/browser-smoke off`
1. Read `.browser-smoke-state.json`
2. Set `enabled` to `false`, keep `defaultUrl` unchanged
3. Write back
4. Reply: "冒烟测试已关闭，需要时输入 `/browser-smoke on` 重新开启"

### `/browser-smoke status`
1. Read `.browser-smoke-state.json`
2. Reply with enabled state and default URL:
   - "冒烟测试当前状态：已开启 ✅，默认 URL：<defaultUrl>" or
   - "冒烟测试当前状态：已关闭 ❌，默认 URL：<defaultUrl>"

### `/browser-smoke default-url <url>`
1. Read `.browser-smoke-state.json`
2. Set `defaultUrl` to `<url>`, keep `enabled` unchanged
3. Write back
4. Reply: "默认测试 URL 已更新为 <url>"

## Viewing Past Reports

If the user asks to see a past report, read the `.md` file from `data/smoke-reports/` and present it.
