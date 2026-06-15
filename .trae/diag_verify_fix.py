"""Verify the fix: drag left edge should now show partial block, not disappearance."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1400, "height": 900})
    page = context.new_page()

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

    # Initial state
    blocks = page.locator("[data-booking-block]").all()
    print(f"=== Initial: {len(blocks)} blocks ===", flush=True)
    page.screenshot(path="/tmp/fix_initial.png", full_page=False)

    # Drag left edge of first block far to the left
    block = blocks[0]
    bbox = block.bounding_box()
    lx = bbox['x'] + bbox['width'] * 0.10
    ly = bbox['y'] + bbox['height'] / 2

    print(f"\n--- Drag LEFT edge LEFT by 200px ---", flush=True)
    page.mouse.move(lx, ly)
    page.mouse.down()
    page.wait_for_timeout(50)
    page.mouse.move(lx - 200, ly, steps=5)
    page.wait_for_timeout(50)
    page.mouse.up()
    page.wait_for_timeout(500)

    blocks_after = page.locator("[data-booking-block]").all()
    print(f"=== After: {len(blocks_after)} blocks (was {len(blocks)}) ===", flush=True)
    for i, b in enumerate(blocks_after):
        bname = b.evaluate("el => el.querySelector('.font-medium')?.innerText || el.innerText.split('·')[0]")
        bbbox = b.bounding_box()
        print(f"  Block {i}: {bname!r} at {bbbox}", flush=True)
    page.screenshot(path="/tmp/fix_after_left.png", full_page=False)

    # Drag right edge of the same block far to the right
    if blocks_after:
        block2 = blocks_after[0]
        bbox2 = block2.bounding_box()
        rx = bbox2['x'] + bbox2['width'] * 0.90
        ry = bbox2['y'] + bbox2['height'] / 2
        print(f"\n--- Drag RIGHT edge RIGHT by 400px ---", flush=True)
        page.mouse.move(rx, ry)
        page.mouse.down()
        page.wait_for_timeout(50)
        page.mouse.move(rx + 400, ry, steps=5)
        page.wait_for_timeout(50)
        page.mouse.up()
        page.wait_for_timeout(500)

        blocks_after2 = page.locator("[data-booking-block]").all()
        print(f"=== After right drag: {len(blocks_after2)} blocks ===", flush=True)
        for i, b in enumerate(blocks_after2):
            bname = b.evaluate("el => el.querySelector('.font-medium')?.innerText || el.innerText.split('·')[0]")
            bbbox = b.bounding_box()
            print(f"  Block {i}: {bname!r} at {bbbox}", flush=True)
        page.screenshot(path="/tmp/fix_after_right.png", full_page=False)

    browser.close()
