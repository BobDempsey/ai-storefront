import { expect, test, type Page } from '@playwright/test'

/**
 * What the assistant says when the shop does not stock what a visitor wants.
 *
 * Tagged `@llm` and excluded from `npm run test:e2e`, because the answer is a
 * real provider call and the free suite stays free. Run it with
 * `npm run test:e2e:llm`.
 *
 * The storefront used to answer this case with a custom-order request on the
 * contact page. Both are gone, and a model asked for something a shop does not
 * sell will reach for "get in touch" on its own, so this pins the one thing a
 * screenshot cannot: that the reply names no route to staff that does not
 * exist. It spends exactly one call.
 */

async function hydrated(page: Page) {
  await page.waitForLoadState('networkidle')
}

test('@llm an item the shop does not stock is refused without pointing anywhere', async ({
  page
}) => {
  await page.goto('/')
  await hydrated(page)

  await page.getByRole('button', { name: 'Open the shop assistant' }).click()
  await page
    .getByPlaceholder(/ask/i)
    .or(page.locator('textarea, input[type="text"]').last())
    .first()
    .fill('Do you sell cast iron frying pans? I want one about 30cm across.')
  await page.keyboard.press('Enter')

  // The reply, not the greeting: wait for a second turn to land.
  const reply = page.locator('[data-testid="chat-assistant"]').last()
  await expect(reply).toBeVisible({ timeout: 90_000 })
  await expect(reply).not.toHaveText(/^\s*$/, { timeout: 90_000 })

  const text = (await reply.innerText()).toLowerCase()

  // It said no.
  expect(text).toMatch(/don't|do not|doesn't|does not|no |sorry|afraid/)

  // And it pointed nowhere: no page, no form, no address, no invitation to ask.
  expect(text).not.toContain('/contact')
  expect(text).not.toContain('contact page')
  expect(text).not.toContain('contact form')
  expect(text).not.toContain('custom order')
  expect(text).not.toContain('custom-order')
  expect(text).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/)
  expect(text).not.toMatch(/get in touch|reach out|email (us|staff)|contact (us|staff)/)
})
