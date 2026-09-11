import { chromium, type FullConfig } from '@playwright/test'

/**
 * Where the seeded browser state is written. `playwright.config.ts` points
 * `use.storageState` at this, so every test starts from it.
 */
export const STORAGE_STATE = 'node_modules/.cache/playwright/storage-state.json'

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

  /*
   * Tell the app this browser has already met the assistant.
   *
   * A Playwright context starts empty, which is exactly what a first-time
   * visitor looks like, so without this the panel opens itself over the
   * catalogue and swallows the "Add to cart" click. The failure surfaces three
   * steps later as a detached-element timeout, which reads like the hydration
   * problem in handoff.md section 8 rather than like the auto-open.
   *
   * Seeding the flag is also closer to the case the suite is testing: a
   * returning visitor doing the ordinary thing. The auto-open itself is covered
   * by unit tests, where all six of its branches can be reached.
   */
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.setItem('assistant-greeted', '1'))
  await page.context().storageState({ path: STORAGE_STATE })

  await browser.close()
}
