import { chromium, type FullConfig } from '@playwright/test'

/**
 * Warms the dev server before any test runs.
 *
 * Vite discovers PrimeVue components as they first render and, each time it
 * finds a new one, re-optimizes and forces a full page reload. On a cold server
 * that lands in the middle of a test: the click has happened, the page reloads,
 * and the request never goes out. Loading each route here does that discovery
 * once, up front, where nothing is watching.
 *
 * The loop stops as soon as a pass adds no new modules, so a warm server costs
 * one quick pass rather than a fixed delay.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000'
  const routes = ['/', '/cart', '/checkout', '/contact']

  const browser = await chromium.launch()
  const page = await browser.newPage()

  let previous = -1
  for (let pass = 0; pass < 4; pass++) {
    const modules = new Set<string>()
    page.on('request', request => {
      if (request.url().includes('/_nuxt/')) modules.add(request.url())
    })

    for (const route of routes) {
      await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' }).catch(() => {})
    }

    if (modules.size === previous) break
    previous = modules.size
  }

  await browser.close()
}
