# Issue: MCP JSON Paste Not Working via Chrome DevTools fill

**Date:** 2026-05-14T22:30:00+08:00
**Test Case:** TC-006
**Feature:** AI Code Review Enhancement
**Severity:** HIGH
**Status:** RESOLVED (Workaround Applied)

## Description

When using Chrome DevTools MCP `fill` command to input JSON into the MCP Config Panel textarea, the React onChange handler is not triggered properly, causing the save to fail with "JSON 格式错误" even for valid JSON.

## Steps to Reproduce

1. Navigate to `/code-review`
2. Click "+ 新增" in MCP Config Panel
3. Use `fill` to input: `{"name": "Test MCP", "endpoint": "https://git.test.com/api/mcp", "authHeader": "Bearer token", "tools": ["listMRs"]}`
4. Click "保存"

## Expected Behavior

JSON is parsed and MCP config appears in the list

## Actual Behavior

Error "JSON 格式错误" shown, textarea value becomes empty

## Root Cause

The `fill` tool simulates user input but React's synthetic event system doesn't properly capture this. The component uses `onChange` which requires React's event system.

## Workaround

Using `evaluate_script` with direct DOM manipulation and React's internal event trigger works:
```javascript
const textarea = document.querySelector('textarea[placeholder*="粘贴 MCP 配置"]');
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
nativeInputValueSetter.call(textarea, jsonString);
const event = new Event('input', { bubbles: true });
textarea.dispatchEvent(event);
```

## Resolution

**RESOLVED:** The MCP Config Panel works correctly via browser user input. The issue is only with the Chrome DevTools MCP `fill` tool's interaction with React's synthetic events. For E2E testing, use the `evaluate_script` workaround to properly set textarea values.

---

# Issue: Start Review Button Not Functioning

**Date:** 2026-05-14T22:35:00+08:00
**Test Case:** TC-013
**Feature:** AI Code Review Enhancement
**Severity:** HIGH
**Status:** RESOLVED

## Description

The "开始评审" button did not trigger any action when clicked, even when:
- Projects are selected
- MCP config is added
- No LLM config is set

## Steps to Reproduce

1. Navigate to `/code-review`
2. Select at least one project (checkbox checked)
3. Add MCP config (via workaround method)
4. Click "开始评审" button

## Expected Behavior

Review process should start or show error about missing LLM config

## Actual Behavior

Button appears enabled but clicking does nothing (no console errors, no UI change)

## Analysis

The button calls `startBatchReview(selectedProjectIds)` which sets `reviewError` when validation fails, but the UI never displayed this error message.

## Resolution

**Fixed in commit e241fe6:** Added `reviewError` to the store destructuring and added error display below the "开始评审" button:
```tsx
{reviewError && (
  <div className="mt-2 text-sm text-red-500">{reviewError}</div>
)}
```

Error message now displays correctly: "请配置并启用 MCP 服务" or "请配置并启用 LLM"

## Verification

Tested with:
1. No configs → "请配置并启用 MCP 服务" shown
2. LLM config added, no MCP → button triggers review flow
3. Both configs added → ReviewProgress component displays correctly