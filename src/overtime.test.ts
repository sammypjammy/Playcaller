import assert from 'node:assert/strict'
import test from 'node:test'
import { attemptPAT, attemptTwo, chooseAIConversion, chooseConversion, completeConversion, finish, fresh, resolve, special, type Result } from './engine'
import { buildMatchup } from './football'
import { buildReplay } from './replay'

const noGain:Result={yards:0,text:'No gain.',offense:'sbInside',defense:'cover3',turnover:false,touchdown:false,safety:false,firstDown:false,clock:29,event:'run'}
const touchdown:Result={...noGain,yards:1,text:'Touchdown!',touchdown:true,firstDown:false}

test('a tied regulation game starts overtime and gives both sides a chance',()=>{
  const overtime=finish({...fresh(1),quarter:4,seconds:1,down:4,toGo:7,score:{home:7,away:7}},noGain,3)
  assert.equal(overtime.quarter,5)
  assert.equal(overtime.overtime?.mode,'quarter')
  assert.equal(overtime.yard,25)
  assert.equal(overtime.phase,'select')
  const second=special(overtime,'punt')
  assert.equal(second.overtime?.turns,1)
  assert.equal(second.possession,overtime.possession==='home'?'away':'home')
  assert.equal(second.yard,25)
  assert.equal(second.phase,'select')
  const double=special(second,'punt')
  assert.equal(double.overtime?.mode,'shootout')
  assert.equal(double.quarter,6)
  assert.equal(double.yard,75)
  assert.equal(double.seconds,0)
})

test('tied double overtime repeats paired drives; a lead after both chances ends the game',()=>{
  const tied=finish({...fresh(1),quarter:4,seconds:1,down:4,toGo:7,score:{home:7,away:7}},noGain,3)
  const double=special(special(tied,'punt'),'punt')
  const second=special(double,'punt')
  assert.equal(second.overtime?.turns,1)
  assert.equal(second.yard,75)
  const triple=special(second,'punt')
  assert.equal(triple.overtime?.round,2)
  assert.equal(triple.quarter,7)
  const scored=finish({...triple,yard:99,toGo:1},touchdown,5)
  assert.equal(scored.conversion?.stage,'choice')
  assert.equal(chooseAIConversion(scored),'two')
  assert.throws(()=>chooseConversion(scored,'pat'),/required/)
  const ready=chooseConversion(scored,'two')
  const converted=completeConversion(attemptTwo(ready,'sbInside','cover3'))
  assert.equal(converted.overtime?.turns,1)
  assert.equal(converted.yard,75)
  assert.equal(special(converted,'punt').phase,'final')
})

test('a tying touchdown at the end of regulation completes its kick before overtime',()=>{
  const late=finish({...fresh(1),quarter:4,seconds:1,yard:99,toGo:1,score:{home:0,away:7}},touchdown,5)
  assert.equal(late.conversion?.stage,'choice')
  assert.equal(late.overtime,undefined)
  const tied=completeConversion(attemptPAT(chooseConversion(late,'pat')))
  assert.deepEqual(tied.score,{home:7,away:7})
  assert.equal(tied.quarter,5)
  assert.equal(tied.overtime?.mode,'quarter')
})

test('an intercepted pass has a return spot, a tackler, and can become a pick six',()=>{
  const g={...fresh(7),yard:35}
  const matchup=buildMatchup('home','singleDoubles','look43','sbSlants','cover3',35)
  const pick:Result={...noGain,offense:'sbSlants',event:'interception',turnover:true,text:'Intercepted! 18-yard return.',returnYards:18}
  pick.replay=buildReplay(pick,matchup,35)
  assert.ok(pick.replay.returnEndYard!<pick.replay.catchYard!)
  assert.ok(matchup.offense.some(p=>p.id===pick.replay!.tacklerId))
  const next=finish(g,pick,8)
  assert.equal(next.possession,'away')
  assert.equal(next.yard,100-pick.replay.returnEndYard!)
  assert.deepEqual(next.score,{home:0,away:0})
  const six:Result={...pick,returnYards:110,defensiveTouchdown:true,touchdown:true,text:'PICK SIX! Interception returned for a touchdown.'}
  six.replay=buildReplay(six,matchup,35)
  assert.equal(six.replay.returnEndYard,0)
  const scored=finish(g,six,8)
  assert.equal(scored.score.away,6)
  assert.equal(scored.conversion?.team,'away')
  assert.equal(scored.conversion?.driveOffense,'home')
  assert.equal(completeConversion(attemptPAT(chooseConversion(scored,'pat'))).possession,'home')
})

test('the seeded simulation can produce an actual pick six',()=>{
  let six:Result|undefined
  for(let seed=0;seed<20000&&!six;seed++){
    const result=resolve({...fresh(seed),yard:15},'sbSlants','cover0').result
    if(result.defensiveTouchdown)six=result
  }
  assert.ok(six)
  assert.equal(six.event,'interception')
  assert.equal(six.turnover,true)
  assert.match(six.text,/PICK SIX/)
})
