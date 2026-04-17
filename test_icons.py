from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # Capture console logs
    logs = []
    page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))

    print("=== Testing Icons After Fix ===")
    page.goto('http://localhost:5173')
    page.wait_for_load_state('networkidle')

    # Take screenshot
    page.screenshot(path='/tmp/dashboard_icons.png', full_page=True)
    print("Screenshot saved to /tmp/dashboard_icons.png")

    # Check for material symbols icons
    icon_elements = page.locator('.material-symbols-outlined').all()
    print(f"Found {len(icon_elements)} Material Symbols icons")

    # Check specific icons
    sidebar_icons = page.locator('aside .material-symbols-outlined').all()
    print(f"Sidebar icons: {len(sidebar_icons)}")

    # Check for errors in console
    errors = [l for l in logs if 'error' in l.lower()]
    if errors:
        print("Console errors found:")
        for e in errors[:5]:
            print(f"  {e}")
    else:
        print("✓ No console errors")

    browser.close()
    print("\n=== Icon Test Complete ===")
