from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # Capture console logs
    logs = []
    page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))

    print("=== Testing Dashboard ===")
    page.goto('http://localhost:5173')
    page.wait_for_load_state('networkidle')

    # Take screenshot
    page.screenshot(path='/tmp/dashboard.png', full_page=True)
    print("Screenshot saved to /tmp/dashboard.png")

    # Check for projects
    content = page.content()
    if "Project" in content or "Dashboard" in content:
        print("✓ Dashboard loaded successfully")

    # Check for errors in console
    errors = [l for l in logs if 'error' in l.lower()]
    if errors:
        print("Console errors found:")
        for e in errors:
            print(f"  {e}")
    else:
        print("✓ No console errors")

    browser.close()
    print("\n=== Test Complete ===")
