"""Clear localStorage to start fresh and test single click on edge."""
from playwright.sync_api import sync_playwright

console_logs = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1400, "height": 900})
    page = context.new_page()
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

    # Clear localStorage to start fresh
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

    # Get fresh blocks
    blocks = page.locator("[data-booking-block]").all()
    print(f"=== Fresh: {len(blocks)} blocks ===", flush=True)
    for i, b in enumerate(blocks):
        bname = b.evaluate("el => el.querySelector('.font-medium')?.innerText || el.innerText.split('·')[0]")
        bbbox = b.bounding_box()
        print(f"  Block {i}: {bname!r} at x={bbbox['x']:.0f} w={bbbox['width']:.0f}", flush=True)

    # Clear logs
    console_logs.clear()

    # Click left edge of FIRST block (Alex Johnson)
    block = blocks[0]
    bbox = block.bounding_box()
    bname = block.evaluate("el => el.querySelector('.font-medium')?.innerText || el.innerText.split('·')[0]")
    lx = bbox['x'] + bbox['width'] * 0.10
    ly = bbox['y'] + bbox['height'] / 2
    print(f"\n--- Single click on LEFT edge of {bname!r} ({lx:.0f},{ly:.0f}) ---", flush=True)

    page.mouse.move(lx, ly)
    page.wait_for_timeout(100)
    page.mouse.down()
    page.wait_for_timeout(100)
    page.mouse.up()
    page.wait_for_timeout(500)

    print(f"\n=== Diag logs ===", flush=True)
    for log in console_logs:
        if '[diag]' in log:
            print(f"  {log}", flush=True)

    blocks_after = page.locator("[data-booking-block]").all()
    print(f"\n=== After click: {len(blocks_after)} blocks ===", flush=True)
    for i, b in enumerate(blocks_after):
        bname2 = b.evaluate("el => el.querySelector('.font-medium')?.innerText || el.innerText.split('·')[0]")
        bbbox = b.bounding_box()
        print(f"  Block {i}: {bname2!r} at x={bbbox['x']:.0f} w={bbbox['width']:.0f}", flush=True)
    page.screenshot(path="/tmp/click_fresh.png", full_page=False)

    browser.close()
