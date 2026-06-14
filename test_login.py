from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 800})

    # 1. Check login screen appears
    page.goto('http://localhost:3005')
    page.wait_for_load_state('networkidle')
    page.screenshot(path='test_login_screen.png')
    print("1. Login screen captured")

    # 2. Select Emma (manager) and enter PIN
    page.click('text=Emma')
    page.wait_for_timeout(500)
    page.screenshot(path='test_pin_input.png')
    print("2. PIN input shown")

    # 3. Enter correct PIN and submit
    page.fill('input[type="password"]', '1234')
    # Try both Chinese and English button text
    login_btn = page.locator('button:has-text("登录"), button:has-text("Sign In")')
    login_btn.click()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    page.screenshot(path='test_logged_in.png')
    print("3. Logged in as manager")

    # 4. Check sidebar tabs count
    sidebar_buttons = page.locator('nav button')
    count = sidebar_buttons.count()
    print(f"4. Sidebar tabs count: {count} (expected 9 for manager)")

    # 5. Navigate to Staff panel
    staff_btn = page.locator('button:has-text("员工管理"), button:has-text("Staff")')
    if staff_btn.count() > 0:
        staff_btn.first.click()
        page.wait_for_timeout(500)
        page.screenshot(path='test_staff_panel.png')
        print("5. Staff panel shown")
    else:
        print("5. Staff button not found")

    # 6. Logout
    logout_btn = page.locator('button:has-text("退出登录"), button:has-text("Sign Out")')
    if logout_btn.count() > 0:
        logout_btn.first.click()
        page.wait_for_timeout(1000)
        page.screenshot(path='test_logout.png')
        print("6. Logout - back to login screen")
    else:
        print("6. Logout button not found")

    # 7. Login as cleaning staff (Jake)
    page.click('text=Jake')
    page.wait_for_timeout(500)
    page.fill('input[type="password"]', '1234')
    login_btn2 = page.locator('button:has-text("登录"), button:has-text("Sign In")')
    login_btn2.click()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    page.screenshot(path='test_cleaning_view.png')
    sidebar_buttons2 = page.locator('nav button')
    count2 = sidebar_buttons2.count()
    print(f"7. Cleaning staff tabs count: {count2} (expected 4 for cleaning)")

    browser.close()
    print("All tests completed!")
