import {
    expect,
    test as base,
    type Page,
    type TestInfo,
} from '@playwright/test'

type PageDiagnostics = {
    assertClean: () => void
    attach: (testInfo: TestInfo) => Promise<void>
}

type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonValue[]
    | { [key: string]: JsonValue }

function createSparkKvStore() {
    return new Map<string, JsonValue>([
        ['setup-game-mode', 'local'],
        ['setup-num-players', '2'],
        ['setup-player-names', ['Player 1', 'Player 2']],
        ['setup-starting-chips', '500'],
        ['setup-min-bet', '10'],
        ['setup-room-name', ''],
        ['setup-max-players', '4'],
        ['setup-join-room-id', ''],
        ['setup-join-player-name', ''],
        ['blackjack-game', null],
        ['current-player-id', ''],
        ['bet-history', []],
    ])
}

async function installSparkRuntimeStub(
    page: Page,
    unhandledSparkRequests: string[],
) {
    const kvStore = createSparkKvStore()

    await page.route('**/_spark/**', async (route) => {
        const request = route.request()
        const url = new URL(request.url())

        if (url.pathname === '/_spark/loaded') {
            await route.fulfill({ status: 204 })
            return
        }

        if (url.pathname === '/_spark/user') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(null),
            })
            return
        }

        if (url.pathname === '/_spark/kv' && request.method() === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([...kvStore.keys()]),
            })
            return
        }

        const key = url.pathname.match(/^\/_spark\/kv\/([^/]+)$/)?.[1]
        if (key) {
            const decodedKey = decodeURIComponent(key)

            if (request.method() === 'GET') {
                if (!kvStore.has(decodedKey)) {
                    unhandledSparkRequests.push(`${request.method()} ${url.pathname}`)
                    await route.fulfill({
                        status: 501,
                        body: 'Unhandled Spark KV key',
                    })
                    return
                }

                await route.fulfill({
                    status: 200,
                    contentType: 'text/plain',
                    body: JSON.stringify(kvStore.get(decodedKey)),
                })
                return
            }

            if (request.method() === 'POST') {
                kvStore.set(decodedKey, JSON.parse(request.postData() ?? 'null'))
                await route.fulfill({ status: 204 })
                return
            }

            if (request.method() === 'DELETE') {
                kvStore.delete(decodedKey)
                await route.fulfill({ status: 204 })
                return
            }
        }

        unhandledSparkRequests.push(`${request.method()} ${url.pathname}`)
        await route.fulfill({ status: 501, body: 'Unhandled Spark test route' })
    })

    await page.route('**/favicon.ico', async (route) => {
        await route.fulfill({ status: 204 })
    })
}

const test = base.extend<{ diagnostics: PageDiagnostics }>({
    diagnostics: [
        async ({ page }, runTest, testInfo) => {
            const browserConsoleErrors: string[] = []
            const pageErrors: string[] = []
            const failedRequests: string[] = []
            const badResponses: string[] = []
            const unhandledSparkRequests: string[] = []

            await installSparkRuntimeStub(page, unhandledSparkRequests)

            page.on('console', (message) => {
                if (message.type() === 'error') {
                    browserConsoleErrors.push(message.text())
                }
            })

            page.on('pageerror', (error) => {
                pageErrors.push(error.message)
            })

            page.on('requestfailed', (request) => {
                const url = new URL(request.url())
                if (
                    url.pathname.startsWith('/_spark/') &&
                    request.failure()?.errorText === 'net::ERR_ABORTED'
                ) {
                    return
                }

                failedRequests.push(
                    `${request.method()} ${request.url()}: ${request.failure()?.errorText}`,
                )
            })

            page.on('response', (response) => {
                if (response.status() >= 400) {
                    badResponses.push(
                        `${response.request().method()} ${response.url()}: ${response.status()} ${response.statusText()}`,
                    )
                }
            })

            const diagnostics = {
                async attach(testInfo: TestInfo) {
                    await testInfo.attach('browser-console-errors', {
                        body:
                            browserConsoleErrors.length > 0
                                ? browserConsoleErrors.join('\n')
                                : 'none',
                        contentType: 'text/plain',
                    })

                    await testInfo.attach('page-errors', {
                        body: pageErrors.length > 0 ? pageErrors.join('\n') : 'none',
                        contentType: 'text/plain',
                    })

                    await testInfo.attach('failed-requests', {
                        body:
                            failedRequests.length > 0
                                ? failedRequests.join('\n')
                                : 'none',
                        contentType: 'text/plain',
                    })

                    await testInfo.attach('bad-responses', {
                        body:
                            badResponses.length > 0
                                ? badResponses.join('\n')
                                : 'none',
                        contentType: 'text/plain',
                    })

                    await testInfo.attach('unhandled-spark-requests', {
                        body:
                            unhandledSparkRequests.length > 0
                                ? unhandledSparkRequests.join('\n')
                                : 'none',
                        contentType: 'text/plain',
                    })
                },
                assertClean() {
                    expect(browserConsoleErrors).toEqual([])
                    expect(pageErrors).toEqual([])
                    expect(failedRequests).toEqual([])
                    expect(badResponses).toEqual([])
                    expect(unhandledSparkRequests).toEqual([])
                },
            }

            await runTest(diagnostics)
            await diagnostics.attach(testInfo)
            diagnostics.assertClean()
        },
        { auto: true },
    ],
})

async function openLocalSetup(page: Page) {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: /blackjack/i })).toBeVisible()
    await expect(page.getByText(/^Party$/i)).toBeVisible()
    await expect(page.getByText(/experience casino blackjack/i)).toBeVisible()
    await page.getByRole('tab', { name: /local hot-seat/i }).click()
    await expect(page.getByRole('button', { name: /start local game/i })).toBeVisible()
}

async function selectPlayerCount(page: Page, count: 2 | 3 | 4) {
    await page.getByRole('button', { name: count.toString(), exact: true }).click()
}

async function selectChipValue(page: Page, value: string) {
    await page.getByRole('button', { name: value, exact: true }).click()
}

async function updatePlayerSeat(page: Page, currentName: string, newName: string) {
    await page.getByRole('button', { name: new RegExp(currentName, 'i') }).click()
    const editor = page.getByRole('textbox')
    await expect(editor).toBeVisible()
    await editor.fill(newName)
    await editor.press('Enter')
    await expect(page.getByRole('button', { name: new RegExp(newName, 'i') })).toBeVisible()
}

async function fillLocalSetup(
    page: Page,
    config: {
        playerNames: string[]
        startingChips?: string
        minBet?: string
    },
) {
    const playerCount = config.playerNames.length as 2 | 3 | 4
    await selectPlayerCount(page, playerCount)

    for (const [index, name] of config.playerNames.entries()) {
        await updatePlayerSeat(page, `Player ${index + 1}`, name)
    }

    await selectChipValue(page, config.startingChips ?? '500')
    await selectChipValue(page, config.minBet ?? '10')
}

async function startTwoPlayerLocalRound(page: Page) {
    await openLocalSetup(page)
    await fillLocalSetup(page, {
        playerNames: ['Ava', 'Ben'],
        startingChips: '500',
        minBet: '10',
    })
    await page.getByRole('button', { name: /start local game/i }).click()

    await expect(page.getByText(/round 1/i)).toBeVisible()
    await expect(page.getByText(/place your bet/i)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Ava' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Ben' })).toBeVisible()
}

async function placeTwoMinimumBets(page: Page) {
    const confirmBet = page.getByRole('button', { name: /confirm bet/i })
    const placedBetLabels = page.getByText(/^bet$/i)

    await confirmBet.click()
    await expect(placedBetLabels).toHaveCount(1)

    await confirmBet.click()
    await expect(page.getByText(/your turn|dealer is playing|next round/i)).toBeVisible()
}

async function playVisibleActionsUntilResults(page: Page) {
    const hit = page.getByRole('button', { name: /hit/i })
    const stand = page.getByRole('button', { name: /stand/i })
    const nextRound = page.getByRole('button', { name: /next round/i })
    const dealerPlaying = page.getByText(/dealer is playing/i)

    if (await hit.isVisible()) {
        await hit.click()
    }

    for (let attempt = 0; attempt < 4; attempt += 1) {
        if (await nextRound.isVisible()) {
            return
        }

        if (await stand.isVisible()) {
            await stand.click()
        }

        if (await dealerPlaying.isVisible()) {
            await expect(nextRound).toBeVisible({ timeout: 8_000 })
            return
        }

        await page.waitForTimeout(750)
    }

    await expect(nextRound).toBeVisible()
}

test('setup screen renders local controls and updates player configuration', async ({
    page,
}) => {
    await openLocalSetup(page)

    await selectPlayerCount(page, 3)
    await expect(page.getByText('SEAT 3')).toBeVisible()

    await updatePlayerSeat(page, 'Player 1', 'Ava')
    await updatePlayerSeat(page, 'Player 2', 'Ben')
    await updatePlayerSeat(page, 'Player 3', 'Cam')

    await selectChipValue(page, '1000')
    await selectChipValue(page, '25')

    await selectPlayerCount(page, 2)
    await expect(page.getByRole('button', { name: /Ava/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Ben/i })).toBeVisible()
    await expect(page.getByText('SEAT 3')).toHaveCount(0)

    await page.getByRole('button', { name: /start local game/i }).click()

    await expect(page.getByText(/round 1/i)).toBeVisible()
    await expect(page.getByText(/place your bet/i)).toBeVisible()
    await expect(page.getByText(/1000\s*chips/i)).toHaveCount(2)
    await expect(page.getByRole('button', { name: '25', exact: true })).toBeVisible()
})

test('starts a local hot-seat blackjack round and records two minimum bets', async ({
    page,
}) => {
    await startTwoPlayerLocalRound(page)
    await placeTwoMinimumBets(page)

    await expect(page.getByText(/^bet$/i)).toHaveCount(2)
})

test('advances through hit and stand actions into next-round reset', async ({
    page,
}) => {
    await startTwoPlayerLocalRound(page)
    await placeTwoMinimumBets(page)

    await playVisibleActionsUntilResults(page)
    await page.getByRole('button', { name: /next round/i }).click()

    await expect(page.getByText(/round 2/i)).toBeVisible()
    await expect(page.getByText(/place your bet/i)).toBeVisible()
    await expect(page.getByText(/^bet$/i)).toHaveCount(0)
})

test('renders the local setup on a mobile-sized viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openLocalSetup(page)

    await expect(page.getByRole('button', { name: /start local game/i })).toBeVisible()
    await expect(page.getByText('SEAT 1')).toBeVisible()
    await expect(page.getByText('SEAT 2')).toBeVisible()
})
