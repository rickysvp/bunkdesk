"""Click left/right edges of booking block to reproduce disappearance."""
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

    # Get list of booking blocks
    blocks = page.locator("[data-booking-block]").all()
    print(f"=== Initial: {len(blocks)} blocks ===", flush=True)

    for i, block in enumerate(blocks):
        bbox = block.bounding_box()
        name = block.evaluate("el => el.querySelector('.font-medium')?.innerText || el.innerText.split('·')[0]")

        # Click the LEFT edge
        lx = bbox['x'] + bbox['width'] * 0.10  # within left 20%
        ly = bbox['y'] + bbox['height'] / 2

        # What's at that point?
        elem_info = page.evaluate(f"""() => {{
            const el = document.elementFromPoint({lx}, {ly});
            if (!el) return null;
            return {{
                tag: el.tagName,
                dataResize: el.closest('[data-resize]')?.getAttribute('data-resize'),
                cls: el.className?.toString().slice(0, 150),
            }};
        }}""")
        print(f"\n--- Block {i} '{name}' (bbox: x={bbox['x']:.0f} w={bbox['width']:.0f}) ---", flush=True)
        print(f"  Element at LEFT edge ({lx:.0f},{ly:.0f}): {elem_info}", flush=True)

        # Actually click left edge
        page.mouse.move(lx, ly)
        page.mouse.down()
        page.wait_for_timeout(50)
        page.mouse.up()
        page.wait_for_timeout(500)

        # Check if block still exists with same data
        blocks_after = page.locator("[data-booking-block]").all()
        print(f"  After left-edge click: {len(blocks_after)} blocks (was {len(blocks)})", flush=True)

        if len(blocks_after) < len(blocks):
            print(f"  ❌ BLOCK DISAPPEARED!", flush=True)
            page.screenshot(path=f"/tmp/diag_disappear_{i}.png", full_page=False)
            break

    # Final state screenshot
    page.screenshot(path="/tmp/diag_after_edge_clicks.png", full_page=False)

    print(f"\n=== Errors: {len(errors)} ===", flush=True)
    for e in errors[:10]:
        print(f"  {e}", flush=True)

    browser.close()
