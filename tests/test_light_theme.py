from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # Capture console logs
    logs = []
    page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))

    print("=== Testing Light Theme with Flowing Background ===")
    page.goto('http://localhost:5173')
    page.wait_for_load_state('networkidle')

    # Take screenshot
    page.screenshot(path='/tmp/light_flow_dashboard.png', full_page=True)
    print("Screenshot saved to /tmp/light_flow_dashboard.png")

    # Check for elements
    sidebar = page.locator('aside').first
    print(f"Sidebar visible: {sidebar.is_visible()}")

    # Check for primary color elements
    primary_elements = page.locator('.text-primary-500, .bg-primary-500, .from-primary-500').count()
    print(f"Primary color elements: {primary_elements}")

    # Check icons
    icons = page.locator('.material-symbols-outlined').all()
    print(f"Material icons found: {len(icons)}")

    # Check for gradient buttons
    gradient_buttons = page.locator('.from-primary-500, .to-accent-500').count()
    print(f"Gradient elements: {gradient_buttons}")

    # Check for aria-labels
    aria_buttons = page.locator('[aria-label]').all()
    print(f"Elements with aria-label: {len(aria_buttons)}")

    # Check for errors
    errors = [l for l in logs if 'error' in l.lower()]
    if errors:
        print("Console errors:")
        for e in errors[:5]:
            print(f"  {e}")
    else:
        print("✓ No console errors")

    browser.close()
    print("\n=== Light Theme Test Complete ===")
