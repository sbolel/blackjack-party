import { defineConfig } from '@playwright/test'

const qaPort = process.env.PORT ?? '3000'
const qaHost = process.env.HOST ?? 'localhost'
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${qaHost}:${qaPort}`

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30_000,
    expect: {
        timeout: 8_000,
    },
    fullyParallel: false,
    reporter: process.env.CI ? [['github'], ['line']] : [['list']],
    use: {
        baseURL,
        channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
        viewport: {
            width: 1280,
            height: 720,
        },
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    webServer: {
        command: `npm run build && npm run preview -- --host ${qaHost} --port ${qaPort}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
})
