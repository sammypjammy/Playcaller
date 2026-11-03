import test from 'node:test'
import assert from 'node:assert/strict'
import { assignmentPath, pointOnPath } from './assignmentPath'
import { buildDefense, buildOffense } from './football'

test('Strong and Weak I keep the runner behind the quarterback and offset only the fullback', () => {
  for (const [formation, side] of [['strongI',1],['weakI',-1]] as const) {
    const players = buildOffense('home',formation,'21')
    const hb = players.find(player => player.position === 'HB')!
    const fb = players.find(player => player.position === 'FB')!
    assert.equal(hb.field.lateral,0)
    assert.equal(fb.field.lateral,side*2.5)
    assert.equal(players.length,11)
  }
})

test('base linebackers shade toward the tight end without changing the defensive count', () => {
  const strong = buildDefense('away','look43',buildOffense('home','strongI','21'))
  const weak = buildDefense('away','look43',buildOffense('home','weakI','21'))
  assert.equal(strong.length,11)
  assert.equal(weak.length,11)
  const average = (players:typeof strong) => players.filter(player => ['MLB','OLB','ILB'].includes(player.position)).reduce((sum,player) => sum+player.field.lateral,0)/3
  assert.ok(average(strong)>0)
  assert.ok(average(weak)<0)
})

test('play art paths make crossing and out routes break in the assigned direction', () => {
  const receiver = buildOffense('home','singleDoubles','11').find(player => player.position === 'WR' && player.field.lateral < 0)!
  const cross = assignmentPath({...receiver,assignment:{kind:'route',route:'cross'}})
  const out = assignmentPath({...receiver,assignment:{kind:'route',route:'out'}})
  assert.ok(cross.at(-1)!.lateral > 0)
  assert.ok(out.at(-1)!.lateral < 0)
  assert.deepEqual(pointOnPath(cross,0),cross[0])
  assert.deepEqual(pointOnPath(cross,1),cross.at(-1))
})
