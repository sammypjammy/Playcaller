import assert from 'node:assert/strict'
import test from 'node:test'
import { defenseBrowse, defensivePlays } from './playbook'

test('defensive run and pass folders use only active calls of the selected style', () => {
  const active = new Map(defensivePlays.map(play => [play.id, play]))
  for (const focus of ['run','pass'] as const) {
    for (const style of ['man','zone','blitz'] as const) {
      const calls = defenseBrowse[focus][style]
      assert.ok(calls.length > 0, `${focus} ${style} is empty`)
      for (const id of calls) assert.equal(active.get(id)?.kind, style, `${focus} ${style}: ${id}`)
    }
  }
  assert.deepEqual(new Set(Object.values(defenseBrowse.pass).flat()), new Set(defensivePlays.map(play => play.id)))
})
