import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMatchup, validateMatchup } from './football'
import { fresh, resolve } from './engine'
import { defenseById, defensiveLookForCall, defensivePlays, offenseById, offenseGroups, offensivePlays } from './playbook'
import { assessMatchup, executionNote, probabilities } from './strategy'

test('all active concepts have legal 11-player alignments and full assignments',()=>{
  for(const group of offenseGroups)for(const id of group.plays)for(const d of defensivePlays){
    const m=buildMatchup('home',group.id,defensiveLookForCall(d.id),id,d.id,40)
    assert.equal(m.offense.length,11);assert.equal(m.defense.length,11)
    assert.equal(validateMatchup(m).length,0,`${id} vs ${d.id}`)
    assert.ok([...m.offense,...m.defense].every(p=>p.assignment?.kind))
  }
  assert.equal(offensivePlays.length,20)
})
test('recognizable coverage shells match the selected defense',()=>{
  for(const [id,deep] of [['cover0',0],['cover1',1],['cover2',2],['cover3',3],['cover4',4]] as const){
    const m=buildMatchup('home','shotgunSpread',defensiveLookForCall(id),'sgMesh',id,45)
    assert.equal(m.defense.filter(p=>p.assignment.kind==='deepSafety').length,deep,id)
    if(id==='cover0')assert.ok(m.defense.some(p=>p.assignment.kind==='blitz'))
  }
})
test('central matchup table captures seam, flood, crossing and run-fit principles',()=>{
  assert.equal(assessMatchup(offenseById('sgVerticals')!,defenseById('cover2')!).rating,'Favorable')
  assert.equal(assessMatchup(offenseById('sgVerticals')!,defenseById('cover4')!).rating,'Unfavorable')
  assert.equal(assessMatchup(offenseById('sgFlood')!,defenseById('cover3')!).rating,'Favorable')
  assert.equal(assessMatchup(offenseById('sgMesh')!,defenseById('cover1')!).rating,'Favorable')
  assert.equal(assessMatchup(offenseById('sgDraw')!,defenseById('samBlitz')!).rating,'Favorable')
})
test('probabilities stay bounded and seeded outcomes include grounded feedback',()=>{
  for(const o of offensivePlays)for(const d of defensivePlays)for(const skill of [-10,0,10]){
    const p=probabilities(o,d,assessMatchup(o,d).edge,skill,10)
    for(const value of Object.values(p))assert.ok(value>=0&&value<=1,`${o.id} ${d.id}: ${value}`)
    if(o.kind==='pass')assert.ok(p.completion<=.78)
  }
  const a=resolve(fresh(777),'sgVerticals','cover2')
  const b=resolve(fresh(777),'sgVerticals','cover2')
  assert.deepEqual(a,b)
  assert.equal(a.result.matchup,'Favorable')
  assert.match(a.result.why??'',/safeties/)
})
test('feedback separates the quality of the call from its execution',()=>{
  assert.match(executionNote({matchup:'Favorable',event:'incomplete',yards:0,turnover:false,offense:'sgVerticals'}),/useful matchup.*execution/)
  assert.match(executionNote({matchup:'Unfavorable',event:'completion',yards:12,turnover:false,offense:'sgVerticals'}),/better matchup.*gain/)
  assert.match(executionNote({matchup:'Neutral',event:'run',yards:3,turnover:false,offense:'sbInside'}),/confirmed only after the snap/)
})
