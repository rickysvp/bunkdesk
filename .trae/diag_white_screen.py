"""Diagnose white screen on card click in BedBoard."""
from playwright.sync_api import sync_playwright

console_logs = []
page_errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1400, "height": 900})
    page = context.new_page()

    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
    page.on("pageerror", lambda err: page_errors.append(str(err)))

    print("=== Navigating to http://localhost:3000/ ===", flush=True)
    page.goto("http://localhost:3000/", wait_until="networkidle", timeout=15000)
    page.wait_for_timeout(1500)

    # Click "Try it now" / 立即体验 to enter app
    try_button = page.locator("text=立即体验").first
    if try_button.count() > 0:
        print("=== Clicking '立即体验' to enter app ===", flush=True)
        try_button.click()
        page.wait_for_timeout(2500)

    # Click a user to log in
    for name in ["Emma", "Maria", "Jake", "Tony"]:
        btn = page.locator(f"text={name}").first
        if btn.count() > 0:
            print(f"=== Selecting {name} ===", flush=True)
            btn.click()
            page.wait_for_timeout(1500)
            break

    # Click login button 登录
    login_btn = page.locator("button:has-text('登录')").first
    if login_btn.count() > 0:
        print("=== Filling PIN 1234 ===", flush=True)
        pin_input = page.locator("input[type='password']").first
        pin_input.fill("1234")
        page.wait_for_timeout(500)
        print("=== Clicking 登录 button ===", flush=True)
        login_btn.click(force=True)
        page.wait_for_timeout(3000)

    # Navigate to 床位看板 (Bed Board) tab
    bed_tab = page.locator("text=床位看板").first
    if bed_tab.count() > 0:
        print("=== Clicking 床位看板 tab ===", flush=True)
        bed_tab.click()
        page.wait_for_timeout(2000)

    booking_blocks = page.locator("[data-booking-block]").count()
    print(f"=== Found {booking_blocks} booking blocks on page ===", flush=True)

    if booking_blocks == 0:
        body_text = page.locator("body").inner_text()[:800]
        print(f"=== Body text (first 800 chars): {body_text[:800]} ===", flush=True)
        page.screenshot(path="/tmp/diag_no_bookings.png", full_page=True)
    else:
        print("=== Clicking first booking block ===", flush=True)
        first_block = page.locator("[data-booking-block]").first
        first_block.scroll_into_view_if_needed()
        bbox = first_block.bounding_box()
        print(f"  bounding box: {bbox}", flush=True)

        first_block.click(force=True)
        page.wait_for_timeout(2000)

        # Check for dialogs after the click
        page.screenshot(path="/tmp/diag_after_click.png", full_page=False)
        dialogs_role = page.locator("[role='dialog']").count()
        dialogs_data = page.locator("[data-slot='dialog-content']").count()
        print(f"=== After click — dialogs: role={dialogs_role} data-slot={dialogs_data} ===", flush=True)

        if dialogs_data > 0:
            dlg = page.locator("[data-slot='dialog-content']").first
            dlg_text = dlg.inner_text()
            print(f"=== Dialog content (first 1500 chars):\n{dlg_text[:1500]} ===", flush=True)
            page.screenshot(path="/tmp/diag_dialog.png", full_page=True)
        else:
            # No dialog — check what happened. Maybe modal data
            print("=== No dialog visible. Check body text for clues ===", flush=True)
            body_after = page.locator("body").inner_text()[:800]
            print(f"=== Body after click:\n{body_after} ===", flush=True)

    # Check both possible dialog selectors
    dialogs_role = page.locator("[role='dialog']").count()
    dialogs_data = page.locator("[data-slot='dialog-content']").count()
    dialogs_popup = page.locator("[data-slot='dialog-popup']").count()
    print(f"=== dialogs: role={dialogs_role} data-slot={dialogs_data} popup={dialogs_popup} ===", flush=True)

    if dialogs_data > 0:
        dlg = page.locator("[data-slot='dialog-content']").first
        dlg_text = dlg.inner_text()
        print(f"=== Dialog content (first 1500 chars):\n{dlg_text[:1500]} ===", flush=True)
        page.screenshot(path="/tmp/diag_dialog.png", full_page=True)
    elif dialogs_role > 0:
        dlg = page.locator("[role='dialog']").first
        dlg_text = dlg.inner_text()
        print(f"=== Dialog content (first 1500 chars):\n{dlg_text[:1500]} ===", flush=True)
        page.screenshot(path="/tmp/diag_dialog.png", full_page=True)
    else:
        print("=== No dialog appeared after click ===", flush=True)
        # Try to find any element with the guest name
        body_after = page.locator("body").inner_text()[:1000]
        print(f"=== Body text after click (first 1000):\n{body_after} ===", flush=True)

    print("\n=== Page errors ===", flush=True)
    for e in page_errors:
        print(f"  ERROR: {e}", flush=True)
    if not page_errors:
        print("  (none)", flush=True)

    print("\n=== Console logs (last 40) ===", flush=True)
    for log in console_logs[-40:]:
        print(f"  {log}", flush=True)

    browser.close()
