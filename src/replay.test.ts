import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMatchup } from './football'
import { buildReplay, conversionReturnYard, replayCarrierYard, replayTacklerPosition } from './replay'
import { turfBands, yardLines, yardX } from './fieldGeometry'
import { fresh, resolve, type Result } from './engine'
import { durationFor } from './flow'

const matchup=buildMatchup('home','singleDoubles','look43','sbInside','d43Cover3',25)
const result=(yards:number,event:NonNullable<Result['event']>):Result=>({yards,event,offense:'sbInside',defense:'d43Cover3',text:'test',turnover:false,touchdown:false,safety:false,firstDown:false,clock:20})

test('turf boundaries, yard lines, and number anchors share one yard scale',()=>{
  for(const band of turfBands){assert.equal(band.x,yardX(band.yard));assert.ok(Math.abs(band.x+band.width-yardX(band.yard+5))<1e-10)}
  for(const line of yardLines)assert.equal(line.x,yardX(line.yard))
  assert.ok(Math.abs(yardX(35)-yardX(25)-10*(1000/120))<1e-10)
})
test('positive and negative runs finish at the simulated yard line with a participating tackler',()=>{
  for(const yards of [10,2,-3,22]){
    const plan=buildReplay(result(yards,'run'),matchup,25)
    assert.equal(plan.endYard,25+yards)
    assert.equal(replayCarrierYard(plan,1),plan.endYard)
    const defender=matchup.defense.find(p=>p.id===plan.tacklerId)
    assert.ok(defender)
    const contact=replayTacklerPosition(defender.preSnap,plan,.9)
    assert.ok(Math.hypot(contact.yard-plan.endYard,contact.lateral-plan.targetLateral)<.5)
  }
})
test('completion reaches catch point then the exact final spot, while incompletion leaves the spot unchanged',()=>{
  const completion=buildReplay(result(25,'completion'),matchup,25)
  assert.equal(replayCarrierYard(completion,.65),completion.catchYard)
  assert.equal(replayCarrierYard(completion,1),50)
  const miss=buildReplay(result(0,'incomplete'),matchup,25)
  assert.equal(miss.endYard,25)
  assert.ok(miss.targetYard>25)
  assert.equal(miss.contact,false)
})
test('longer gains get more replay time and interceptions have an on-field defender',()=>{
  assert.ok(durationFor('PLAY_RUNNING',false,result(25,'completion'))>durationFor('PLAY_RUNNING',false,result(2,'run')))
  const pick=buildReplay(result(0,'interception'),matchup,25)
  assert.ok(matchup.defense.some(p=>p.id===pick.interceptorId))
  assert.equal(pick.targetYard,pick.endYard)
})
test('resolved runs and passes supply replay endpoints without changing simulation yardage',()=>{
  for(const attack of ['sbInside','sbSlants'])for(let seed=1;seed<=60;seed++){
    const game=fresh(seed)
    const scene=buildMatchup('home','singleDoubles','look43',attack,'d43Cover3',game.yard)
    const {result:outcome}=resolve(game,attack,'d43Cover3')
    const plan=buildReplay(outcome,scene,game.yard)
    assert.equal(plan.endYard,Math.max(0,Math.min(100,game.yard+outcome.yards)))
    if(['run','completion','sack'].includes(plan.event))assert.equal(replayCarrierYard(plan,1),plan.endYard)
    if(plan.contact)assert.ok(scene.defense.some(p=>p.id===plan.tacklerId))
  }
})
test('defensive return travels from the turnover spot to the opposite goal line',()=>{
  const pick=buildReplay({...result(0,'interception'),turnover:true,conversionReturn:true},matchup,98)
  assert.ok(matchup.defense.some(p=>p.id===pick.returnerId))
  assert.equal(conversionReturnYard(98,98,.35),98)
  assert.equal(conversionReturnYard(98,98,1),0)
  assert.ok(durationFor('PLAY_RUNNING',false,{...result(0,'interception'),conversionReturn:true})>durationFor('PLAY_RUNNING',false,result(0,'incomplete')))
})
