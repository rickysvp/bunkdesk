"""Test small drags on left/right edges."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1400, "height": 900})
    page = context.new_page()

    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))
    page.on("console", lambda msg: errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)

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

    # Get initial state
    blocks = page.locator("[data-booking-block]").all()
    print(f"=== Initial: {len(blocks)} blocks ===", flush=True)
    page.screenshot(path="/tmp/drag_test_initial.png", full_page=False)

    # Get first block
    block = blocks[0]
    bbox = block.bounding_box()
    name = block.evaluate("el => el.querySelector('.font-medium')?.innerText || el.innerText.split('·')[0]")
    print(f"\nTesting block '{name}' at x={bbox['x']:.0f} w={bbox['width']:.0f}", flush=True)

    # Simulate clicking the LEFT edge and dragging slightly to the right (a common accidental gesture)
    lx = bbox['x'] + bbox['width'] * 0.10
    ly = bbox['y'] + bbox['height'] / 2
    print(f"\n--- Drag LEFT edge: ({lx:.0f},{ly:.0f}) → right by 5px ---", flush=True)
    page.mouse.move(lx, ly)
    page.mouse.down()
    page.wait_for_timeout(50)
    page.mouse.move(lx + 5, ly, steps=3)
    page.wait_for_timeout(50)
    page.mouse.up()
    page.wait_for_timeout(500)
    blocks_after = page.locator("[data-booking-block]").all()
    print(f"  After: {len(blocks_after)} blocks", flush=True)
    if len(blocks_after) != len(blocks):
        print(f"  ❌ CHANGED!", flush=True)
    page.screenshot(path="/tmp/drag_test_after_left.png", full_page=False)

    # Simulate clicking the RIGHT edge and dragging slightly to the left
    rx = bbox['x'] + bbox['width'] * 0.90
    print(f"\n--- Drag RIGHT edge: ({rx:.0f},{ly:.0f}) → left by 5px ---", flush=True)
    page.mouse.move(rx, ly)
    page.mouse.down()
    page.wait_for_timeout(50)
    page.mouse.move(rx - 5, ly, steps=3)
    page.wait_for_timeout(50)
    page.mouse.up()
    page.wait_for_timeout(500)
    blocks_after2 = page.locator("[data-booking-block]").all()
    print(f"  After: {len(blocks_after2)} blocks", flush=True)
    if len(blocks_after2) != len(blocks):
        print(f"  ❌ CHANGED!", flush=True)
    page.screenshot(path="/tmp/drag_test_after_right.png", full_page=False)

    # Try a much larger drag on left to left (to drag the block out of view?)
    print(f"\n--- Drag LEFT edge: ({lx:.0f},{ly:.0f}) → LEFT by 200px (should snap back, max=-30 days) ---", flush=True)
    page.mouse.move(lx, ly)
    page.mouse.down()
    page.wait_for_timeout(50)
    page.mouse.move(lx - 200, ly, steps=5)
    page.wait_for_timeout(50)
    page.mouse.up()
    page.wait_for_timeout(500)
    blocks_after3 = page.locator("[data-booking-block]").all()
    print(f"  After: {len(blocks_after3)} blocks", flush=True)
    if len(blocks_after3) != len(blocks):
        print(f"  ❌ CHANGED!", flush=True)
    page.screenshot(path="/tmp/drag_test_after_leftbig.png", full_page=False)

    # Try a drag on right to right
    print(f"\n--- Drag RIGHT edge: ({rx:.0f},{ly:.0f}) → RIGHT by 200px ---", flush=True)
    page.mouse.move(rx, ly)
    page.mouse.down()
    page.wait_for_timeout(50)
    page.mouse.move(rx + 200, ly, steps=5)
    page.wait_for_timeout(50)
    page.mouse.up()
    page.wait_for_timeout(500)
    blocks_after4 = page.locator("[data-booking-block]").all()
    print(f"  After: {len(blocks_after4)} blocks", flush=True)
    if len(blocks_after4) != len(blocks):
        print(f"  ❌ CHANGED!", flush=True)
    page.screenshot(path="/tmp/drag_test_after_rightbig.png", full_page=False)

    print(f"\n=== Errors: {len(errors)} ===", flush=True)
    for e in errors[:10]:
        print(f"  {e}", flush=True)

    browser.close()
