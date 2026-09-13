// Renders a 1200x630 Open Graph share image through the repo's own Playwright.
//
// The first share image was made this way as a one-off and the HTML behind it
// was never committed, so the second shop had nothing to match against. This
// script is that page, kept, so a third shop is a command rather than a
// reconstruction.
//
//   node scripts/og-image.mjs --name "Forged in Filament" \
//     --domain fif.bobdempsey83.com --out public/og-image-forged-in-filament.png
//
// Chromium renders whatever sans the host has, so the two shipped images were
// not necessarily drawn with the same face. Everything else about the treatment
// (the palette, the rule, the sizes, the positions) is fixed here.

import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { chromium } from 'playwright'

const args = process.argv.slice(2)

/**
 * @param {string} name
 * @param {string} [fallback]
 * @returns {string | undefined}
 */
const flag = (name, fallback) => {
  const at = args.indexOf(`--${name}`)
  return at === -1 ? fallback : args[at + 1]
}

const name = flag('name')
const domain = flag('domain', '')
const tagline = flag('tagline', 'Browse the catalogue\nand submit an order\nrequest.') ?? ''
const out = flag('out')

if (!name || !out) {
  console.error('usage: node scripts/og-image.mjs --name "Shop Name" --out public/og-x.png [--domain example.com] [--tagline "..."]')
  process.exit(1)
}

/**
 * @param {string} text
 * @returns {string}
 */
const escape = text =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        width: 1200px;
        height: 630px;
        overflow: hidden;
        background: #080b0a;
        font-family: "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      .sheet {
        position: relative;
        width: 1200px;
        height: 630px;
        padding: 0 96px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      /* A grid this faint reads as texture rather than as lines, which is the
         point: it should survive the downscale a link preview applies. */
      .sheet::before {
        content: "";
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(to right, rgba(255, 255, 255, 0.028) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.028) 1px, transparent 1px);
        background-size: 60px 60px;
      }
      .sheet::after {
        content: "";
        position: absolute;
        inset: 0;
        background: radial-gradient(120% 100% at 88% 8%, rgba(16, 185, 129, 0.16), transparent 62%);
      }
      .sheet > * { position: relative; z-index: 1; }
      .rule {
        width: 66px;
        height: 6px;
        border-radius: 3px;
        background: #10b981;
        margin-bottom: 34px;
      }
      h1 {
        font-size: 96px;
        font-weight: 800;
        letter-spacing: -0.022em;
        line-height: 1.06;
        color: #ffffff;
        margin-bottom: 34px;
      }
      p.tagline {
        font-size: 40px;
        line-height: 1.28;
        font-weight: 400;
        color: #9aa4a0;
        white-space: pre-line;
      }
      p.domain {
        position: absolute;
        left: 96px;
        bottom: 74px;
        font-size: 26px;
        letter-spacing: 0.01em;
        color: #34d399;
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="rule"></div>
      <h1>${escape(name)}</h1>
      <p class="tagline">${escape(tagline)}</p>
      ${domain ? `<p class="domain">${escape(domain)}</p>` : ''}
    </div>
  </body>
</html>`

const target = resolve(process.cwd(), out)
await mkdir(dirname(target), { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
await page.setContent(html, { waitUntil: 'load' })
await page.screenshot({ path: target, type: 'png' })
await browser.close()

console.log(`wrote ${out} (1200x630) for "${name}"`)
