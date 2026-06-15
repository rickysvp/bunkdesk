"""Reproduce: drag left edge and capture all console output."""
from playwright.sync_api import sync_playwright

console_logs = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1400, "height": 900})
    page = context.new_page()
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

    page.goto("http://localhost:3000/", wait_until="networkidle", timeout=15000)
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

    blocks = page.locator("[data-booking-block]").all()
    block = blocks[0]
    bbox = block.bounding_box()
    name = block.evaluate("el => el.querySelector('.font-medium')?.innerText || el.innerText.split('·')[0]")
    print(f"Testing block '{name}'", flush=True)

    lx = bbox['x'] + bbox['width'] * 0.10
    ly = bbox['y'] + bbox['height'] / 2

    # Clear logs before drag
    pre_logs = list(console_logs)
    console_logs.clear()

    print(f"\n--- Drag LEFT edge LEFT by 200px ---", flush=True)
    page.mouse.move(lx, ly)
    page.mouse.down()
    page.wait_for_timeout(50)
    page.mouse.move(lx - 200, ly, steps=5)
    page.wait_for_timeout(50)
    page.mouse.up()
    page.wait_for_timeout(500)

    print(f"\n=== Console logs during drag ===", flush=True)
    for log in console_logs:
        if '[diag]' in log or 'error' in log.lower():
            print(f"  {log}", flush=True)

    blocks_after = page.locator("[data-booking-block]").all()
    print(f"\n=== After: {len(blocks_after)} blocks (was {len(blocks)}) ===", flush=True)
    for i, b in enumerate(blocks_after):
        bname = b.evaluate("el => el.querySelector('.font-medium')?.innerText || el.innerText.split('·')[0]")
        bbbox = b.bounding_box()
        print(f"  Block {i}: {bname!r} at {bbbox}", flush=True)

    page.screenshot(path="/tmp/drag_diag_final.png", full_page=False)

    browser.close()
