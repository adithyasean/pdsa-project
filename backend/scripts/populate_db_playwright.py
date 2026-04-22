import asyncio
import sqlite3
import os
from playwright.async_api import async_playwright

NUM_ROUNDS = 20
TASK_COUNT = "10"  # Custom task count for fast automation

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "game.db")

def get_next_player_name() -> str:
    """Return the next testN name by checking existing entries in the DB."""
    if not os.path.exists(DB_PATH):
        return "test1"
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT player_name FROM game_rounds WHERE player_name LIKE 'test%'")
    names = [row[0] for row in c.fetchall() if row[0]]
    conn.close()
    # Extract numbers from names like test1, test2, ...
    nums = []
    for name in names:
        try:
            nums.append(int(name.replace("test", "")))
        except ValueError:
            pass
    next_num = max(nums, default=0) + 1
    return f"test{next_num}"

async def run():
    player_name = get_next_player_name()
    print(f"Player name for this run: {player_name}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        print("Navigating to http://localhost:5173...")
        await page.goto("http://localhost:5173", timeout=15000)

        # Click the Minimum Cost card to enter the game
        print("Clicking Minimum Cost card...")
        await page.click("text=Minimum Cost")

        # Handle Start Modal — select Custom task count
        print(f"Selecting Task Count ({TASK_COUNT}) in Start Modal...")
        await page.wait_for_selector("input[value='custom']", timeout=10000)
        await page.click("input[value='custom']")
        await page.fill("input[placeholder*='1-500']", TASK_COUNT)
        await page.click("button:has-text('Start Game')")

        # Wait for the first puzzle to load
        greedy_selector = "button[class*='btnGreedy']"
        await page.wait_for_selector(greedy_selector, timeout=15000)

        for i in range(NUM_ROUNDS):
            print(f"Round {i+1}/{NUM_ROUNDS}...")

            # Click Greedy to solve
            print("  Solving with Greedy...")
            await page.click(greedy_selector)

            # Skip animation
            await asyncio.sleep(0.3)
            try:
                skip_btn = page.locator("button:has-text('Skip')")
                if await skip_btn.is_visible():
                    await skip_btn.click()
                    print("  Skipped animation.")
            except Exception:
                pass

            if i < NUM_ROUNDS - 1:
                print("  Loading new puzzle...")
                # Wait for the greedy result to appear first, then click New Puzzle
                await asyncio.sleep(0.5)
                new_puzzle_btn = page.locator("button:has-text('New Puzzle')")
                await new_puzzle_btn.wait_for(state="visible", timeout=15000)
                await new_puzzle_btn.click()

                # Wait for the greedy button to reappear (new puzzle loaded)
                await page.wait_for_selector(greedy_selector, timeout=15000)

        # Final submission
        print("Submitting game session...")
        await page.click("button:has-text('Submit Game')")

        # Fill in the End Game modal
        print("Filling final username modal...")
        await page.wait_for_selector("#userName", timeout=10000)
        await page.fill("#userName", player_name)

        await page.click("button:has-text('Submit & End')")
        await asyncio.sleep(1)

        print(f"Done! {NUM_ROUNDS} rounds populated in headed mode.")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
