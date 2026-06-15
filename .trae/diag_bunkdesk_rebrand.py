#!/usr/bin/env python3
"""
BunkDesk rebrand smoke test (v2 — language-agnostic).

Verifies the post-rebrand landing page:
  * Brand: BunkDesk (not Bunkly) — visible in EN and ZH
  * No AI / OTA / Alipay / WeChat / ¥ claims
  * USD pricing ($19 /month) — visible
  * 6 sections render
  * 进入 app 后功能未动 (TopBar 5 tabs / Settings 5 sub-tabs / 床位看板)
  * 0 console errors
"""

import sys
from playwright.sync_api import sync_playwright

BANNED_EN = [
    "AI-powered", "AI WhatsApp", "AI-Powered",
    "One-click OTA sync", "All OTAs sync", "All OTA integrations",
    "Alipay", "WeChat Pay", "WhatsApp automation",
    "Bunkly Way", "Bunkly · Built", "With Bunkly", "Without Bunkly",
]

BANNED_ZH = [
    "AI 驱动", "AI WhatsApp 客服", "AI-Powered",
    "OTA 一键同步", "全部 OTA 集成", "OTA 全手动更新", "所有 OTA 实时自动同步",
    "支付宝", "WhatsApp 自动化", "智能床位定价", "智能定价",
    "用 Bunkly 之前", "用 Bunkly 之后", "Bunkly · 为青旅而生",
]


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()
        errs: list[str] = []
        page.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
        page.on("console", lambda msg: errs.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)

        page.goto("http://localhost:3000/", wait_until="networkidle", timeout=15000)
        page.evaluate("() => localStorage.clear()")
        page.reload()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)

        results: list[tuple[str, bool, str]] = []

        # ============== ZH (default) ==============
        body = page.locator("body").inner_text()
        results.append(("ZH: BunkDesk appears", "BunkDesk" in body, ""))

        for banned in BANNED_ZH:
            cnt = body.count(banned)
            results.append((f"ZH: banned '{banned}' absent", cnt == 0, f"found {cnt}"))

        # No ¥ anywhere
        yuan_count = page.locator("text=¥").count()
        results.append(("ZH: No ¥ symbol (use $)", yuan_count == 0, f"found {yuan_count}"))

        # $19 visible
        results.append(("ZH: $19 pricing visible", page.locator("text=$19").count() >= 1, ""))

        # "How BunkDesk works" / "How BunkDesk" present
        results.append(("ZH: 'How BunkDesk works' section present",
                        page.locator("text=How BunkDesk works").count() >= 1, ""))

        # 6 sections in zh
        for sec in ["The Reality Check", "The BunkDesk Way", "Features", "The Bed-Level Gap", "Simple Pricing"]:
            cnt = page.locator(f"text={sec}").count()
            results.append((f"ZH: Section '{sec}' present", cnt >= 1, f"found {cnt}"))

        # 14 天免费试用 button present (zh CTA)
        results.append(("ZH: '14 天免费试用' button present",
                        page.locator("text=14 天免费试用").count() >= 1, ""))

        # Screenshot zh
        page.screenshot(path="/tmp/bunkdesk-zh.png", full_page=True)

        # ============== Switch to EN ==============
        page.locator("text=EN").first.click()
        page.wait_for_timeout(800)

        body_en = page.locator("body").inner_text()
        results.append(("EN: BunkDesk appears 3+ times", body_en.count("BunkDesk") >= 3, f"found {body_en.count('BunkDesk')}"))

        for banned in BANNED_EN:
            cnt = body_en.count(banned)
            results.append((f"EN: banned '{banned}' absent", cnt == 0, f"found {cnt}"))

        # Bunkly absent
        bunkly_count = page.locator("text=Bunkly").count()
        results.append(("EN: No 'Bunkly' text", bunkly_count == 0, f"found {bunkly_count}"))

        # No ¥
        yuan_count_en = page.locator("text=¥").count()
        results.append(("EN: No ¥ symbol", yuan_count_en == 0, f"found {yuan_count_en}"))

        # $19 + 14-day trial CTA
        results.append(("EN: $19 pricing visible", page.locator("text=$19").count() >= 1, ""))
        results.append(("EN: 'Start 14-day trial' button",
                        page.locator("text=Start 14-day trial").count() >= 1, ""))

        # All 6 sections in EN
        for sec in ["The Reality Check", "The BunkDesk Way", "Features", "The Bed-Level Gap", "How BunkDesk works", "Simple Pricing"]:
            cnt = page.locator(f"text={sec}").count()
            results.append((f"EN: Section '{sec}' present", cnt >= 1, f"found {cnt}"))

        # Screenshot en
        page.screenshot(path="/tmp/bunkdesk-en.png", full_page=True)

        # ============== Enter the app: EN CTA → login → TopBar/Settings/bedboard ==============
        page.locator("text=Start 14-day trial").first.click()
        page.wait_for_timeout(1500)
        # Click Emma (manager) in the login screen
        page.locator("text=Emma").first.click()
        page.wait_for_timeout(500)
        page.locator("input[type='password']").first.fill("1234")
        # After EN switch, login button says "Sign in" (fallback). Use EN text.
        page.locator("button:has-text('Sign in'), button:has-text('登录')").first.click(force=True)
        page.wait_for_timeout(2500)

        # TopBar brand
        topbar_text = page.locator("[data-topbar]").first.inner_text()
        results.append(("TopBar: 'BunkDesk' visible", "BunkDesk" in topbar_text, topbar_text[:80]))

        # 5 tabs
        for tab in ["Assistant", "Bed Board", "Check-In", "Settings"]:
            cnt = page.locator(f"[data-topbar] >> text={tab}").count()
            results.append((f"TopBar: tab '{tab}'", cnt >= 1, f"found {cnt}"))

        # Settings 5 sub-tabs (in EN, since we switched language above)
        # (获客 moved to 经营助手 — only 4 sub-tabs now)
        page.locator("[data-topbar] >> text=Settings").first.click()
        page.wait_for_timeout(800)
        for sub in ["Staff", "Migrate", "Rooms", "General"]:
            cnt = page.locator(f"text={sub}").count()
            results.append((f"Settings: sub-tab '{sub}'", cnt >= 1, f"found {cnt}"))

        # Settings no longer has a Growth sub-tab (merged into Assistant)
        growth_in_settings = page.locator("text=Growth").count()
        results.append(("Settings: NO 'Growth' sub-tab (merged into Assistant)", growth_in_settings == 0, f"found {growth_in_settings}"))

        # ── New assertions: 经营助手 2 sub-tabs (今日 / 获客) ──
        page.locator("[data-topbar] >> text=Assistant").first.click()
        page.wait_for_timeout(800)

        # Both sub-tabs visible
        today_sub = page.locator("[role=tab] >> text=Today").count()
        growth_sub = page.locator("[role=tab] >> text=Growth").count()
        results.append(("Assistant: 'Today' sub-tab present", today_sub >= 1, f"found {today_sub}"))
        results.append(("Assistant: 'Growth' sub-tab present", growth_sub >= 1, f"found {growth_sub}"))

        # 今日: 5 stat cards (4 standard + 1 "Potential" emerald)
        # The 5th emerald card should display "$" + number
        potential_card = page.locator("text=Potential").count()
        results.append(("Assistant 今日: 'Potential' stat card present", potential_card >= 1, f"found {potential_card}"))

        # Switch to 获客 sub-tab
        page.locator("[role=tab] >> text=Growth").first.click()
        page.wait_for_timeout(800)

        # Overview card: Potential 7-day revenue
        overview_title = page.locator("text=Growth overview").count()
        results.append(("Assistant 获客: 'Growth overview' card present", overview_title >= 1, f"found {overview_title}"))

        # 5 sub-sub-tabs (Hostel Page / Guest CRM / Occupancy / Referral / Pricing)
        for sub in ["Hostel Page", "Guest CRM", "Occupancy", "Referral", "Pricing"]:
            cnt = page.locator(f"[role=tab] >> text={sub}").count()
            results.append((f"Assistant 获客: sub-sub-tab '{sub}'", cnt >= 1, f"found {cnt}"))

        # 0 console errors
        errs_filtered = [e for e in errs if "Failed to load resource" not in e and "favicon" not in e]
        results.append((f"0 console errors", len(errs_filtered) == 0, f"errors: {errs_filtered[:3]}"))

        # Report
        pass_n = sum(1 for _, ok, _ in results if ok)
        fail_n = len(results) - pass_n
        print(f"\n=== Results: {pass_n} pass / {fail_n} fail / {len(results)} total ===\n")
        for name, ok, detail in results:
            mark = "OK  " if ok else "FAIL"
            print(f"[{mark}] {name} :: {detail}")

        browser.close()
        return 0 if fail_n == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
