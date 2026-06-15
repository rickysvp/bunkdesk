"""Smoke test for the new top-nav refactor."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1400, "height": 900})
    page = context.new_page()

    errors = []
    page.on("pageerror", lambda err: errors.append(f"PAGEERROR: {err}"))
    page.on("console", lambda msg: errors.append(f"[{msg.type}] {msg.text}") if msg.type in ("error",) else None)

    page.goto("http://localhost:3000/", wait_until="networkidle", timeout=15000)
    page.evaluate("() => localStorage.clear()")
    page.reload()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)

    # Pass through landing
    page.locator("text=立即体验").first.click()
    page.wait_for_timeout(2500)

    # Login as Emma
    page.locator("text=Emma").first.click()
    page.wait_for_timeout(1500)
    page.locator("input[type='password']").first.fill("1234")
    page.locator("button:has-text('登录')").first.click(force=True)
    page.wait_for_timeout(3000)

    # Verify TopBar is present (NOT Sidebar)
    topbar = page.locator("[data-topbar]").count()
    print(f"=== TopBar count: {topbar} ===", flush=True)
    page.screenshot(path="/tmp/smoke_topbar.png", full_page=False)

    # Verify all 5 tabs are visible
    tab_labels = ["经营助手", "床位看板", "前台入住", "交接班日志", "设置"]
    for label in tab_labels:
        loc = page.locator(f"[data-topbar] >> text={label}").first
        visible = loc.count() > 0
        print(f"  Tab '{label}': {'✓' if visible else '✗'}", flush=True)

    # Default tab should be 经营助手
    assistant_tab = page.locator("[data-topbar] button[aria-selected='true']").first
    sel_label = assistant_tab.inner_text() if assistant_tab.count() > 0 else "(none)"
    print(f"\nDefault active tab: {sel_label!r}", flush=True)

    # Try clicking 床位看板
    page.locator("[data-topbar] >> text=床位看板").first.click()
    page.wait_for_timeout(1500)
    page.screenshot(path="/tmp/smoke_bedboard.png", full_page=False)
    bed_boards = page.locator("[data-booking-block]").count()
    print(f"  BedBoard: {bed_boards} booking blocks rendered", flush=True)

    # Try clicking 设置
    page.locator("[data-topbar] >> text=设置").first.click()
    page.wait_for_timeout(1500)
    page.screenshot(path="/tmp/smoke_settings.png", full_page=False)
    # Should show 3 sub-tabs: 员工管理, 数据迁移, 通用
    for sub in ["员工管理", "数据迁移", "通用"]:
        loc = page.locator(f"[role='tab']:has-text('{sub}')").first
        print(f"  Settings sub-tab '{sub}': {'✓' if loc.count() > 0 else '✗'}", flush=True)

    # Click 通用 sub-tab
    page.locator("[role='tab']:has-text('通用')").first.click()
    page.wait_for_timeout(1000)
    page.screenshot(path="/tmp/smoke_general.png", full_page=False)
    # Should show language, version, sign out, reset data
    for label in ["语言", "版本", "退出登录", "重置数据"]:
        loc = page.locator(f"text={label}").first
        print(f"  General row '{label}': {'✓' if loc.count() > 0 else '✗'}", flush=True)

    # Click 经营助手
    page.locator("[data-topbar] >> text=经营助手").first.click()
    page.wait_for_timeout(1500)
    page.screenshot(path="/tmp/smoke_assistant.png", full_page=False)
    # Should show 2 sub-tabs: 概览, 获客增长
    for sub in ["概览", "获客增长"]:
        loc = page.locator(f"[role='tab']:has-text('{sub}')").first
        print(f"  Assistant sub-tab '{sub}': {'✓' if loc.count() > 0 else '✗'}", flush=True)

    print(f"\n=== Errors: {len(errors)} ===", flush=True)
    for e in errors[:10]:
        print(f"  {e}", flush=True)

    browser.close()
