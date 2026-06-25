"""
E2E tests for Code Review Diff Display.
Usage:
  python3 /Users/fxy/.claude/skills/webapp-testing/scripts/with_server.py \
    --server "npm run dev" --port 5173 \
    -- python3 tests/test_code_review_diff_display.py
"""
import re
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5173"
RESULTS = []


def log(msg):
    print(f"  [LOG] {msg}")


def pass_test(name):
    RESULTS.append(("PASS", name))
    print(f"  PASS: {name}")


def fail_test(name, reason=""):
    RESULTS.append(("FAIL", name, reason))
    print(f"  FAIL: {name}" + (f" - {reason}" if reason else ""))


def test_layout_switcher_visible(page):
    log("Test: layout switcher is visible on CodeReview page")
    page.goto(f"{BASE_URL}/code-review")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)
    if page.locator('[data-testid="layout-inline"]').count() > 0:
        pass_test("layout switcher present")
    else:
        fail_test("layout switcher present", "no [data-testid=layout-inline] found")


def test_layout_switch_changes_view(page):
    log("Test: clicking 分栏 switches to side-by-side layout")
    page.goto(f"{BASE_URL}/code-review")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)
    side_btn = page.locator('[data-testid="layout-side-by-side"]')
    if side_btn.count() == 0:
        fail_test("layout switch to side-by-side", "switcher not found")
        return
    side_btn.first.click()
    page.wait_for_timeout(300)
    if page.locator('[data-testid="diff-layout-side-by-side"]').count() > 0:
        pass_test("layout switch to side-by-side")
    else:
        fail_test("layout switch to side-by-side", "diff-layout-side-by-side not rendered")


def test_layout_persists_in_local_storage(page):
    log("Test: selected layout persists across reloads")
    page.goto(f"{BASE_URL}/code-review")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)
    page.locator('[data-testid="layout-file-explorer"]').first.click()
    page.wait_for_timeout(300)
    value = page.evaluate("() => localStorage.getItem('diffViewer.layout')")
    if value == "file-explorer":
        pass_test("layout persists in localStorage")
    else:
        fail_test("layout persists in localStorage", f"got {value!r}")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context()
        page = ctx.new_page()

        test_layout_switcher_visible(page)
        test_layout_switch_changes_view(page)
        test_layout_persists_in_local_storage(page)

        browser.close()

    passed = sum(1 for r in RESULTS if r[0] == "PASS")
    failed = len(RESULTS) - passed
    print(f"\n=== {passed} passed, {failed} failed ===")
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    import sys
    main()