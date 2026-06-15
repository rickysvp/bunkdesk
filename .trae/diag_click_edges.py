"""Test simple click on edges (no movement)."""
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

    blocks = page.locator("[data-booking-block]").all()
    print(f"=== Initial: {len(blocks)} blocks ===", flush=True)
    initial_state = []
    for i, b in enumerate(blocks):
        bname = b.evaluate("el => el.querySelector('.font-medium')?.innerText || el.innerText.split('·')[0]")
        bbbox = b.bounding_box()
        initial_state.append((bname, bbbox))
    page.screenshot(path="/tmp/click_initial.png", full_page=False)

    # Test 1: Click left edge (no movement)
    block = blocks[0]
    bbox = block.bounding_box()
    lx = bbox['x'] + bbox['width'] * 0.10
    ly = bbox['y'] + bbox['height'] / 2
    print(f"\n--- Click LEFT edge ({lx:.0f},{ly:.0f}), no movement ---", flush=True)
    page.mouse.move(lx, ly)
    page.wait_for_timeout(100)
    page.mouse.down()
    page.wait_for_timeout(100)
    page.mouse.up()
    page.wait_for_timeout(500)

    blocks_after = page.locator("[data-booking-block]").all()
    print(f"=== After click LEFT: {len(blocks_after)} blocks (was {len(blocks)}) ===", flush=True)
    after_state = []
    for i, b in enumerate(blocks_after):
        bname = b.evaluate("el => el.querySelector('.font-medium')?.innerText || el.innerText.split('·')[0]")
        bbbox = b.bounding_box()
        after_state.append((bname, bbbox))
    page.screenshot(path="/tmp/click_left.png", full_page=False)

    # Compare
    print("\n=== Comparison ===", flush=True)
    for i, ((n1, b1), (n2, b2)) in enumerate(zip(initial_state, after_state)):
        if n1 != n2 or b1 != b2:
            print(f"  Block {i}: CHANGED from {n1!r} {b1} to {n2!r} {b2}", flush=True)
    if len(initial_state) != len(after_state):
        print(f"  ❌ COUNT MISMATCH! {len(initial_state)} → {len(after_state)}", flush=True)

    # Test 2: Click right edge (no movement)
    if blocks_after:
        block2 = blocks_after[0]
        bbox2 = block2.bounding_box()
        rx = bbox2['x'] + bbox2['width'] * 0.90
        ry = bbox2['y'] + bbox2['height'] / 2
        print(f"\n--- Click RIGHT edge ({rx:.0f},{ry:.0f}), no movement ---", flush=True)
        page.mouse.move(rx, ry)
        page.wait_for_timeout(100)
        page.mouse.down()
        page.wait_for_timeout(100)
        page.mouse.up()
        page.wait_for_timeout(500)

        blocks_after2 = page.locator("[data-booking-block]").all()
        print(f"=== After click RIGHT: {len(blocks_after2)} blocks ===", flush=True)
        for i, b in enumerate(blocks_after2):
            bname = b.evaluate("el => el.querySelector('.font-medium')?.innerText || el.innerText.split('·')[0]")
            bbbox = b.bounding_box()
            print(f"  Block {i}: {bname!r} at x={bbbox['x']:.0f} w={bbbox['width']:.0f}", flush=True)
        page.screenshot(path="/tmp/click_right.png", full_page=False)

    browser.close()
