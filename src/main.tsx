import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { attemptPAT, attemptTwo, chooseAIConversion, chooseConversion, clockText, completeConversion, defense, fieldPosition, finish, fresh, offense, openingKickoff, opponentSpecial, resolve, selectAI, selectSpecialDefense, special, team, type Game, type Play, type Result } from './engine'
import FieldView from './FieldView'
import { MiniPlayDiagram } from './PlayDiagram'
import RetroPlayArt from './RetroPlayArt'
import { assignmentEdge, buildMatchup, buildSpecialMatchup, offensiveFormations, type Matchup } from './football'
import { defenseBrowse, defenseById, defenseGroups, defensiveLookForCall, fakePlays, offenseGroupFor, offenseGroups, offenseById, specialGroups, specialResponses } from './playbook'
import { durationFor, flowReducer, initialFlow, isPlaying, isSelectionPhase, isSnapReady } from './flow'
import { executionNote } from './strategy'
import { buildReplay } from './replay'
import './style.css'
import './panel.css'
import './retro.css'

type Book = {offense:string[];defense:string[]}
const defaultBook:Book={offense:offenseGroups.map(g=>g.plays[0]),defense:defenseGroups.map(g=>g.plays[0])}
function loadBook():Book { try {const raw=JSON.parse(localStorage.getItem('playcaller-book-v2')||'null');if(raw&&Array.isArray(raw.offense)&&Array.isArray(raw.defense)) return {offense:offense.filter(p=>raw.offense.includes(p.id)).map(p=>p.id),defense:defense.filter(p=>raw.defense.includes(p.id)).map(p=>p.id)}} catch{} return defaultBook }
type CallCard = Pick<Play,'id'|'name'|'formation'|'description'> & {kind:string;situation?:string;strength?:string;weakness?:string}
const offensiveSpecial:CallCard[]=[{id:'punt',name:'Punt',kind:'special',formation:'Punt Unit',description:'Kick away and play field position.'},{id:'fieldGoal',name:'Field Goal',kind:'special',formation:'Kick Unit',description:'Try for three points from field-goal range.'},...fakePlays]
const defensiveSpecial:CallCard[]=specialResponses.map(p=>({id:p.id,name:p.name,kind:'special',formation:p.id.startsWith('punt')?'Punt Unit':'Field Goal Unit',description:p.id.includes('Safe')?'Hold assignments and guard against a fake.':p.id.includes('Block')?'Pressure the kick and risk a fake.':'Set up a return.'}))
const isFake=(id:string)=>fakePlays.some(p=>p.id===id)
const isSpecial=(id:string)=>id==='punt'||id==='fieldGoal'||isFake(id)||specialResponses.some(p=>p.id===id)
type PendingPlay={kind:'normal';before:Game;result:Result;seed:number;label:string}|{kind:'kick';before:Game;next:Game;label:string}|{kind:'conversion';before:Game;next:Game;label:string}
function resultLabel(pending:PendingPlay|null){
  if(!pending)return ''
  if(pending.kind==='kick'||pending.kind==='conversion')return pending.label
  const r=pending.result,name=offenseById(r.offense)?.name.toUpperCase()??'PLAY'
  if(r.touchdown)return 'TOUCHDOWN!'
  if(r.safety)return 'SAFETY!'
  if(r.turnover)return r.text.includes('Intercepted')?'INTERCEPTION!':'FUMBLE — DEFENSE RECOVERS'
  if(r.text==='Incomplete pass.')return 'INCOMPLETE PASS'
  if(r.yards<0)return `${name} — LOSS OF ${Math.abs(r.yards)}`
  return `${name} — ${r.yards} YARD ${r.offense.startsWith('fake')||offenseById(r.offense)?.kind==='pass'?'COMPLETION':'GAIN'}`
}
function App(){
  const [g,setG]=useState<Game>(()=>fresh())
  const [coinToss,setCoinToss]=useState(true)
  const [book,setBook]=useState<Book>(loadBook)
  const [edit,setEdit]=useState(false)
  const speed=new URLSearchParams(window.location.search).has('quick')
  const [flow,dispatch]=useReducer(flowReducer,initialFlow)
  const [progress,setProgress]=useState(0)
  const [folder,setFolder]=useState('singleDoubles')
  const [offFormation,setOffFormation]=useState('singleDoubles')
  const [defLook,setDefLook]=useState('zone')
  const [browseView,setBrowseView]=useState<'formation'|'type'>('formation')
  const [playType,setPlayType]=useState<'run'|'pass'|'special'>('run')
  const [defenseFocus,setDefenseFocus]=useState<'run'|'pass'|'special'>('pass')
  const [defenseStyle,setDefenseStyle]=useState<'man'|'zone'|'blitz'>('zone')
  const [info,setInfo]=useState<string|null>(null)
  const debug=new URLSearchParams(window.location.search).has('debug')
  const [liveMatchup,setLiveMatchup]=useState<Matchup|null>(null)
  const [transitionFrom,setTransitionFrom]=useState<Matchup|null>(null)
  const [playClock,setPlayClock]=useState(40)
  const pending=useRef<PendingPlay|null>(null)
  const specialTransition=useRef(false)
  const snapLock=useRef(false)
  const selection:CallCard[]=g.possession==='home'?[...offense,...(!g.conversion?offensiveSpecial.filter(p=>p.id==='punt'||p.id==='fieldGoal'):[]),...(!g.conversion&&g.down===4?fakePlays:[])]:[...defense,...(opponentSpecial(g)?defensiveSpecial:[])]
  const group=offenseGroups.find(x=>x.id===offFormation)!
  const passConcepts=[...new Set(offense.filter(p=>p.kind==='pass').map(p=>offenseById(p.id)!.concept))]
  const passCalls=passConcepts.map(concept=>{const variants=offense.filter(p=>p.kind==='pass'&&offenseById(p.id)?.concept===concept);return variants.find(p=>p.id===g.selected)??variants.find(p=>offenseGroupFor(p.id)?.id===offFormation)??variants[0]})
  const typeCalls=playType==='pass'?passCalls:playType==='special'?g.conversion?[]:offensiveSpecial.filter(p=>p.id==='punt'||p.id==='fieldGoal'):offense.filter(p=>p.kind==='run')
  const predictedKick=opponentSpecial(g)
  const activeDefenseFocus=defenseFocus==='special'&&!predictedKick?'pass':defenseFocus
  const defenseIds:readonly string[]=activeDefenseFocus==='special'?defensiveSpecial.filter(p=>p.id.startsWith(predictedKick??'')).map(p=>p.id):defenseBrowse[activeDefenseFocus][defenseStyle]
  const allowedSpecial=isSpecial(g.selected)&&(g.possession==='home'?(g.selected==='punt'||g.selected==='fieldGoal'||g.down===4):!!predictedKick&&g.selected.startsWith(predictedKick))
  const chosen=selection.some(p=>p.id===g.selected)&&(g.possession==='home'?(browseView==='type'?typeCalls.some(p=>p.id===g.selected):group.plays.includes(g.selected))||allowedSpecial:defenseIds.includes(g.selected))?g.selected:g.possession==='home'?(browseView==='type'&&typeCalls.length?typeCalls[0].id:group.plays[0]):defenseIds[0]??'cover3'
  const passVariants=offense.filter(p=>p.kind==='pass'&&offenseById(p.id)?.concept===offenseById(chosen)?.concept)
  const infoPlay=selection.find(p=>p.id===info)
  const selectedFormation=offensiveFormations.find(f=>f.id===offFormation)!
  const selectedPersonnel=selectedFormation.defaultPersonnel
  const previewMatchup=useMemo(()=>{
    const attack=g.possession==='home'?chosen:selectAI(g)
    const defend=g.possession==='home'?selectAI(g):chosen
    if(g.possession==='home'&&isSpecial(chosen))return buildSpecialMatchup('home',chosen,selectSpecialDefense(g,chosen==='punt'||chosen.startsWith('fakePunt')?'punt':'fieldGoal'),g.yard)
    const aiKick=opponentSpecial(g)
    if(g.possession==='away'&&aiKick)return buildSpecialMatchup('away',aiKick,isSpecial(chosen)?chosen:aiKick==='punt'?'puntReturn':'fieldGoalBlock',g.yard)
    const formation=g.possession==='home'?selectedFormation.id:offenseGroupFor(attack)?.id??'singleDoubles'
    const look=defensiveLookForCall(defend)
    return buildMatchup(g.possession,formation,look,attack,defend,g.yard,g.possession==='home'?selectedPersonnel:undefined)
  },[g.possession,g.yard,g.seed,g.down,chosen,selectedFormation.id,selectedPersonnel,defLook])
  const matchup=isPlaying(flow.phase)&&liveMatchup?liveMatchup:previewMatchup
  const availableSpecial=g.conversion?[]:specialGroups
  const categoryOptions=[...offenseGroups,...availableSpecial]
  const visibleCalls:CallCard[]=g.possession==='away'?selection.filter(p=>defenseIds.includes(p.id)):browseView==='type'?typeCalls:availableSpecial.some(s=>s.id===folder)?offensiveSpecial.filter(p=>categoryOptions.find(x=>x.id===folder)?.plays.includes(p.id)):selection.filter(p=>categoryOptions.find(x=>x.id===folder)?.plays.includes(p.id))
  const situation=coinToss?'COIN TOSS':g.phase==='final'?'FINAL':g.conversion?g.conversion.mode==='two'?'2-POINT TRY':'EXTRA POINT':`${g.down}${g.down===1?'ST':g.down===2?'ND':g.down===3?'RD':'TH'} & ${g.toGo}`
  const kickoffTitle=coinToss?'COIN TOSS':g.phase==='select'&&g.snap===0?`OPENING KICKOFF · ${team(g.possession).short} RECEIVES`:g.phase==='select'&&g.quarter===3&&g.seconds===180&&g.log[0]?.startsWith('Halftime kickoff')?`HALFTIME KICKOFF · ${team(g.possession).short} RECEIVES`:null
  const flipBook=(side:keyof Book,id:string)=>{setBook(old=>{const list=old[side];const next={...old,[side]:list.includes(id)?list.filter(x=>x!==id):[...list,id]};localStorage.setItem('playcaller-book-v2',JSON.stringify(next));return next})}
  const choosePlay=(id:string)=>{
    if(coinToss||!isSelectionPhase(flow.phase)||g.phase==='final'||(g.conversion&&g.conversion.stage!=='pick'))return
    const formation=offenseGroupFor(id)
    const category=defenseGroups.find(x=>x.plays.includes(id))
    if(formation)setOffFormation(formation.id)
    if(category)setDefLook(category.id)
    setTransitionFrom(flow.phase==='READY_FOR_SNAP'?previewMatchup:null)
    setG(old=>({...old,selected:id}))
    dispatch('SELECT')
  }
  const kickPAT=(choice:Game)=>{
    if(snapLock.current)return
    snapLock.current=true
    const before=chooseConversion(choice,'pat')
    const response=before.conversion?.team==='home'?selectSpecialDefense(before,'fieldGoal'):'fieldGoalSafe'
    const next=attemptPAT(before,response)
    const patMatchup=buildSpecialMatchup(before.possession,'fieldGoal',response,85)
    if(next.last?.conversionReturn)next.last.returnerId=patMatchup.defense[0].id
    pending.current={kind:'conversion',before,next,label:next.conversion?.result??'PAT COMPLETE'}
    setLiveMatchup(patMatchup)
    setG({...before,phase:'animating',ballStart:85,ballEnd:next.last?.text.includes('BLOCKED')?88:110})
    dispatch('CONVERSION_SNAP')
  }
  const selectExtraPoint=(mode:'pat'|'two')=>{
    if(g.conversion?.stage!=='choice'||flow.phase!=='HUDDLE')return
    if(mode==='pat')kickPAT(g)
    else setG(chooseConversion(g,'two'))
  }
  const start=()=>{
    if(coinToss||!isSnapReady(flow.phase)||g.phase!=='select'||snapLock.current||g.conversion?.stage==='choice')return
    snapLock.current=true
    if(g.conversion){
      if(g.conversion.mode!=='two'||g.conversion.stage!=='pick')return
      const attack=g.possession==='home'?chosen:selectAI(g)
      const defend=g.possession==='home'?selectAI(g):chosen
      const next=attemptTwo(g,attack,defend,assignmentEdge(previewMatchup))
      next.last!.replay=buildReplay(next.last!,previewMatchup,98)
      next.last!.returnerId=next.last!.replay?.returnerId
      pending.current={kind:'conversion',before:g,next,label:next.conversion?.result??'TWO-POINT TRY COMPLETE'}
      setLiveMatchup(previewMatchup)
      setG({...g,phase:'animating',selected:chosen,seed:next.seed,ballStart:98,ballEnd:Math.max(0,Math.min(100,98+(next.last?.yards??0)))})
      dispatch('SNAP')
      return
    }
    const aiKick=opponentSpecial(g)
    const homeKick=g.possession==='home'&&(chosen==='punt'||chosen==='fieldGoal')?chosen as 'punt'|'fieldGoal':null
    if(homeKick||aiKick){
      const kick=homeKick??aiKick!
      const next=special(g,kick,homeKick?selectSpecialDefense(g,kick):isSpecial(chosen)?chosen:kick==='punt'?'puntReturn':'fieldGoalBlock')
      if(next.last?.punt)next.last.returnerId=previewMatchup.defense.find(p=>p.position==='FS')?.id
      pending.current={kind:'kick',before:g,next,label:next.history[0]?.outcome??'KICK AWAY'}
      setLiveMatchup(previewMatchup)
      setG({...g,phase:'animating',selected:chosen,ballStart:g.yard,ballEnd:kick==='fieldGoal'?(next.last?.text.includes('blocked')?g.yard+3:110):Math.min(100,g.yard+(next.last?.yards??0))})
      dispatch('SNAP')
      return
    }
    const attack=g.possession==='home'?chosen:selectAI(g)
    const defend=g.possession==='home'?(isFake(chosen)?selectSpecialDefense(g,chosen.startsWith('fakePunt')?'punt':'fieldGoal'):selectAI(g)):chosen
    const {result,seed}=resolve(g,attack,defend,assignmentEdge(previewMatchup))
    result.replay=buildReplay(result,previewMatchup,g.yard)
    pending.current={kind:'normal',before:g,result,seed,label:result.text}
    setLiveMatchup(previewMatchup)
    setG({...g,phase:'animating',selected:chosen,seed,ballStart:g.yard,ballEnd:Math.max(0,Math.min(100,g.yard+result.yards))})
    dispatch('SNAP')
  }
  useEffect(()=>{
    if(flow.phase==='PLAY_SELECTED'){dispatch('BREAK');return}
    if(flow.phase==='READY_FOR_SNAP'){snapLock.current=false;setProgress(1);return}
    const duration=durationFor(flow.phase,speed,pending.current?.kind==='normal'?pending.current.result:pending.current?.next.last)
    if(!duration)return
    setProgress(0)
    let frame=0,active=true,startTime=performance.now()
    const tick=(now:number)=>{
      if(!active)return
      const t=Math.min(1,(now-startTime)/duration)
      setProgress(t)
      if(t<1){frame=requestAnimationFrame(tick);return}
      if(flow.phase==='BREAKING_HUDDLE')dispatch('LINE_UP')
      else if(flow.phase==='LINING_UP')dispatch('READY')
      else if(flow.phase==='PLAY_RUNNING')dispatch('END_RUN')
      else if(flow.phase==='PLAY_ENDING'){
        const p=pending.current
        if(p){const next=p.kind==='normal'?finish(p.before,p.result,p.seed):p.next;specialTransition.current=!!next.conversion||next.possession!==p.before.possession||next.quarter!==p.before.quarter||next.phase==='final'||p.kind==='kick';setG(next)}
        dispatch('SHOW_RESULT')
      }else if(flow.phase==='SHOWING_RESULT'){
        if(specialTransition.current||pending.current?.kind==='conversion'){
          if(pending.current?.kind==='conversion')setG(completeConversion(pending.current.next))
          setLiveMatchup(null);setTransitionFrom(null);pending.current=null;specialTransition.current=false;snapLock.current=false;dispatch('SPECIAL_RESET')
        }
        else dispatch('RETURN')
      }else if(flow.phase==='RETURNING_TO_HUDDLE'){setLiveMatchup(null);setTransitionFrom(null);pending.current=null;dispatch('HUDDLE')}
    }
    frame=requestAnimationFrame(tick)
    return()=>{active=false;cancelAnimationFrame(frame)}
  },[flow.phase,flow.revision,speed])
  useEffect(()=>{if(g.conversion?.stage==='choice'&&g.conversion.team==='away'&&flow.phase==='HUDDLE'){const mode=chooseAIConversion(g);if(mode==='pat')kickPAT(g);else setG(chooseConversion(g,'two'))}},[g.conversion?.stage,g.snap,flow.phase])
  useEffect(()=>{if(coinToss||g.phase!=='select'||g.conversion)return;setPlayClock(40);const timer=setInterval(()=>setPlayClock(n=>Math.max(0,n-1)),1000);return()=>clearInterval(timer)},[coinToss,g.snap,g.phase,g.conversion?.stage])
  useEffect(()=>{if(defenseFocus==='special'&&!predictedKick)setDefenseFocus('pass')},[defenseFocus,predictedKick])
  useEffect(()=>{if(g.conversion?.mode==='two'&&g.conversion.stage==='pick'&&playType==='special')setPlayType('run')},[g.conversion?.stage,g.conversion?.mode,playType])
  useEffect(()=>{setFolder(g.possession==='home'?(browseView==='type'?playType:offFormation):defLook)},[g.possession,browseView,playType])
  const restart=()=>{snapLock.current=false;pending.current=null;specialTransition.current=false;setProgress(0);setLiveMatchup(null);setTransitionFrom(null);setPlayClock(40);setCoinToss(true);setG(fresh());dispatch('RESET')}
  const beginGame=(receiver:'home'|'away')=>{setG(openingKickoff(fresh(),receiver));setCoinToss(false);setDefenseFocus('pass');setFolder(offFormation);dispatch('RESET')}
  const feedbackOffense=offenseById(g.last?.offense??'')?.name??offensiveSpecial.find(p=>p.id===g.last?.offense)?.name??g.last?.offense
  const feedbackDefense=defenseById(g.last?.defense??'')?.name??specialResponses.find(p=>p.id===g.last?.defense)?.name??g.last?.defense
  const diagramFor=(p:CallCard):Matchup=>{
    if(g.possession==='home'&&isSpecial(p.id))return buildSpecialMatchup('home',p.id,selectSpecialDefense(g,p.id.startsWith('fakePunt')||p.id==='punt'?'punt':'fieldGoal'),g.yard)
    if(g.possession==='away'&&isSpecial(p.id))return buildSpecialMatchup('away',opponentSpecial(g)??'punt',p.id,g.yard)
    const attack=g.possession==='home'?p.id:selectAI(g)
    const defend=g.possession==='home'?selectAI(g):p.id
    return buildMatchup(g.possession,offenseGroupFor(attack)?.id??'singleDoubles',defensiveLookForCall(defend),attack,defend,g.yard)
  }
  const miniMatchups=useMemo(()=>{
    const next:Record<string,Matchup>={}
    visibleCalls.forEach(p=>{next[p.id]=diagramFor(p)})
    return next
  },[folder,browseView,playType,defenseFocus,defenseStyle,g.possession,g.yard,g.seed,g.down,g.snap,offFormation,defLook])
  const fieldGame=isPlaying(flow.phase)&&pending.current?{
    ...pending.current.before,phase:'animating' as const,
    last:pending.current.kind==='normal'?pending.current.result:pending.current.next.last,
    ballStart:pending.current.before.yard,
    ballEnd:pending.current.kind==='normal'?Math.max(0,Math.min(100,pending.current.before.yard+pending.current.result.yards)):pending.current.next.last?.offense==='fieldGoal'?(pending.current.next.last.text.toUpperCase().includes('BLOCKED')?pending.current.before.yard+3:110):Math.min(100,pending.current.before.yard+(pending.current.next.last?.yards??0))
  }:g
  const playResult=flow.phase==='SHOWING_RESULT'?resultLabel(pending.current):''
  return <div className="app">
    <main>
      <section className="scoreboard"><div className={`team home ${g.possession==='home'&&!coinToss?'hasBall':''}`}><span className="crest">IC</span><div><small>HOME {g.possession==='home'&&!coinToss?'◆ BALL':''}</small><strong>IRON CITY</strong><em>FOUNDRY</em></div><b>{g.score.home}</b></div><div className="centerScore"><span>Q{g.quarter} <i>•</i> {clockText(g.seconds)}</span><strong>{situation}</strong><small>{coinToss?'CHOOSE OPENING POSSESSION':g.phase==='final'?'EXHIBITION COMPLETE':g.conversion?`${team(g.conversion.team).short} CONVERSION`: `${team(g.possession).short} BALL · ${fieldPosition(g.yard)} · PLAY ${String(playClock).padStart(2,'0')}`}</small></div><div className={`team away ${g.possession==='away'&&!coinToss?'hasBall':''}`}><b>{g.score.away}</b><div><small>AWAY {g.possession==='away'&&!coinToss?'◆ BALL':''}</small><strong>BAYPORT</strong><em>BREAKERS</em></div><span className="crest">BB</span></div></section>
      <div className="layout"><section className="gameColumn"><div className="fieldHeader"><span>LIVE FIELD</span><span>{kickoffTitle??flow.phase.replaceAll('_',' ')}</span></div>
        <FieldView game={fieldGame} matchup={matchup} progress={progress} debug={debug&&(g.possession==='away'||isPlaying(flow.phase))} flow={flow.phase} fromMatchup={transitionFrom} previousMatchup={liveMatchup} resultText={playResult}/>
      </section>
      <section className="insightsColumn" aria-label="Play insights and history">
        <div className="feedback" role="status"><b>WHY THAT PLAY?</b>{g.last&&g.phase!=='animating'?<><div><span><small>OFFENSE</small>{feedbackOffense}</span><span><small>DEFENSE</small>{feedbackDefense}</span><span><small>MATCHUP</small>{g.last.matchup??'Neutral'}</span><span><small>RESULT</small>{g.last.text}</span></div><p>{g.last.why} {executionNote(g.last)}</p></>:<p>{g.last?'Watch the current play unfold.':'Choose a call and snap the ball to see how the matchup played out.'}</p>}</div>
        <section className="playHistory"><h2>Play History</h2><div className="playHistoryList">{g.history.length?g.history.map(r=><div className="playHistoryItem" key={r.snap}><b>#{r.snap}</b><span><small>MY PLAY</small>{r.mine}</span><span><small>THEIR PLAY</small>{r.theirs}</span><span><small>RESULT</small>{r.outcome}</span></div>):<p>No plays yet.</p>}</div></section>
      </section>
      <aside className="coach">
        {coinToss?<div className="coinTossPanel"><span className="eyebrow">OPENING COIN TOSS</span><div className="coinFace" aria-hidden="true">P</div><h1>Your call</h1><p>Choose whether Iron City receives the opening kickoff or starts on defense. The other team receives the second half kickoff.</p><button className="primary" onClick={()=>beginGame('home')}>OFFENSE FIRST ↗</button><button className="primary" onClick={()=>beginGame('away')}>DEFENSE FIRST ↗</button><small>Kickoffs begin at the receiving team's 25.</small></div>:g.phase==='final'?<div className="finalPanel"><span>FINAL SCORE</span><strong>{g.score.home} – {g.score.away}</strong><p>{g.score.home===g.score.away?'The exhibition ends in a tie.':g.score.home>g.score.away?'The Foundry take the win.':'The Breakers take the win.'}</p><button className="primary" onClick={restart}>PLAY AGAIN ↗</button></div>:g.conversion?.stage==='choice'?<div className="conversionPanel"><span className="eyebrow">TOUCHDOWN! +6</span><h1>Extra Point</h1><p>Choose how to finish the score.</p><div><button className="primary" disabled={flow.phase!=='HUDDLE'||g.conversion.team!=='home'} onClick={()=>selectExtraPoint('pat')}>KICK PAT</button><button className="primary" disabled={flow.phase!=='HUDDLE'||g.conversion.team!=='home'} onClick={()=>selectExtraPoint('two')}>GO FOR 2</button></div></div>:g.conversion?.stage==='result'||g.conversion?.mode==='pat'&&g.phase==='animating'?<div className="conversionPanel"><span className="eyebrow">EXTRA POINT</span><h1>{g.conversion.result??'PAT IN FLIGHT'}</h1></div>:<>
          <div className="callHead"><div><span className="eyebrow">{g.possession==='home'?'OFFENSE':'DEFENSE'}{g.conversion?.mode==='two'?' · TWO-POINT TRY':''}</span><h1>Choose a call</h1></div><button className="primary callSnap" disabled={!isSnapReady(flow.phase)||g.phase!=='select'} onClick={start}>SNAP ↗</button></div>
          {g.possession==='home'?<div className="browseModes"><button className={browseView==='formation'?'active':''} onClick={()=>setBrowseView('formation')}>FORMATION VIEW</button><button className={browseView==='type'?'active':''} onClick={()=>setBrowseView('type')}>PLAY TYPE VIEW</button>{browseView==='type'&&<div className="typeTabs"><button className={playType==='run'?'active':''} onClick={()=>setPlayType('run')}>RUN</button><button className={playType==='pass'?'active':''} onClick={()=>setPlayType('pass')}>PASS</button><button className={playType==='special'?'active':''} disabled={!!g.conversion} onClick={()=>setPlayType('special')}>SPECIAL TEAMS</button></div>}</div>:<div className="browseModes defenseModes"><button className={activeDefenseFocus==='run'?'active':''} disabled={!isSelectionPhase(flow.phase)} onClick={()=>{setDefenseFocus('run');const ids=defenseBrowse.run[defenseStyle];if(!ids.some(id=>id===g.selected))choosePlay(ids[0])}}>RUN DEFENSE</button><button className={activeDefenseFocus==='pass'?'active':''} disabled={!isSelectionPhase(flow.phase)} onClick={()=>{setDefenseFocus('pass');const ids=defenseBrowse.pass[defenseStyle];if(!ids.some(id=>id===g.selected))choosePlay(ids[0])}}>PASS DEFENSE</button>{predictedKick&&<button className={activeDefenseFocus==='special'?'active':''} disabled={!isSelectionPhase(flow.phase)} onClick={()=>{setDefenseFocus('special');const first=defensiveSpecial.find(p=>p.id.startsWith(predictedKick));if(first)choosePlay(first.id)}}>SPECIAL TEAMS</button>}</div>}
          {g.possession==='home'&&browseView==='formation'&&<div className="formationPicker"><label>FORMATION / SPECIAL TEAMS<select value={folder} disabled={!isSelectionPhase(flow.phase)} onChange={e=>{const id=e.target.value;setFolder(id);const first=categoryOptions.find(x=>x.id===id)?.plays[0];if(first)choosePlay(first)}}>{categoryOptions.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label></div>}
          {g.possession==='home'&&browseView==='type'&&playType==='pass'&&<div className="formationPicker"><label>SELECTED PLAY FORMATION<select value={chosen} disabled={!isSelectionPhase(flow.phase)} onChange={e=>choosePlay(e.target.value)}>{passVariants.map(p=><option key={p.id} value={p.id}>{offenseGroupFor(p.id)?.name??p.formation}</option>)}</select></label></div>}
          {g.possession==='away'&&activeDefenseFocus!=='special'&&<div className="formationPicker"><label>DEFENSIVE STYLE<select value={defenseStyle} disabled={!isSelectionPhase(flow.phase)} onChange={e=>{const style=e.target.value as 'man'|'zone'|'blitz';setDefenseStyle(style);const ids=defenseBrowse[activeDefenseFocus][style];if(!ids.some(id=>id===g.selected))choosePlay(ids[0])}}><option value="man">Man Coverage</option><option value="zone">Zone Coverage</option><option value="blitz">Blitz</option></select></label></div>}
          <div className="folderList"><div className="folder"><div className="callList">{visibleCalls.map(p=><div className="callRow" key={p.id}><button disabled={!isSelectionPhase(flow.phase)} className={`call ${chosen===p.id?'selected':''}`} onClick={()=>choosePlay(p.id)}><MiniPlayDiagram matchup={miniMatchups[p.id]??previewMatchup} side={g.possession==='away'?'defense':'offense'}/><span className="callText"><strong>{p.name}</strong><small>{p.id==='fieldGoal'?`${100-g.yard+17}-YARD ATTEMPT · `:''}{p.formation.toUpperCase()} · {p.kind.toUpperCase()} · {p.description}</small></span>{(g.possession==='home'?book.offense:book.defense).includes(p.id)&&<span className="favorite" aria-label="Favorite call">★</span>}</button><button className="infoButton" aria-label={`Learn about ${p.name}`} onClick={()=>setInfo(p.id)}>ⓘ</button></div>)}</div></div></div>
        </>}
      </aside></div>
    </main><footer><span>PLAYCALLER / PROTOTYPE 01</span><span>FICTIONAL TEAMS · EXHIBITION FOOTBALL</span><div className="footerActions"><button onClick={()=>setEdit(true)}>MY FAVORITES</button><button onClick={restart}>NEW GAME ↻</button></div></footer>
    {edit&&<div className="modalBackdrop" onClick={()=>setEdit(false)}><div className="modal" role="dialog" aria-modal="true" aria-label="Edit playbook" onClick={e=>e.stopPropagation()}><div className="modalHead"><div><span className="eyebrow">IRON CITY FOUNDRY</span><h2>Team favorites</h2></div><button onClick={()=>setEdit(false)} aria-label="Close">×</button></div><p>Star the calls you want to remember. Every active call stays playable.</p><div className="bookColumns">{(['offense','defense'] as const).map(side=><div key={side}><h3>{side.toUpperCase()}</h3>{(side==='offense'?offense:defense).map(p=><label key={p.id} className="bookItem"><input type="checkbox" checked={book[side].includes(p.id)} onChange={()=>flipBook(side,p.id)}/><span><b>{p.name}</b><small>{p.formation}</small></span></label>)}</div>)}</div><button className="primary" onClick={()=>setEdit(false)}>DONE ↗</button></div></div>}
    {infoPlay&&<div className="modalBackdrop playArtBackdrop" onClick={()=>setInfo(null)}><div className="playArtModal" role="dialog" aria-modal="true" aria-label={`${infoPlay.name} play art`} onClick={e=>e.stopPropagation()}><div className="playArtHeading"><div><small>{infoPlay.formation} · {infoPlay.kind.toUpperCase()}</small><h2>{infoPlay.name}</h2></div><button aria-label="Close play art" onClick={()=>setInfo(null)}>×</button></div><RetroPlayArt matchup={miniMatchups[infoPlay.id]??diagramFor(infoPlay)} side={g.possession==='away'?'defense':'offense'}/><details className="playArtExtra"><summary>COACH NOTES · {infoPlay.description}</summary><div className="playArtNotes"><p><b>USE IT:</b> {infoPlay.situation??'When field position and down make the risk worthwhile.'}</p><p><b>STRENGTH:</b> {infoPlay.strength??'Can catch an aggressive opponent off guard.'}</p><p><b>WATCH FOR:</b> {infoPlay.weakness??'A prepared opponent can limit the gain.'}</p></div></details></div></div>}
  </div>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)
