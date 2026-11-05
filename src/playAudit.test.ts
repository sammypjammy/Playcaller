import assert from 'node:assert/strict'
import test from 'node:test'
import { completionWithContact } from './completion'
import { finish, fresh, resolve, special } from './engine'
import { assignmentEdge, buildMatchup, buildSpecialMatchup } from './football'
import { defensivePlays, defensiveLookForCall, fakePlays, offenseGroupFor, offensivePlays } from './playbook'
import { buildReplay } from './replay'
import { quarterbackPosition, routePosition, runnerPosition } from './playMotion'
import { motion } from './FieldView'

test('every offensive call and defensive answer produces legal, visible endpoints',()=>{
  let checked=0
  for(const attack of [...offensivePlays,...fakePlays])for(const defend of defensivePlays){
    for(const yard of [2,12,49,87,98]){
      const scene=attack.fake
        ?buildSpecialMatchup('home',attack.id,attack.id.startsWith('fakePunt')?'puntSafe':'fieldGoalSafe',yard)
        :buildMatchup('home',offenseGroupFor(attack.id)!.id,defensiveLookForCall(defend.id),attack.id,defend.id,yard)
      for(let seed=1;seed<=50;seed++){
        const game={...fresh(seed),yard,toGo:Math.min(10,100-yard)}
        const {result:rolled}=resolve(game,attack.id,defend.id,assignmentEdge(scene))
        const result=completionWithContact(rolled,scene,yard,game.toGo)
        const plan=result.replay??buildReplay(result,scene,yard)
        const label=`${attack.id} vs ${defend.id}, yard ${yard}, seed ${seed}`
        assert.ok(Number.isFinite(result.yards),label)
        assert.equal(plan.endYard,Math.max(0,Math.min(100,yard+result.yards)),label)
        assert.ok(plan.carrierId&&scene.offense.some(p=>p.id===plan.carrierId),label)
        if(result.event==='completion'){
          assert.ok(result.yards>=0,label)
          const receiver=scene.offense.find(p=>p.id===plan.receiverId)!
          assert.ok(receiver?.assignment.kind==='route',label)
          assert.ok(Math.abs(routePosition(receiver,plan,1).yard-plan.endYard)<.01,label)
          assert.ok(plan.catchYard!<=plan.endYard,label)
        }
        if(result.event==='sack'){
          assert.ok(result.yards<0,label)
          const passer=scene.offense.find(p=>p.id===plan.carrierId)!
          assert.ok(['QB','P','H'].includes(passer.position),label)
          assert.ok(Math.abs(quarterbackPosition(passer,plan,attack.id,1).yard-plan.endYard)<.01,label)
        }
        if(result.event==='run'){
          const runner=scene.offense.find(p=>p.id===plan.carrierId)!
          assert.ok(Math.abs(runnerPosition(runner,scene.offense.find(p=>p.position==='QB')?.preSnap??runner.preSnap,plan,attack.id,1).yard-plan.endYard)<.01,label)
        }
        if(plan.contact)assert.ok(plan.tacklerId,label)
        if(result.touchdown&&!result.defensiveTouchdown)assert.equal(plan.endYard,100,label)
        const next=finish(game,result,seed)
        assert.ok(next.yard>=1&&next.yard<=99,label)
        assert.ok(next.toGo>=1&&next.toGo<=99,label)
        assert.equal(next.snap,game.snap+1,label)
        assert.equal(next.last?.event,result.event,label)
        if(result.touchdown)assert.equal(next.conversion?.stage,'choice',label)
        if(!result.touchdown&&!result.turnover&&!result.safety&&game.down<4)assert.equal(next.possession,game.possession,label)
        checked++
      }
    }
  }
  assert.equal(checked,(offensivePlays.length+fakePlays.length)*defensivePlays.length*5*50)
})

test('punts and field goals keep possession, score, and ball spots legal',()=>{
  for(const kind of ['punt','fieldGoal'] as const)
    for(const response of kind==='punt'?['puntReturn','puntBlock','puntSafe']:['fieldGoalBlock','fieldGoalSafe'])
      for(const yard of [2,25,49,75,98])for(let seed=1;seed<=100;seed++){
        const game={...fresh(seed),yard}
        const next=special(game,kind,response)
        const label=`${kind} vs ${response}, yard ${yard}, seed ${seed}`
        assert.equal(next.possession,'away',label)
        assert.ok(next.yard>=1&&next.yard<=99,label)
        assert.equal(next.down,1,label)
        assert.equal(next.snap,1,label)
        assert.equal(next.score.home,kind==='fieldGoal'&&next.last?.text.includes('makes')?3:0,label)
        if(next.last?.punt){
          assert.ok(next.last.punt.returnYards>=0,label)
          assert.equal(next.last.punt.catchYard-next.last.punt.returnYards,next.last.punt.endYard,label)
        }
      }
})

test('fake-kick passers move after the snap and sacks show a reachable tackler',()=>{
  for(const playId of ['fakePuntPass','fakeFGPass']){
    const scene=buildSpecialMatchup('home',playId,'puntSafe',35)
    const passer=scene.offense.find(p=>p.assignment.kind==='passing')!
    const result={...resolve(fresh(7),playId,'puntSafe').result,event:'sack' as const,yards:-3,touchdown:false,safety:false}
    result.replay=buildReplay(result,scene,35)
    const moved=motion(passer,result,.38,playId,passer.preSnap)
    assert.notDeepEqual(moved.field,passer.preSnap)
    const down=motion(passer,result,1,playId,passer.preSnap)
    assert.equal(down.field.yard,32)
  }
})
