import assert from 'node:assert/strict'
import test from 'node:test'
import { attemptPAT, attemptTwo, chooseAIConversion, chooseConversion, completeConversion, finish, fresh, openingKickoff, opponentFor, opponentSpecial, resolve, selectAI, special, team, teamIds, teams } from './engine'

test('each selected team draws one of the other three and keeps its identity through kickoff and halftime',()=>{
  for(const selected of teamIds){
    const opponents=[0,.4,.8].map(draw=>opponentFor(selected,draw))
    assert.equal(new Set(opponents).size,3)
    assert.ok(opponents.every(id=>id!==selected))
    for(const opponent of opponents){
      for(const receiver of ['home','away'] as const){
        const g=openingKickoff(fresh(9,selected,opponent),receiver)
        assert.equal(team('home',g).short,teams[selected].short)
        assert.equal(team('away',g).short,teams[opponent].short)
        assert.match(g.log[0],new RegExp(team(receiver,g).short))
        const half=finish({...g,quarter:2,seconds:1},{yards:0,text:'No gain.',offense:'sbInside',defense:'cover3',turnover:false,touchdown:false,safety:false,firstDown:false,clock:29},10)
        assert.equal(half.homeTeamId,selected)
        assert.equal(half.awayTeamId,opponent)
        assert.match(half.log[0],new RegExp(team(receiver==='home'?'away':'home',half).short))
      }
    }
  }
})

test('a touchdown scores six and holds possession for the conversion',()=>{
  const g={...fresh(1),yard:96,toGo:4}
  const next=finish(g,{yards:5,text:'Touchdown!',offense:'sbInside',defense:'d43Cover3',turnover:false,touchdown:true,safety:false,firstDown:false,clock:29},2)
  assert.equal(next.score.home,6);assert.equal(next.possession,'home');assert.equal(next.yard,98);assert.equal(next.down,1);assert.equal(next.conversion?.stage,'choice')
})
test('first down resets distance and incomplete pass preserves it',()=>{
  const g={...fresh(1),down:2,toGo:6,yard:43}
  const first=finish(g,{yards:7,text:'gain',offense:'sbSlants',defense:'d43Cover3',turnover:false,touchdown:false,safety:false,firstDown:true,clock:19},2)
  assert.equal(first.down,1);assert.equal(first.toGo,10)
  const miss=finish(g,{yards:0,text:'incomplete',offense:'sbSlants',defense:'d43Cover3',turnover:false,touchdown:false,safety:false,firstDown:false,clock:6},2)
  assert.equal(miss.down,3);assert.equal(miss.toGo,6)
})
test('the same seed gives a favorable call better average output than an unfavorable one',()=>{
  let favorable=0,unfavorable=0
  for(let seed=0;seed<1000;seed++){
    favorable+=resolve(fresh(seed),'sgVerticals','cover2').result.yards
    unfavorable+=resolve(fresh(seed),'sgVerticals','cover4').result.yards
  }
  assert.ok(favorable>unfavorable+2500)
})
test('punt and field goal advance possession',()=>{
  const punt=special({...fresh(1),down:4},'punt')
  assert.equal(punt.possession,'away');assert.equal(punt.down,1)
  const kick=special({...fresh(1),yard:90,down:4},'fieldGoal')
  assert.equal(kick.possession,'away');assert.equal(kick.score.home,3)
})
test('opening choice determines the first and second half receivers',()=>{
  const home=openingKickoff(fresh(3),'home')
  const away=openingKickoff(fresh(3),'away')
  assert.equal(home.possession,'home')
  assert.equal(away.possession,'away')
  assert.equal(away.selected,'cover3')
  const result={yards:3,text:'3-yard run.',offense:'sbInside',defense:'cover3',turnover:false,touchdown:false,safety:false,firstDown:false,clock:29}
  const homeHalf=finish({...home,quarter:2,seconds:1,down:2,yard:47},result,4)
  assert.equal(homeHalf.quarter,3);assert.equal(homeHalf.seconds,180)
  assert.equal(homeHalf.possession,'away');assert.equal(homeHalf.yard,25);assert.equal(homeHalf.down,1)
  assert.match(homeHalf.log[0],/Halftime kickoff/)
  const awayHalf=special({...away,quarter:2,seconds:1,down:2,yard:70},'punt','puntReturn')
  assert.equal(awayHalf.quarter,3);assert.equal(awayHalf.seconds,180)
  assert.equal(awayHalf.possession,'home');assert.equal(awayHalf.yard,25);assert.equal(awayHalf.down,1)
})
test('a touchdown at halftime completes its conversion before the second half kickoff',()=>{
  const opening=openingKickoff(fresh(4),'home')
  const touchdown=finish({...opening,quarter:2,seconds:1,yard:99,toGo:1},{yards:1,text:'Touchdown!',offense:'sbInside',defense:'cover3',turnover:false,touchdown:true,safety:false,firstDown:false,clock:29},5)
  assert.equal(touchdown.quarter,2);assert.equal(touchdown.seconds,0)
  assert.equal(touchdown.conversion?.stage,'choice')
  const next=completeConversion(attemptPAT(chooseConversion(touchdown,'pat')))
  assert.equal(next.score.home,7)
  assert.equal(next.quarter,3);assert.equal(next.seconds,180)
  assert.equal(next.possession,'away');assert.equal(next.yard,25)
  assert.equal(next.conversion,undefined)
  assert.equal(next.history.length,2)
})
test('special teams kicks work on first down',()=>{
  assert.equal(special({...fresh(6),down:1},'punt').possession,'away')
  assert.equal(special({...fresh(6),down:1,yard:80},'fieldGoal').possession,'away')
})
  test('punt return has a catch, a runback, and matching possession spot',()=>{
    const returned=special({...fresh(7),yard:30,down:4},'punt','puntReturn')
    assert.ok(returned.last?.punt)
    assert.equal(returned.last?.punt?.returnYards,15)
    assert.equal(returned.last?.punt?.catchYard! - returned.last?.punt?.endYard!,15)
    assert.equal(returned.yard,100-returned.last!.punt!.endYard)
    const safe=special({...fresh(7),yard:30,down:4},'punt','puntSafe')
    assert.equal(safe.last?.punt?.returnYards,0)
    const touchback=special({...fresh(7),yard:90,down:4},'punt','puntReturn')
    assert.equal(touchback.last?.punt?.touchback,true)
    assert.equal(touchback.yard,20)
  })
test('a failed fourth down changes possession',()=>{
  const g={...fresh(1),down:4,toGo:8,yard:40}
  const next=finish(g,{yards:2,text:'gain',offense:'sbInside',defense:'d43Cover3',turnover:false,touchdown:false,safety:false,firstDown:false,clock:29},2)
  assert.match(next.last?.text??'',/Turnover on downs/)
  assert.match(next.log[0],/takes over/)
  assert.equal(next.possession,'away');assert.equal(next.yard,58);assert.equal(next.down,1)
})
test('an exhibition reaches a final whistle with valid state',()=>{
  let g=fresh(729)
  for(let i=0;i<1000&&g.phase!=='final';i++){
    if(g.conversion){g=completeConversion(attemptPAT(chooseConversion(g,'pat')));continue}
    if(g.down===4){g=special(g,'punt');continue}
    const attack=g.possession==='home'?'sbInside':selectAI(g)
    const defend=g.possession==='home'?selectAI(g):'d43Cover3'
    const {result,seed}=resolve(g,attack,defend)
    g=finish(g,result,seed)
    assert.ok(g.yard>=1&&g.yard<=99)
    assert.ok(g.down>=1&&g.down<=4)
  }
  assert.equal(g.phase,'final')
  assert.ok(g.quarter>=4)
})

test('PATs add one on success, zero on a miss, and can award two on a blocked return',()=>{
  const touchdown=finish({...fresh(1),yard:98,toGo:2},{yards:2,text:'Touchdown!',offense:'sbInside',defense:'d43Cover3',turnover:false,touchdown:true,safety:false,firstDown:false,clock:29},2)
  const ready=chooseConversion(touchdown,'pat')
  const made=attemptPAT({...ready,seed:1})
  assert.equal(made.score.home,7)
  assert.equal(made.conversion?.stage,'result')
  const missSeed=Array.from({length:10000},(_,i)=>i).find(seed=>attemptPAT({...ready,seed}).last?.text==='PAT MISSED — +0')!
  assert.equal(attemptPAT({...ready,seed:missSeed}).score.home,6)
  const blockSeed=Array.from({length:10000},(_,i)=>i).find(seed=>attemptPAT({...ready,seed},'fieldGoalBlock').last?.text.includes('DEFENSIVE RETURN'))!
  const returned=attemptPAT({...ready,seed:blockSeed},'fieldGoalBlock')
  assert.equal(returned.score.home,6);assert.equal(returned.score.away,2)
  const kickoff=completeConversion(made)
  assert.equal(kickoff.possession,'away');assert.equal(kickoff.yard,25);assert.equal(kickoff.down,1);assert.equal(kickoff.conversion,undefined)
  assert.throws(()=>completeConversion(kickoff))
})

test('two-point tries start at the 2, score at most once, and never advance downs',()=>{
  const touchdown=finish({...fresh(4),yard:99,toGo:1},{yards:1,text:'Touchdown!',offense:'sbInside',defense:'d43Cover3',turnover:false,touchdown:true,safety:false,firstDown:false,clock:29},5)
  const ready=chooseConversion(touchdown,'two')
  assert.equal(ready.yard,98);assert.equal(ready.toGo,2)
  const goodSeed=Array.from({length:1000},(_,i)=>i).find(seed=>attemptTwo({...ready,seed},'sbInside','d43Cover3').last?.touchdown)!
  const good=attemptTwo({...ready,seed:goodSeed},'sbInside','d43Cover3')
  assert.equal(good.score.home,8);assert.equal(good.down,1);assert.equal(good.yard,98)
  const failedSeed=Array.from({length:1000},(_,i)=>i).find(seed=>!attemptTwo({...ready,seed},'sbInside','d43Cover3').last?.touchdown)!
  const failed=attemptTwo({...ready,seed:failedSeed},'sbInside','d43Cover3')
  assert.equal(failed.score.home,6);assert.equal(failed.down,1)
  assert.throws(()=>attemptTwo(good,'sbInside','d43Cover3'))
})

test('AI touchdown receives a conversion choice before kickoff',()=>{
  const away={...fresh(2),possession:'away' as const,yard:99,toGo:1}
  const touchdown=finish(away,{yards:1,text:'Touchdown!',offense:'sbInside',defense:'d43Cover3',turnover:false,touchdown:true,safety:false,firstDown:false,clock:29},3)
  assert.equal(touchdown.score.away,6)
  assert.equal(chooseAIConversion(touchdown),'pat')
  const next=completeConversion(attemptPAT(chooseConversion(touchdown,chooseAIConversion(touchdown))))
  assert.equal(next.possession,'home');assert.equal(next.yard,25)
})

test('a defensive two-point return awards two to the defending team',()=>{
  const touchdown=finish({...fresh(4),yard:99,toGo:1},{yards:1,text:'Touchdown!',offense:'sbInside',defense:'d43Cover3',turnover:false,touchdown:true,safety:false,firstDown:false,clock:29},5)
  const ready=chooseConversion(touchdown,'two')
  let returned:ReturnType<typeof attemptTwo>|undefined
  for(let seed=0;seed<20000&&!returned;seed++){
    const attempt=attemptTwo({...ready,seed},'sbSlants','cover0')
    if(attempt.last?.text.includes('DEFENSIVE RETURN'))returned=attempt
  }
  assert.ok(returned)
  assert.equal(returned.score.home,6)
  assert.equal(returned.score.away,2)
  assert.equal(completeConversion(returned).possession,'away')
})

test('a touchdown at zero keeps its conversion before the final whistle',()=>{
  const late={...fresh(7),quarter:4,seconds:1,yard:99,toGo:1}
  const touchdown=finish(late,{yards:1,text:'Touchdown!',offense:'sbInside',defense:'d43Cover3',turnover:false,touchdown:true,safety:false,firstDown:false,clock:29},8)
  assert.equal(touchdown.phase,'select')
  assert.equal(touchdown.conversion?.stage,'choice')
  const final=completeConversion(attemptPAT(chooseConversion(touchdown,'pat')))
  assert.equal(final.phase,'final')
})
test('history pairs both calls and keeps every snap',()=>{
  let g=fresh(5)
  for(let i=0;i<4;i++){
    const {result,seed}=resolve(g,'sbInside','samBlitz')
    g=finish(g,result,seed)
  }
  assert.equal(g.history.length,4)
  assert.equal(g.history[0].mine,'Inside Zone')
  assert.equal(g.history[0].theirs,'Sam Blitz')
  assert.deepEqual(g.history.map(r=>r.snap),[4,3,2,1])
})
test('Bayport uses fourth-down special teams and records both calls',()=>{
  const g={...fresh(3),possession:'away' as const,down:4,yard:30,toGo:7}
  assert.equal(opponentSpecial(g),'punt')
  const next=special(g,'punt','puntReturn')
  assert.equal(next.possession,'home')
  assert.equal(next.history[0].mine,'Punt Return')
  assert.equal(next.history[0].theirs,'Punt')
})

test('kick outcomes keep legal ball placement near either goal line',()=>{
  for(const yard of [1,2,25,50,90,99])for(const kind of ['punt','fieldGoal'] as const)for(const response of [kind==='punt'?'puntReturn':'fieldGoalSafe',kind==='punt'?'puntBlock':'fieldGoalBlock'])for(let seed=0;seed<20;seed++){
    const next=special({...fresh(seed),yard,down:4},kind,response)
    assert.ok(next.yard>=1&&next.yard<=99,`${yard} ${kind} ${response} ${seed}: ${next.yard}`)
    assert.equal(next.down,1)
    assert.equal(next.possession,'away')
  }
})
