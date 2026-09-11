import { describe, expect, it } from 'vitest'
import { deployEnvLabel, resolveDeployEnv } from '~/utils/deploy-env'

/**
 * The asymmetry is the whole point, so it is what these pin. Anything that
 * resolves to an empty string renders no banner, and the live shop has to be
 * the case that needs no configuration at all: the failure that matters is a
 * banner appearing in front of a customer, not one missing from a laptop.
 */

describe('what counts as the live shop', () => {
  it('treats nothing configured, in a build, as the live shop', () => {
    expect(resolveDeployEnv(undefined, false)).toBe('')
    expect(resolveDeployEnv('', false)).toBe('')
  })

  it('treats production as the live shop, the same as unset', () => {
    expect(resolveDeployEnv('production', false)).toBe('')
    expect(resolveDeployEnv('Production', false)).toBe('')
    expect(resolveDeployEnv('  production  ', false)).toBe('')
  })

  it('lets an explicit production override a dev build, because naming it is deliberate', () => {
    expect(resolveDeployEnv('production', true)).toBe('')
  })
})

describe('what gets marked', () => {
  it('marks a dev build that was never configured', () => {
    expect(resolveDeployEnv(undefined, true)).toBe('development')
    expect(resolveDeployEnv('', true)).toBe('development')
  })

  it('marks a deployment by the name it was given', () => {
    // Preview is the case that cannot detect itself: its build is identical to
    // production's, so the name is the only thing that distinguishes it.
    expect(resolveDeployEnv('preview', false)).toBe('preview')
    expect(resolveDeployEnv('staging', false)).toBe('staging')
  })

  it('keeps the configured name over the dev fallback', () => {
    expect(resolveDeployEnv('preview', true)).toBe('preview')
  })
})

describe('how it reads on screen', () => {
  it('capitalises the name', () => {
    expect(deployEnvLabel('development')).toBe('Development')
    expect(deployEnvLabel('preview')).toBe('Preview')
  })

  it('has nothing to say about the live shop', () => {
    expect(deployEnvLabel('')).toBe('')
  })
})
