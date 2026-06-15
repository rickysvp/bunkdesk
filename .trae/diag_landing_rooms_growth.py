"""Smoke test for the redesigned landing + restructured settings + simplified assistant."""
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

    # === LANDING PAGE ===
    print(f"=== Landing page ===", flush=True)
    page.screenshot(path="/tmp/smoke_landing_hero.png", full_page=False)

    # Hero
    hero_visible = page.locator("text=床位级别的").count() > 0
    print(f"  Hero H1 '床位级别的': {'✓' if hero_visible else '✗'}", flush=True)
    cta_visible = page.locator("text=免费开始").first.count() > 0
    print(f"  Hero CTA '免费开始': {'✓' if cta_visible else '✗'}", flush=True)
    secondary_visible = page.locator("text=观看 60 秒演示").count() > 0
    print(f"  Hero secondary CTA: {'✓' if secondary_visible else '✗'}", flush=True)

    # Reality Check
    reality_visible = page.locator("text=现实是：").count() > 0
    print(f"  Reality Check section: {'✓' if reality_visible else '✗'}", flush=True)
    pain_count = page.locator("text=床位超卖噩梦").count() + page.locator("text=OTA 全手动更新").count()
    print(f"  2 of 4 pain points visible: {'✓' if pain_count >= 2 else '✗'}", flush=True)

    # Scroll to capture full landing
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(500)
    page.screenshot(path="/tmp/smoke_landing_top.png", full_page=False)
    page.evaluate("window.scrollTo(0, 1000)")
    page.wait_for_timeout(500)
    page.screenshot(path="/tmp/smoke_landing_mid.png", full_page=False)
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    page.wait_for_timeout(500)
    page.screenshot(path="/tmp/smoke_landing_bottom.png", full_page=False)
    page.evaluate("window.scrollTo(0, 0)")

    # Pricing
    pricing_visible = page.locator("text=没有抽成，没有套路").count() > 0
    print(f"  Pricing section: {'✓' if pricing_visible else '✗'}", flush=True)
    pro_badge = page.locator("text=最受欢迎").count() > 0
    print(f"  Pro 'Most popular' badge: {'✓' if pro_badge else '✗'}", flush=True)
    cta_button = page.locator("text=立即开始").count() > 0
    print(f"  Final CTA '立即开始': {'✓' if cta_button else '✗'}", flush=True)

    # Enter app from landing
    page.locator("text=免费开始").first.click()
    page.wait_for_timeout(2500)

    # Login as Emma (manager)
    page.locator("text=Emma").first.click()
    page.wait_for_timeout(1500)
    page.locator("input[type='password']").first.fill("1234")
    page.locator("button:has-text('登录')").first.click(force=True)
    page.wait_for_timeout(3000)

    # === TopBar / nav still 5 tabs ===
    print(f"\n=== App TopBar ===", flush=True)
    topbar = page.locator("[data-topbar]").count()
    print(f"  TopBar count: {topbar}", flush=True)
    for label in ["经营助手", "床位看板", "前台入住", "交接班日志", "设置"]:
        loc = page.locator(f"[data-topbar] >> text={label}").first
        print(f"  Tab '{label}': {'✓' if loc.count() > 0 else '✗'}", flush=True)
    user_badge = page.locator("[data-topbar] >> text=Emma").count()
    print(f"  User badge 'Emma' in TopBar: {'✓' if user_badge > 0 else '✗'}", flush=True)

    # === ASSISTANT PAGE (no tools row) ===
    print(f"\n=== 经营助手 page (no tools row) ===", flush=True)
    # 4 stat cards
    for label in ["入住", "退房", "空床", "待清洁"]:
        loc = page.locator(f"text={label}").first
        print(f"  Stat '{label}': {'✓' if loc.count() > 0 else '✗'}", flush=True)
    needs = page.locator("text=需关注").count()
    print(f"  需关注 section: {'✓' if needs > 0 else '✗'}", flush=True)
    # Tools row should NOT exist
    tools_in_assistant = page.locator("text=获客工具").count()
    print(f"  获客工具 row removed: {'✓' if tools_in_assistant == 0 else '✗ still found ' + str(tools_in_assistant)}", flush=True)
    # Hint should exist
    hint = page.locator("text=已迁至").count()
    print(f"  'Tools moved' hint: {'✓' if hint > 0 else '✗'}", flush=True)

    # === SETTINGS — 5 sub-tabs ===
    print(f"\n=== Settings panel ===", flush=True)
    page.locator("[data-topbar] >> text=设置").first.click()
    page.wait_for_timeout(1500)
    page.screenshot(path="/tmp/smoke_settings.png", full_page=False)
    for sub in ["员工管理", "数据迁移", "房间", "获客", "通用"]:
        loc = page.locator(f"[role='tab']:has-text('{sub}')").first
        print(f"  Sub-tab '{sub}': {'✓' if loc.count() > 0 else '✗'}", flush=True)

    # === SETTINGS → 房间 ===
    page.locator("[role='tab']:has-text('房间')").first.click()
    page.wait_for_timeout(1000)
    page.screenshot(path="/tmp/smoke_settings_rooms.png", full_page=False)
    add_room_btn = page.locator("text=添加房间").count()
    print(f"  设置→房间 '添加房间' button: {'✓' if add_room_btn > 0 else '✗'}", flush=True)
    # Should see at least one room card
    room_cards = page.locator("[class*='bg-white']:has-text('Room'), [class*='bg-white']:has-text('房间')").count()
    print(f"  Room cards rendered: {'✓' if room_cards > 0 else '✗'}", flush=True)

    # === SETTINGS → 获客 (5 sub-tabs) ===
    page.locator("[role='tab']:has-text('获客')").first.click()
    page.wait_for_timeout(1500)
    page.screenshot(path="/tmp/smoke_settings_growth.png", full_page=False)
    for sub in ["青旅主页", "客人资产", "空床动作", "推荐奖励", "定价参考"]:
        loc = page.locator(f"[role='tab']:has-text('{sub}')").first
        print(f"  Growth sub-tab '{sub}': {'✓' if loc.count() > 0 else '✗'}", flush=True)

    # Switch to 定价
    page.locator("[role='tab']:has-text('定价参考')").first.click()
    page.wait_for_timeout(1000)
    page.screenshot(path="/tmp/smoke_settings_growth_pricing.png", full_page=False)

    # === SETTINGS → 通用 still works ===
    page.locator("[role='tab']:has-text('通用')").first.click()
    page.wait_for_timeout(800)
    for label in ["语言", "版本", "退出登录", "重置数据"]:
        loc = page.locator(f"text={label}").first
        print(f"  General row '{label}': {'✓' if loc.count() > 0 else '✗'}", flush=True)

    # === 床位看板 still works ===
    page.locator("[data-topbar] >> text=床位看板").first.click()
    page.wait_for_timeout(1500)
    blocks = page.locator("[data-booking-block]").count()
    print(f"\n  床位看板 booking blocks: {blocks}", flush=True)

    print(f"\n=== Errors: {len(errors)} ===", flush=True)
    for e in errors[:15]:
        print(f"  {e}", flush=True)

    browser.close()
