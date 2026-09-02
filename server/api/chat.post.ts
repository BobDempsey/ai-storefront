import OpenAI from 'openai'
import { chatRequestSchema } from '~~/server/utils/schemas'
import { SYSTEM_PROMPT, TOOLS, runTool, type ToolContext } from '~~/server/utils/assistant'
import { mintConfirmation } from '~~/server/utils/confirmations'

const MODEL = 'gpt-5-mini'

/** One message costs one request, so 3 conversations of 25 is the day's budget. */
const REQUESTS_PER_DAY = 75

/** Bounds one turn: without it a single message can fan out into a long run. */
const MAX_TOOL_ROUNDS = 4

export default defineEventHandler(async event => {
  rateLimit(
    `chat:${getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'}`,
    REQUESTS_PER_DAY,
    24 * 60 * 60_000,
    'You have reached the assistant limit for today. The rest of the shop still works.'
  )

  const { openaiApiKey } = useRuntimeConfig()
  if (!openaiApiKey) {
    throw createError({ statusCode: 503, statusMessage: 'The assistant is unavailable right now.' })
  }

  const parsed = chatRequestSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    // A history past 25 lands here too, which is the message cap doing its job.
    throw createError({
      statusCode: 400,
      statusMessage: 'This conversation has ended. Close the assistant and start a new one.'
    })
  }

  const context: ToolContext = { items: parsed.data.items ?? [], intents: [], draft: null }

  const messages: any[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...parsed.data.messages
  ]

  const openai = new OpenAI({ apiKey: openaiApiKey })

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      // The last round drops the tools, so the model has to answer in words
      // rather than asking for another lookup it will not get.
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages,
        ...(round < MAX_TOOL_ROUNDS ? { tools: TOOLS } : {})
      })

      const choice = completion.choices[0]?.message
      if (!choice) break

      const calls = choice.tool_calls ?? []
      if (!calls.length) {
        return {
          reply: choice.content ?? 'Sorry, I did not catch that.',
          intents: context.intents,
          // Minted here, outside everything the provider ever sees. The browser
          // holds it and sends it back with the visitor's Confirm click.
          draft: context.draft ? { ...context.draft, confirmation: mintConfirmation() } : null
        }
      }

      messages.push(choice)
      for (const call of calls) {
        if (call.type !== 'function') continue
        const result = await runTool(call.function.name, call.function.arguments, context)
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result)
        })
      }
    }

    return {
      reply: 'Sorry, I could not work that one out. Could you put it another way?',
      intents: context.intents,
      draft: context.draft ? { ...context.draft, confirmation: mintConfirmation() } : null
    }
  } catch (error) {
    // The provider's own message can carry account and request detail, so it
    // goes to the log and the visitor gets a sentence.
    console.error('[chat] the provider call failed:', error)
    throw createError({
      statusCode: 502,
      statusMessage: 'The assistant is unavailable right now. Please try again.'
    })
  }
})
