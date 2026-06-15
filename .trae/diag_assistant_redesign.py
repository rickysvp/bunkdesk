"""Smoke test for the redesigned 经营助手 (single-page) + TopBar user badge."""
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

    # Login as Emma (manager)
    page.locator("text=Emma").first.click()
    page.wait_for_timeout(1500)
    page.locator("input[type='password']").first.fill("1234")
    page.locator("button:has-text('登录')").first.click(force=True)
    page.wait_for_timeout(3000)

    # --- TopBar checks ---
    topbar = page.locator("[data-topbar]").count()
    print(f"=== TopBar count: {topbar} ===", flush=True)
    page.screenshot(path="/tmp/smoke_topbar.png", full_page=False)

    # 5 main tabs
    tab_labels = ["经营助手", "床位看板", "前台入住", "交接班日志", "设置"]
    for label in tab_labels:
        loc = page.locator(f"[data-topbar] >> text={label}").first
        visible = loc.count() > 0
        print(f"  Tab '{label}': {'✓' if visible else '✗'}", flush=True)

    # Default active tab = 经营助手
    sel = page.locator("[data-topbar] button[aria-selected='true']").first
    sel_label = sel.inner_text() if sel.count() > 0 else "(none)"
    print(f"\nDefault active tab: {sel_label!r}", flush=True)

    # User badge should appear in TopBar (right side)
    user_badge = page.locator("[data-topbar] >> text=Emma").count()
    role_badge = page.locator("[data-topbar] >> text=经理").count()
    signout_btn = page.locator("[data-topbar] >> text=退出登录").count()
    print(f"  User badge 'Emma' in TopBar: {'✓' if user_badge > 0 else '✗'}", flush=True)
    print(f"  Role badge '经理' in TopBar: {'✓' if role_badge > 0 else '✗'}", flush=True)
    print(f"  Sign-out button in TopBar: {'✓' if signout_btn > 0 else '✗'}", flush=True)

    # Sub-header should NOT exist anymore (no <header class="h-12"> in body)
    sub_header = page.locator("body > div header.h-12, main header.h-12").count()
    print(f"  Sub-header (h-12) gone: {'✓' if sub_header == 0 else '✗ found ' + str(sub_header)}", flush=True)

    # --- 经营助手 page (default tab, rendered in zh) ---
    # Row 1: 4 stat cards
    # The 4 stat card labels in zh
    stat_labels_zh = ["入住", "退房", "空床", "待清洁"]
    print(f"\n--- 经营助手 page ---", flush=True)
    for label in stat_labels_zh:
        loc = page.locator(f"text={label}").first
        print(f"  Stat '{label}': {'✓' if loc.count() > 0 else '✗'}", flush=True)

    # 需关注 OR All clear
    needs = page.locator("text=需关注").count()
    all_clear = page.locator("text=All clear!").count()
    print(f"  需关注 section: {'✓' if needs > 0 else '(no insights) All clear: ' + ('✓' if all_clear > 0 else '✗')}", flush=True)

    # 获客工具 row with 5 chips
    tools = page.locator("text=获客工具").count()
    print(f"  获客工具 row: {'✓' if tools > 0 else '✗'}", flush=True)
    chip_labels = ["青旅主页", "客人资产", "空床动作", "推荐奖励", "定价参考"]
    for c in chip_labels:
        loc = page.locator(f"button:has-text('{c}')").first
        print(f"    Chip '{c}': {'✓' if loc.count() > 0 else '✗'}", flush=True)

    page.screenshot(path="/tmp/smoke_assistant.png", full_page=True)

    # Click a tool chip → Sheet should open
    page.locator("button:has-text('客人资产')").first.click()
    page.wait_for_timeout(1500)
    page.screenshot(path="/tmp/smoke_sheet.png", full_page=False)
    sheet_open = page.locator("[role='dialog']").count()
    print(f"  Sheet opened on CRM chip click: {'✓' if sheet_open > 0 else '✗'}", flush=True)
    # Close sheet
    if sheet_open > 0:
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)

    # --- 床位看板 still works ---
    page.locator("[data-topbar] >> text=床位看板").first.click()
    page.wait_for_timeout(1500)
    page.screenshot(path="/tmp/smoke_bedboard.png", full_page=False)
    blocks = page.locator("[data-booking-block]").count()
    print(f"\n  床位看板 booking blocks: {blocks}", flush=True)

    # --- 设置 still works ---
    page.locator("[data-topbar] >> text=设置").first.click()
    page.wait_for_timeout(1500)
    for sub in ["员工管理", "数据迁移", "通用"]:
        loc = page.locator(f"[role='tab']:has-text('{sub}')").first
        print(f"  Settings sub-tab '{sub}': {'✓' if loc.count() > 0 else '✗'}", flush=True)

    # Click 通用 to verify it still shows language/version/signout/reset
    page.locator("[role='tab']:has-text('通用')").first.click()
    page.wait_for_timeout(800)
    for label in ["语言", "版本", "退出登录", "重置数据"]:
        loc = page.locator(f"text={label}").first
        print(f"  General row '{label}': {'✓' if loc.count() > 0 else '✗'}", flush=True)

    print(f"\n=== Errors: {len(errors)} ===", flush=True)
    for e in errors[:15]:
        print(f"  {e}", flush=True)

    browser.close()
