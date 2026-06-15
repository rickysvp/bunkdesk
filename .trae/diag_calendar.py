"""Screenshot the bed board."""
from playwright.sync_api import sync_playwright

console_logs = []
page_errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1400, "height": 900})
    page = context.new_page()

    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
    page.on("pageerror", lambda err: page_errors.append(str(err)))

    page.goto("http://localhost:3000/", wait_until="networkidle", timeout=15000)
    page.wait_for_timeout(1500)

    try_button = page.locator("text=立即体验").first
    if try_button.count() > 0:
        try_button.click()
        page.wait_for_timeout(2500)

    for name in ["Emma"]:
        btn = page.locator(f"text={name}").first
        if btn.count() > 0:
            btn.click()
            page.wait_for_timeout(1500)
            break

    pin_input = page.locator("input[type='password']").first
    pin_input.fill("1234")
    login_btn = page.locator("button:has-text('登录')").first
    login_btn.click(force=True)
    page.wait_for_timeout(3000)

    bed_tab = page.locator("text=床位看板").first
    if bed_tab.count() > 0:
        bed_tab.click()
        page.wait_for_timeout(2000)

    # Now screenshot
    page.screenshot(path="/tmp/diag_calendar_state.png", full_page=False)
    page.screenshot(path="/tmp/diag_calendar_full.png", full_page=True)

    booking_blocks = page.locator("[data-booking-block]").count()
    print(f"=== {booking_blocks} booking blocks on page ===", flush=True)

    # Check page errors
    print("\n=== Page errors ===", flush=True)
    for e in page_errors:
        print(f"  ERROR: {e}", flush=True)
    if not page_errors:
        print("  (none)", flush=True)

    print("\n=== Console logs ===", flush=True)
    for log in console_logs:
        print(f"  {log}", flush=True)

    browser.close()
