import { defensivePlays, defenseById, offensivePlays, offenseById, offenseGroupFor, type PlayKind, type PlaySpec } from './playbook'
import { assessMatchup, probabilities, clamp, type MatchupRating } from './strategy'
import type { ReplayPlan } from './replay'
export type Side = 'home' | 'away'
export type Phase = 'select' | 'animating' | 'final'
export type Kind = PlayKind
export type Play = PlaySpec
export type Team = { name: string; short: string; color: string; accent: string; ratings: { qb: number; rb: number; wr: number; line: number; rush: number; cover: number }; offense: string[]; defense: string[] }
export type Result = { yards: number; text: string; offense: string; defense: string; turnover: boolean; touchdown: boolean; safety: boolean; firstDown: boolean; clock: number; event?:'run'|'completion'|'incomplete'|'sack'|'interception'|'fumble'; matchup?:MatchupRating; why?:string; replay?:ReplayPlan; conversionReturn?:boolean; returnerId?:string; punt?:{catchYard:number;endYard:number;returnYards:number;touchback:boolean} }
export type PlayRecord = { snap: number; mine: string; theirs: string; outcome: string }
export type Conversion = {team:Side;stage:'choice'|'pick'|'result';mode?:'pat'|'two';result?:string}
export type Game = { phase: Phase; quarter: number; seconds: number; possession: Side; openingReceiver:Side; pendingPeriod?:2|3|4; yard: number; down: number; toGo: number; score: Record<Side, number>; drive: number; snap: number; selected: string; last?: Result; log: string[]; history: PlayRecord[]; recent: string[]; ballStart: number; ballEnd: number; seed: number; conversion?:Conversion }

export const offense: Play[] = offensivePlays
export const defense: Play[] = defensivePlays
export const home: Team = { name:'Iron City Foundry',short:'ICF',color:'#eb673e',accent:'#ffe2b0',ratings:{qb:78,rb:82,wr:76,line:80,rush:79,cover:74},offense:offense.map(p=>p.id),defense:defense.map(p=>p.id) }
export const away: Team = { name:'Bayport Breakers',short:'BAY',color:'#53bccc',accent:'#e9fcf8',ratings:{qb:81,rb:75,wr:82,line:76,rush:76,cover:80},offense:offense.map(p=>p.id),defense:defense.map(p=>p.id) }
export const other = (s: Side): Side => s === 'home' ? 'away' : 'home'
export const team = (s: Side) => s === 'home' ? home : away
export const clockText = (s: number) => `${Math.floor(Math.max(0,s)/60)}:${String(Math.max(0,s)%60).padStart(2,'0')}`
export const fieldPosition = (yard: number) => yard === 50 ? '50' : yard < 50 ? `OWN ${yard}` : `OPP ${100-yard}`
export const nextRandom = (seed: number): [number,number] => { const n = (Math.imul(seed,1664525)+1013904223)>>>0; return [n,n/4294967296] }
export function fresh(seed = Date.now()>>>0): Game { return {phase:'select',quarter:1,seconds:180,possession:'home',openingReceiver:'home',yard:25,down:1,toGo:10,score:{home:0,away:0},drive:1,snap:0,selected:'sbInside',log:['Opening kickoff: Iron City starts at its 25.'],history:[],recent:[],ballStart:25,ballEnd:25,seed} }
export function openingKickoff(g:Game,receiver:Side):Game{
  return {...g,possession:receiver,openingReceiver:receiver,yard:25,down:1,toGo:10,selected:receiver==='home'?'sbInside':'cover3',ballStart:25,ballEnd:25,log:[`Opening kickoff: ${team(receiver).short} receives at its 25.`]}
}
export function selectAI(g: Game): string {
  const pool = g.possession === 'home' ? defense : offense
  if(g.possession === 'away') {
    const plays = offense.filter(p=>away.offense.includes(p.id))
    const repeated = g.recent.slice(-2)
    const candidates = plays.map(p=>({p,weight: 1 + (g.toGo > 8 && p.kind==='pass'?2:0) + (g.toGo <= 3 && p.kind==='run'?2:0) - (repeated.includes(p.id)?0.75:0)}))
    const total = candidates.reduce((n,c)=>n+c.weight,0)
    let r = ((g.seed % 997)/997)*total
    return candidates.find(c=>(r-=c.weight)<=0)?.p.id ?? plays[0].id
  }
  const recent = g.recent.slice(-3)
  const repeated=recent.at(-1)
  if(repeated&&recent.filter(x=>x===repeated).length>=2){const attack=offenseById(repeated);if(attack){const counter=[...defense].sort((a,b)=>assessMatchup(attack,a).edge-assessMatchup(attack,b).edge)[0];if(counter)return counter.id}}
  const family=recent.length?offenseGroupFor(recent.at(-1)!):undefined
  const options=family?.id==='i'?defense.filter(d=>d.kind==='blitz'||d.id==='cover1'):family?.id==='shotgunSpread'?defense.filter(d=>d.formation==='Nickel 4–2–5'||d.id==='cover2'):pool
  return options[(g.seed>>>4)%options.length].id
}
export function resolve(g: Game, attackId: string, defendId: string, assignmentModifier=0): {result:Result;seed:number} {
  const o = offenseById(attackId) ?? offense[0]
  const d = defenseById(defendId) ?? (o.fake?{...defense[0],id:defendId,name:defendId,kind:defendId.includes('Block')?'blitz':'contain',concept:defendId.includes('Safe')?'special-safe':'special-block',counter:[]} as Play:defense[0])
  let seed=g.seed; const draws:number[]=[];for(let i=0;i<5;i++){let r:number;[seed,r]=nextRandom(seed);draws.push(r)}
  const a=team(g.possession).ratings, b=team(other(g.possession)).ratings
  const skill=o.kind==='run'?(a.rb+a.line-b.rush-78)/14:(a.qb+a.wr-b.cover-78)/14
  const assessment=assessMatchup(o,d),edge=assessment.edge
  const profile=probabilities(o,d,edge,skill,g.toGo,g.yard,g.down)
  let event:NonNullable<Result['event']>=o.kind==='run'?'run':'completion'
  if(o.kind==='pass'){
    if(draws[0]<profile.sack)event='sack'
    else if(draws[1]<profile.interception)event='interception'
    else if(draws[2]>profile.completion)event='incomplete'
  }else if(draws[1]<profile.fumble)event='fumble'
  const noise=(draws[3]+draws[4]-1)*(o.kind==='run'?8:13)
  let yards=event==='incomplete'||event==='interception'||event==='fumble'?0:event==='sack'?-Math.round(2+draws[3]*7):Math.round(o.base+edge*1.5+skill+assignmentModifier*.55+noise-(o.fake?2:0))
  yards=clamp(yards,-9,o.kind==='pass'?35:22)
  const interception=event==='interception',fumble=event==='fumble',incomplete=event==='incomplete'
  const touchdown=!interception&&!fumble&&g.yard+yards>=100
  const safety=!interception&&!fumble&&g.yard+yards<=0
  const firstDown=!touchdown&&!safety&&yards>=g.toGo
  const turnover=interception||fumble
  const text=interception?'Intercepted!':fumble?'Fumble recovered by the defense!':incomplete?'Incomplete pass.':event==='sack'?`Sacked for ${Math.abs(yards)} yards.`:safety?'Safety!':touchdown?'Touchdown!':yards<0?`Stopped for ${Math.abs(yards)}-yard loss.`:yards===0?'No gain.':`${yards}-yard ${o.kind==='run'?'run':'completion'}.`
  const clock=incomplete?6:o.kind==='run'?29:19
  return {result:{yards,text,offense:o.id,defense:d.id,turnover,touchdown,safety,firstDown,clock,event,matchup:assessment.rating,why:assessment.why},seed}
}
function advanceClock(g:Game,elapsed:number) {
  const seconds=Math.max(0,g.seconds-elapsed)
  return {quarter:g.quarter,seconds,finished:g.quarter===4&&seconds===0,nextQuarter:seconds===0&&g.quarter<4?(g.quarter+1) as 2|3|4:undefined}
}
function addLog(g:Game,line:string){return [line,...g.log].slice(0,12)}
function startNextPeriod(g:Game,nextQuarter:2|3|4):Game{
  if(nextQuarter!==3)return {...g,quarter:nextQuarter,seconds:180,pendingPeriod:undefined,log:addLog(g,`Quarter ${nextQuarter} begins.`)}
  const receiver=other(g.openingReceiver)
  return {...g,quarter:3,seconds:180,pendingPeriod:undefined,phase:'select',possession:receiver,yard:25,down:1,toGo:10,drive:g.drive+1,recent:[],selected:receiver==='home'?'sbInside':'cover3',ballStart:25,ballEnd:25,log:addLog(g,`Halftime kickoff: ${team(receiver).short} receives at its 25.`)}
}
export function finish(g:Game,result:Result,seed:number):Game {
  const time=advanceClock(g,result.clock), p=g.possession, opp=other(p)
  const offensiveName=offenseById(result.offense)?.name??result.offense
  const defensiveName=defenseById(result.defense)?.name??result.defense.replace(/([A-Z])/g,' $1').replace(/^./,x=>x.toUpperCase())
  const base:Game={...g,phase:'select',seed,quarter:time.quarter,seconds:time.seconds,pendingPeriod:undefined,snap:g.snap+1,last:result,history:[{snap:g.snap+1,mine:p==='home'?offensiveName:defensiveName,theirs:p==='home'?defensiveName:offensiveName,outcome:result.text},...g.history],recent:[...g.recent,result.offense].slice(-5),ballStart:g.yard,ballEnd:Math.max(0,Math.min(100,g.yard+result.yards))}
  const call=`${team(p).short} ${offensiveName} vs ${defensiveName}: ${result.text}`
  base.log=addLog(g,call)
  if(result.touchdown){base.score={...g.score,[p]:g.score[p]+6};base.log=addLog({...g,log:base.log},`${team(p).short} touchdown! (+6) Choose an extra-point attempt.`);base.conversion={team:p,stage:'choice'};base.pendingPeriod=time.nextQuarter;base.yard=98;base.down=1;base.toGo=2;base.recent=[]}
  else if(result.safety){base.score={...g.score,[opp]:g.score[opp]+2};base.possession=opp;base.yard=25;base.down=1;base.toGo=10;base.drive++;base.recent=[]}
  else if(result.turnover){base.possession=opp;base.yard=Math.max(1,Math.min(99,100-g.yard-result.yards));base.down=1;base.toGo=Math.min(10,100-base.yard);base.drive++;base.recent=[]}
  else if(g.down===4&&!result.firstDown){base.possession=opp;base.yard=Math.max(1,Math.min(99,100-g.yard-result.yards));base.down=1;base.toGo=Math.min(10,100-base.yard);base.drive++;base.recent=[];base.log=addLog({...g,log:base.log},'Turnover on downs.')}
  else {base.yard=Math.max(1,Math.min(99,g.yard+result.yards));base.down=result.firstDown?1:g.down+1;base.toGo=result.firstDown?Math.min(10,100-base.yard):Math.max(1,g.toGo-result.yards)}
  if(time.finished&&!base.conversion){base.phase='final';base.log=addLog({...g,log:base.log},'Final whistle.')} 
  return time.nextQuarter&&!base.conversion?startNextPeriod(base,time.nextQuarter):base
}

export function chooseAIConversion(g:Game):'pat'|'two'{
  if(!g.conversion)throw new Error('No touchdown conversion pending')
  const side=g.conversion.team,difference=g.score[side]-g.score[other(side)]
  return g.quarter===4&&g.seconds<=120&&[-9,-8,-5,-2,1,5].includes(difference)?'two':'pat'
}
export function chooseConversion(g:Game,mode:'pat'|'two'):Game{
  if(g.conversion?.stage!=='choice'||g.phase==='final')throw new Error('Conversion choice is unavailable')
  return {...g,yard:mode==='pat'?85:98,down:1,toGo:mode==='pat'?15:2,conversion:{...g.conversion,stage:'pick',mode}}
}
function conversionResult(g:Game,result:Result,seed:number,scoringPoints:number,returnPoints:number,attackName:string,defenseName:string):Game{
  const side=g.conversion!.team,opponent=other(side)
  const record={snap:g.snap+1,mine:side==='home'?attackName:defenseName,theirs:side==='home'?defenseName:attackName,outcome:result.text}
  return {...g,seed,snap:g.snap+1,last:result,score:{home:g.score.home+(side==='home'?scoringPoints:returnPoints),away:g.score.away+(side==='away'?scoringPoints:returnPoints)},history:[record,...g.history],log:addLog(g,result.text),conversion:{team:side,stage:'result',mode:g.conversion!.mode,result:result.text},ballStart:g.yard,ballEnd:g.conversion!.mode==='pat'?110:Math.max(0,Math.min(100,g.yard+result.yards))}
}
export function attemptPAT(g:Game,defenseCall='fieldGoalSafe'):Game{
  if(g.conversion?.stage!=='pick'||g.conversion.mode!=='pat')throw new Error('PAT is unavailable')
  let seed=g.seed,roll:number,returnRoll:number;[seed,roll]=nextRandom(seed);[seed,returnRoll]=nextRandom(seed)
  const blocked=defenseCall==='fieldGoalBlock'&&roll<.1
  const good=!blocked&&roll<.94
  const returned=blocked&&returnRoll<.35
  const text=returned?'PAT BLOCKED — DEFENSIVE RETURN +2':blocked?'PAT BLOCKED — +0':good?'PAT GOOD — +1':'PAT MISSED — +0'
  const result:Result={yards:0,text,offense:'fieldGoal',defense:defenseCall,turnover:returned,touchdown:false,safety:false,firstDown:false,clock:0,matchup:'Neutral',why:blocked?'The rush reached the kick.':good?'The kick cleared the uprights.':'The kick missed the uprights.',conversionReturn:returned}
  return conversionResult(g,result,seed,good?1:0,returned?2:0,'Kick PAT',defenseCall==='fieldGoalBlock'?'PAT Block':'PAT Safe')
}
export function attemptTwo(g:Game,attackId:string,defendId:string,assignmentModifier=0):Game{
  if(g.conversion?.stage!=='pick'||g.conversion.mode!=='two')throw new Error('Two-point attempt is unavailable')
  const {result,seed:resolvedSeed}=resolve({...g,yard:98,down:1,toGo:2},attackId,defendId,assignmentModifier)
  let seed=resolvedSeed,returnRoll:number;[seed,returnRoll]=nextRandom(seed)
  const returned=result.turnover&&returnRoll<.2
  const good=result.touchdown
  const text=returned?'TWO-POINT TRY — DEFENSIVE RETURN +2':good?'TWO-POINT CONVERSION GOOD — +2':'TWO-POINT CONVERSION FAILED — +0'
  const attempt={...result,text,clock:0,firstDown:false,touchdown:good,why:good?'The offense reached the goal line.':returned?'The defense took the turnover back.':'The defense kept the offense out of the end zone.',conversionReturn:returned}
  return conversionResult(g,attempt,seed,good?2:0,returned?2:0,offenseById(attackId)?.name??attackId,defenseById(defendId)?.name??defendId)
}
export function completeConversion(g:Game):Game{
  if(g.conversion?.stage!=='result')throw new Error('Conversion result is not final')
  const receiver=other(g.conversion.team),finished=g.quarter===4&&g.seconds<=0
  const next:Game={...g,conversion:undefined,phase:finished?'final':'select',possession:receiver,yard:25,down:1,toGo:10,drive:g.drive+1,recent:[],selected:receiver==='home'?'sbInside':'cover3',ballStart:25,ballEnd:25,log:addLog(g,finished?'Final whistle.':g.pendingPeriod===3?'Conversion complete. Halftime.':`${team(receiver).short} receives the kickoff at its 25.`)}
  return g.pendingPeriod?startNextPeriod(g.pendingPeriod===3?{...next,drive:g.drive}:next,g.pendingPeriod):next
}
export function opponentSpecial(g:Game):'punt'|'fieldGoal'|null {
  if(g.possession!=='away'||g.down!==4) return null
  if(g.yard>=65 && 100-g.yard+17<=55) return 'fieldGoal'
  if(g.toGo<=2 && g.yard>=48) return null
  return 'punt'
}
export function selectSpecialDefense(g:Game,kind:'punt'|'fieldGoal'):string {
  const fakeSeen=g.history.slice(0,3).some(r=>r.mine.startsWith('Fake'))
  const roll=(g.seed%101)/101
  if(kind==='punt')return fakeSeen&&roll<.6?'puntSafe':roll<.22?'puntBlock':'puntReturn'
  return fakeSeen&&roll<.6?'fieldGoalSafe':roll<.4?'fieldGoalBlock':'fieldGoalSafe'
}
export function special(g:Game,kind:'punt'|'fieldGoal',defenseCall?:string):Game {
  const p=g.possession,opp=other(p),time=advanceClock(g,8)
  let seed=g.seed,r:number;[seed,r]=nextRandom(seed)
  const distance=100-g.yard+17,blocked=(defenseCall==='puntBlock'||defenseCall==='fieldGoalBlock')&&r<.1
  const good=kind==='fieldGoal'&&!blocked&&distance<=55&&r<(distance<=35?.9:.68)-(defenseCall==='fieldGoalBlock'?.12:0)
  const puntYards=blocked?0:Math.min(55,37+Math.floor(r*14))
  const catchYard=Math.min(100,g.yard+puntYards),touchback=kind==='punt'&&!blocked&&g.yard+puntYards>=100
  const returnYards=kind==='punt'&&!blocked&&!touchback&&defenseCall!=='puntBlock'&&defenseCall!=='puntSafe'?Math.min(15,Math.max(0,catchYard-1)):0
  const endYard=catchYard-returnYards
  const punt=kind==='punt'&&!blocked?{catchYard,endYard,returnYards,touchback}:undefined
  const line=blocked?`${team(p).short} ${kind==='punt'?'punt':'field goal'} is blocked!`:kind==='punt'?`${team(p).short} punts ${puntYards} yards${touchback?' for a touchback':returnYards?`; ${team(opp).short} returns it ${returnYards} yards`:'; fair catch'}.`:good?`${team(p).short} makes a ${distance}-yard field goal! (+3)`:`${team(p).short} misses from ${distance} yards.`
  const target=blocked?Math.max(1,Math.min(99,100-g.yard+3)):kind==='punt'?touchback?20:Math.max(1,Math.min(99,100-endYard)):good?25:Math.max(20,100-g.yard)
  const kickingCall=kind==='punt'?'Punt':'Field Goal'
  const receivingCall=({puntReturn:'Punt Return',puntBlock:'Punt Block',puntSafe:'Punt Safe',fieldGoalBlock:'Field Goal Block',fieldGoalSafe:'Field Goal Safe'} as Record<string,string>)[defenseCall??'']??(kind==='punt'?'Punt Return':'Field Goal Block')
  const record={snap:g.snap+1,mine:p==='home'?kickingCall:receivingCall,theirs:p==='home'?receivingCall:kickingCall,outcome:line}
  const why=kind==='punt'?'The punt traded possession for field position. The return or block call influenced the outcome.':'The kick attempted three points from the current distance. The defensive response added pressure without determining the result.'
  const next:Game={...g,seed,quarter:time.quarter,seconds:time.seconds,phase:time.finished?'final':'select',score:good?{...g.score,[p]:g.score[p]+3}:g.score,possession:opp,yard:target,down:1,toGo:Math.min(10,100-target),drive:g.drive+1,snap:g.snap+1,recent:[],last:{yards:kind==='punt'?puntYards:0,text:line,offense:kind,defense:defenseCall??(kind==='punt'?'puntReturn':'fieldGoalSafe'),turnover:false,touchdown:false,safety:false,firstDown:false,clock:8,matchup:'Neutral',why,punt},history:[record,...g.history],log:addLog(g,line)}
  return time.nextQuarter?startNextPeriod(next,time.nextQuarter):next
}
