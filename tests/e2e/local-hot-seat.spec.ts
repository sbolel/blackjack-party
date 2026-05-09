import { expect, test } from '@playwright/test'

test('starts a local hot-seat blackjack round', async ({ page }, testInfo) => {
    const browserConsoleErrors: string[] = []
    const pageErrors: string[] = []

    page.on('console', (message) => {
        if (message.type() === 'error') {
            browserConsoleErrors.push(message.text())
        }
    })

    page.on('pageerror', (error) => {
        pageErrors.push(error.message)
    })

    await page.goto('/')

    await expect(page.getByRole('heading', { name: /blackjack 3d/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /start local game/i })).toBeVisible()

    await page.getByRole('button', { name: /start local game/i }).click()

    await expect(page.getByText(/round 1/i)).toBeVisible()
    await expect(page.getByText(/place your bet/i)).toBeVisible()

    await page.getByRole('button', { name: /confirm bet/i }).click()
    await page.getByRole('button', { name: /confirm bet/i }).click()

    await expect(
        page.getByText(/your turn|dealer is playing|next round|round complete/i),
    ).toBeVisible()

    await testInfo.attach('browser-console-errors', {
        body: browserConsoleErrors.length > 0 ? browserConsoleErrors.join('\n') : 'none',
        contentType: 'text/plain',
    })

    await testInfo.attach('page-errors', {
        body: pageErrors.length > 0 ? pageErrors.join('\n') : 'none',
        contentType: 'text/plain',
    })

    const unexpectedPageErrors = pageErrors.filter(
        (error) =>
            !/Failed to (fetch KV key|set key): (Unauthorized|rate limit exceeded)/.test(error),
    )

    expect(unexpectedPageErrors).toEqual([])
})
