import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawn, type ChildProcess } from 'node:child_process'
import { BASE_URL } from './client'

/**
 * The three guards on POST /api/chat. None of them spends a provider call:
 * the 503 fires before the client is constructed and the 400 fires in Zod
 * before the key is even read.
 *
 * This lives beside the database tests because it shares their requirement, a
 * running server, not because it touches Postgres. It touches none.
 */

const BLANK_KEY_PORT = 3100
const BLANK_KEY_URL = `http://localhost:${BLANK_KEY_PORT}`

let server: ChildProcess | null = null

const post = (url: string, body: unknown) =>
  fetch(`${url}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })

/**
 * Asks over HTTP rather than trying to bind the port. Nuxt's dev server binds
 * IPv6, so a bind probe on 127.0.0.1 succeeds while a server is still listening
 * on [::1] and reports a busy port as free.
 */
async function somethingIsListening(url: string) {
  return fetch(url, { signal: AbortSignal.timeout(2_000) })
    .then(() => true)
    .catch(() => false)
}

async function waitForServer(url: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const ok = await fetch(`${url}/api/products`).then(r => r.ok).catch(() => false)
    if (ok) return
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error(`the blanked-key dev server never answered at ${url}`)
}

/**
 * A second dev server with the provider key blanked.
 *
 * Blanking the key in `.env` instead was rejected while designing this: a test
 * that edits the developer's credentials file loses the credential the moment
 * the run is killed. NUXT_IGNORE_LOCK lets a second dev server share the
 * project directory with the one the other suites use.
 */
beforeAll(async () => {
  if (await somethingIsListening(BLANK_KEY_URL)) {
    throw new Error(
      `something is already answering on port ${BLANK_KEY_PORT}, so the blanked-key server ` +
        'cannot start; stop it and run again'
    )
  }

  server = spawn('npm', ['run', 'dev'], {
    env: {
      ...process.env,
      NUXT_OPENAI_API_KEY: '',
      PORT: String(BLANK_KEY_PORT),
      NUXT_IGNORE_LOCK: '1'
    },
    stdio: 'ignore',
    shell: true,
    // POSIX: its own process group, so the whole tree can be signalled at once.
    detached: process.platform !== 'win32'
  })

  await waitForServer(BLANK_KEY_URL, 120_000)
}, 130_000)

/**
 * Killing the spawned process is not enough. `npm run dev` is a shell that
 * starts Nuxt as a child, and signalling the shell leaves Nuxt holding the
 * port, so the next run fails its own port check. Both branches kill the tree.
 */
afterAll(async () => {
  if (!server?.pid) return

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    try {
      process.kill(-server.pid)
    } catch {
      server.kill()
    }
  }

  // Do not return until the port is genuinely free, or the next run of this
  // file fails its own check.
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline && (await somethingIsListening(BLANK_KEY_URL))) {
    await new Promise(r => setTimeout(r, 250))
  }
}, 20_000)

describe('POST /api/chat with no provider key', () => {
  const message = { messages: [{ role: 'user', content: 'Hello' }] }

  it('reports the assistant unavailable with a 503', async () => {
    const response = await post(BLANK_KEY_URL, message)
    expect(response.status).toBe(503)

    const body = (await response.json()) as { statusMessage?: string; message?: string }
    expect(`${body.statusMessage ?? ''} ${body.message ?? ''}`).toContain('unavailable')
  })

  it('says nothing about the credential or the provider', async () => {
    const body = await (await post(BLANK_KEY_URL, message)).text()
    expect(body).not.toMatch(/sk-|openai|api[_-]?key/i)
  })

  it('leaves the rest of the shop working', async () => {
    const response = await fetch(`${BLANK_KEY_URL}/api/products`)
    expect(response.status).toBe(200)
  })
})

describe('POST /api/chat message cap', () => {
  it('refuses a history past twenty-five messages and says to start a new one', async () => {
    const messages = Array.from({ length: 26 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`
    }))

    const response = await post(BASE_URL, { messages })
    expect(response.status).toBe(400)

    const body = (await response.json()) as { statusMessage?: string; message?: string }
    expect(`${body.statusMessage ?? ''} ${body.message ?? ''}`).toContain('start a new one')
  })

  it('refuses an empty history', async () => {
    const response = await post(BASE_URL, { messages: [] })
    expect(response.status).toBe(400)
  })
})
