"""Test if the green check-in button is clickable."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1400, "height": 900})
    page = context.new_page()

    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))
    page.on("console", lambda msg: errors.append(f"[{msg.type}] {msg.text}") if msg.type in ("error", "warning") else None)

    page.goto("http://localhost:3000/", wait_until="networkidle", timeout=15000)
    page.evaluate("() => localStorage.clear()")
    page.reload()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)

    page.locator("text=立即体验").first.click()
    page.wait_for_timeout(2500)
    page.locator("text=Emma").first.click()
    page.wait_for_timeout(1500)
    page.locator("input[type='password']").first.fill("1234")
    page.locator("button:has-text('登录')").first.click(force=True)
    page.wait_for_timeout(3000)
    page.locator("text=床位看板").first.click()
    page.wait_for_timeout(2000)

    # Find blocks that have a green check-in button (reservation)
    blocks = page.locator("[data-booking-block]").all()
    print(f"=== {len(blocks)} blocks total ===", flush=True)

    for i, b in enumerate(blocks):
        name = b.evaluate("el => el.querySelector('.font-medium')?.innerText || el.innerText.split('·')[0]")
        bbox = b.bounding_box()
        if not bbox:
            continue
        # Hover over the block
        b.hover(force=True)
        page.wait_for_timeout(500)

        # Check for green check-in button
        check_in_btn = b.locator("button[title='Check-in']").first
        if check_in_btn.count() > 0:
            print(f"\n--- Block {i} '{name}' HAS Check-in button ---", flush=True)
            btn_box = check_in_btn.bounding_box()
            if btn_box:
                print(f"  button bbox: {btn_box}", flush=True)
                # Check what element is at the button's center
                cx = btn_box['x'] + btn_box['width']/2
                cy = btn_box['y'] + btn_box['height']/2
                elem_info = page.evaluate(f"""() => {{
                    const el = document.elementFromPoint({cx}, {cy});
                    if (!el) return null;
                    return {{
                        tag: el.tagName,
                        title: el.getAttribute('title'),
                        cls: el.className?.toString().slice(0, 200),
                        pointerEvents: window.getComputedStyle(el).pointerEvents,
                    }};
                }}""")
                print(f"  elementFromPoint at ({cx:.0f},{cy:.0f}): {elem_info}", flush=True)

                # Try to click
                page.screenshot(path=f"/tmp/greenbtn_{i}_before.png", full_page=False)
                check_in_btn.click(force=True)
                page.wait_for_timeout(800)
                page.screenshot(path=f"/tmp/greenbtn_{i}_after.png", full_page=False)

                # Check if dialog opened
                dialog_count = page.locator("[data-slot='dialog-content']").count()
                print(f"  After click: {dialog_count} dialog(s) open", flush=True)

                # Check for any toast/notification
                toasts = page.locator("[role='status'], [role='alert']").count()
                print(f"  Toasts/alerts: {toasts}", flush=True)
                break

    if errors:
        print(f"\n=== Errors ===", flush=True)
        for e in errors[:10]:
            print(f"  {e}", flush=True)

    browser.close()
