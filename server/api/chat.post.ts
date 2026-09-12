import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { chatRequestSchema } from '~~/server/utils/schemas'
import { SYSTEM_PROMPT, TOOLS, runTool, type ToolContext } from '~~/server/utils/assistant'
import { mintConfirmation } from '~~/server/utils/confirmations'

const MODEL = 'gpt-5-mini'

/** One message costs one request, so 3 conversations of 25 is the day's budget. */
const REQUESTS_PER_DAY = 75

/** Bounds one turn: without it a single message can fan out into a long run. */
const MAX_TOOL_ROUNDS = 4

/**
 * How much the model deliberates before answering. `gpt-5-mini` is a reasoning
 * model, and left at its default it thinks before every turn: one measured
 * question took 29 seconds over three rounds and spent 896 reasoning tokens,
 * the last round alone burning 768. The same question at `low` answered in 6.4
 * seconds over two rounds, calling the same tool. The extra round is the part
 * worth knowing: thinking harder sent it back to look things up again rather
 * than answer.
 *
 * `minimal` measured no faster than `low` and leaves the model less room to
 * hold to the rules in SYSTEM_PROMPT, several of which exist to stop a visitor
 * talking it out of something. Those rules are checked against this setting by
 * `npm run test:llm` and `npm run test:e2e:llm`; if one of them turns, this is
 * the first thing to put back.
 */
const REASONING_EFFORT = 'low' as const

export default defineEventHandler(async event => {
  rateLimitByCaller(
    event,
    address => `chat:${address}`,
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

  // The SDK's own union, not `any[]`: the loop below pushes the model's reply
  // and a tool result back into this array, and a malformed round should be a
  // type error here rather than a 400 from the provider.
  const messages: ChatCompletionMessageParam[] = [
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
        // On every round, not just the first: the slowest round measured was
        // the last one, the one that writes the answer.
        reasoning_effort: REASONING_EFFORT,
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
