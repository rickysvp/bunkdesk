"""Inspect booking block DOM."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1400, "height": 900})
    page = context.new_page()
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

    # Inspect each booking block
    blocks = page.locator("[data-booking-block]").all()
    print(f"=== Found {len(blocks)} booking blocks ===", flush=True)

    for i, block in enumerate(blocks):
        bbox = block.bounding_box()
        # Get full text including hidden
        full_text = block.evaluate("el => el.innerText")
        # Get the text label text
        text_label = block.locator(".truncate").first
        label_text = text_label.inner_text() if text_label.count() > 0 else "(no label)"
        # Get all spans
        spans_info = block.evaluate("""el => {
            const spans = el.querySelectorAll('span');
            return Array.from(spans).map(s => ({
                text: s.innerText,
                visible: s.offsetWidth > 0 && s.offsetHeight > 0,
                rect: {w: s.offsetWidth, h: s.offsetHeight}
            })).filter(s => s.text);
        }""")
        print(f"\n--- Block {i} (bbox: {bbox}) ---", flush=True)
        print(f"  innerText: {full_text!r}", flush=True)
        print(f"  label visible: {label_text!r}", flush=True)
        for j, s in enumerate(spans_info):
            print(f"  span[{j}]: {s}", flush=True)

    browser.close()
