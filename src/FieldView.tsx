import { useEffect, useRef, useState } from 'react'
import type { Game, Result } from './engine'
import type { ActivePlayer, Matchup } from './football'
import SpriteAtlas from './SpriteAtlas'
import { teamVisuals, type SpritePose } from './visuals'
import { blendPoint, huddlePositions, tackleAngle } from './fieldPresentation'
import type { FlowPhase } from './flow'
import { lateralY, turfBands, yardLines, yardX } from './fieldGeometry'
import { conversionReturnYard, replayTacklerPosition } from './replay'
import { assignmentPath, pointOnPath } from './assignmentPath'
import { normalBallPosition, quarterbackPosition, routePosition, runnerPosition } from './playMotion'

type Props={game:Game;matchup:Matchup;progress:number;debug:boolean;flow:FlowPhase;fromMatchup:Matchup|null;previousMatchup:Matchup|null;resultText:string}
function motion(player:ActivePlayer,result:Result|undefined,progress:number,playId:string,qbStart:ActivePlayer['preSnap']):ActivePlayer {
  if(progress<=0)return player
  const assignment=player.assignment,kind=assignment.kind
  let forward=0,lateral=0
  const replay=result?.replay
  if(player.position==='QB'&&replay){
    const at=quarterbackPosition(player,replay,playId,progress)
    forward=at.yard-player.preSnap.yard;lateral=at.lateral-player.preSnap.lateral
  }
  else if(kind==='ballCarry'&&replay&&(replay.event==='run'||replay.event==='fumble')){
    const at=runnerPosition(player,qbStart,replay,playId,playId==='sgDraw'?Math.max(0,(progress-.13)/.87):progress)
    forward=at.yard-player.preSnap.yard;lateral=at.lateral-player.preSnap.lateral
  }
  else if(kind==='route'){
    const at=routePosition(player,replay,progress)
    forward=at.yard-player.preSnap.yard;lateral=at.lateral-player.preSnap.lateral
  }
  else if(kind==='handoff'||kind==='playAction')forward=1.2*progress
  else if(['pullBlock','leadBlock','runBlock','passBlock','protection'].includes(kind)){
    const point=pointOnPath(assignmentPath(player),progress)
    forward=point.forward;lateral=point.lateral
  }
  else if(kind==='passRush'||kind==='blitz'){forward=-3.8*progress;lateral=-Math.sign(player.field.lateral)*.6*progress}
  else if(kind==='runGap'||kind==='edgeContain')forward=-1.8*progress
  else if(kind==='man'||kind==='zone'||kind==='deepSafety'||kind==='runSupport')forward=2*progress
  const state:ActivePlayer['state']=kind==='ballCarry'?'carrying':kind==='passBlock'||kind==='runBlock'||kind==='leadBlock'||kind==='pullBlock'||kind==='protection'?'blocking':kind==='man'||kind==='zone'||kind==='deepSafety'?'covering':kind==='passRush'||kind==='blitz'?'rushing':'moving'
  return {...player,state,field:{yard:player.preSnap.yard+forward,lateral:player.preSnap.lateral+lateral}}
}
function pose(p:ActivePlayer,flow:FlowPhase,progress:number,result:Result|undefined,targetId:string|undefined,tacklerId:string|undefined,incomplete:boolean,returnerId?:string):SpritePose {
  if(flow==='HUDDLE'||flow==='PLAY_SELECTED'||flow==='READY_FOR_SNAP')return ['OL','DL'].includes(p.position)&&flow==='READY_FOR_SNAP'?'set':'idle'
  if(flow==='BREAKING_HUDDLE'||flow==='LINING_UP'||flow==='RETURNING_TO_HUDDLE')return 'run'
  if(flow==='PLAY_ENDING'||flow==='SHOWING_RESULT'){
    if(returnerId&&p.id===returnerId)return result?.punt?'fall':'celebrate'
    if(p.id===tacklerId)return result?.event==='interception'?'catch':'tackle'
    if(p.id===targetId){if(result?.touchdown)return 'celebrate';if(incomplete)return progress<.6?'catch':'fall';return progress<.25?'run':'fall'}
    return 'idle'
  }
  if(progress===0)return ['OL','DL'].includes(p.position)?'set':'idle'
  if(returnerId&&p.id===returnerId)return 'sprint'
  const kind=p.assignment.kind
  if(kind==='ballCarry')return progress>.45?'sprint':'run'
  if(kind==='handoff'||kind==='playAction'||kind==='passing')return 'pass'
  if(kind==='route')return p.id===targetId&&result?.event==='completion'?progress>=.57&&progress<.72?'catch':progress>=.72?'sprint':'run':progress>.55?'sprint':'run'
  if(['runBlock','passBlock','pullBlock','leadBlock','protection'].includes(kind))return 'block'
  if(['passRush','blitz','runGap','edgeContain','runSupport'].includes(kind))return 'sprint'
  return 'run'
}
export default function FieldView({game,matchup,progress,debug,flow,fromMatchup,previousMatchup,resultText}:Props){
  const shellRef=useRef<HTMLDivElement>(null)
  const [viewWidth,setViewWidth]=useState(700)
  useEffect(()=>{
    const shell=shellRef.current
    if(!shell)return
    const update=()=>{
      const {width,height}=shell.getBoundingClientRect()
      if(height>0)setViewWidth(Math.max(440,Math.min(1000,Math.round(420*width/height))))
    }
    const observer=new ResizeObserver(update)
    observer.observe(shell)
    update()
    return()=>observer.disconnect()
  },[])
  const homeAttack=game.possession==='home'
  const world=(yard:number)=>homeAttack?yardX(yard):yardX(100-yard)
  const fieldY=lateralY
  const playing=flow==='PLAY_RUNNING'||flow==='PLAY_ENDING'||flow==='SHOWING_RESULT'
  const ending=flow==='PLAY_ENDING'||flow==='SHOWING_RESULT'
  const runProgress=flow==='PLAY_RUNNING'?progress:playing?1:0
  const huddles=huddlePositions(matchup,game.yard)
  const oldPositions=fromMatchup?new Map([...fromMatchup.offense,...fromMatchup.defense].map(p=>[p.id,p.field])):huddles
  const returningPositions=previousMatchup?new Map([...previousMatchup.offense,...previousMatchup.defense].map(p=>{const moving=motion(p,game.last,1,previousMatchup.playId,previousMatchup.offense.find(q=>q.position==='QB')?.preSnap??{yard:game.yard-2,lateral:0});return [p.id,moving.field]})):new Map<string,ActivePlayer['field']>()
  const lineupProgress=flow==='BREAKING_HUDDLE' ? progress*.45 : flow==='LINING_UP' ? .45+progress*.55 : 1
  const qbStart=matchup.offense.find(p=>p.position==='QB')?.preSnap??{yard:game.yard-2,lateral:0}
  const played=[...matchup.offense,...matchup.defense].map(p=>motion(p,game.last,runProgress,matchup.playId,qbStart))
  const replay=game.last?.replay
  const runner=played.find(p=>p.id===replay?.carrierId)
  for(const p of played.filter(p=>p.team!==matchup.offense[0].team)){
    if(replay?.interceptorId===p.id){p.field=blendPoint(p.preSnap,{yard:replay.targetYard,lateral:replay.targetLateral},Math.min(1,runProgress/.65));continue}
    if(p.assignment.kind==='man'&&p.assignment.target){const receiver=played.find(x=>x.id===p.assignment.target);if(receiver)p.field=blendPoint(p.field,{yard:receiver.field.yard+1.5,lateral:receiver.field.lateral},runProgress*.72)}
    else if(['zone','deepSafety'].includes(p.assignment.kind))p.field={yard:p.preSnap.yard+(p.assignment.kind==='deepSafety'?2:3)*runProgress,lateral:p.preSnap.lateral+(p.assignment.zone?.includes('left')?-2:2)*runProgress}
    else if(runner&&['runGap','runSupport','edgeContain','qbSpy','passRush','blitz'].includes(p.assignment.kind))p.field=blendPoint(p.field,{yard:runner.field.yard+1,lateral:runner.field.lateral},runProgress*.5)
    if(replay?.event==='completion'&&runner&&runProgress>.65&&p.id!==replay.tacklerId)p.field=blendPoint(p.field,{yard:runner.field.yard-1,lateral:runner.field.lateral},Math.min(.55,(runProgress-.65)*1.8))
    if(replay?.contact&&runProgress>.48&&p.id!==replay.tacklerId)p.field=blendPoint(p.field,{yard:replay.endYard,lateral:replay.targetLateral},(runProgress-.48)/.52*.35)
  }
  const returnerId=game.last?.returnerId
  const punt=game.last?.punt
  const puntReturner=punt?played.find(p=>p.id===returnerId):undefined
  const puntFlight=Math.max(0,Math.min(1,(runProgress-.18)/.48))
  const puntRun=Math.max(0,Math.min(1,(runProgress-.66)/.32))
  if(punt&&puntReturner){
    puntReturner.field=runProgress<.66?blendPoint(puntReturner.preSnap,{yard:punt.catchYard,lateral:0},puntFlight):{yard:punt.catchYard-punt.returnYards*puntRun,lateral:0}
    for(const gunner of played.filter(p=>p.team===matchup.offense[0].team&&p.formationRole.includes('Gunner'))){
      gunner.field=blendPoint(gunner.preSnap,{yard:punt.endYard,lateral:gunner.preSnap.lateral>0?2:-2},Math.max(0,Math.min(1,(runProgress-.2)/.78)))
    }
  }
  const returnSpot=game.last?.offense==='fieldGoal'?game.ballEnd:replay?.targetYard??game.ballStart
  const returner=game.last?.conversionReturn?played.find(p=>p.id===returnerId):undefined
  if(returner) returner.field=runProgress<.35?blendPoint(returner.preSnap,{yard:returnSpot,lateral:0},runProgress/.35):{yard:conversionReturnYard(game.ballStart,returnSpot,runProgress),lateral:0}
  const receivingId=replay?.receiverId
  const incomplete=game.last?.event==='incomplete'
  const intercepted=game.last?.event==='interception'
  const target=puntReturner??played.find(p=>p.id===replay?.carrierId)
  const tackler=replay?.contact?played.find(p=>p.id===replay.tacklerId):undefined
  const angle=tackler&&target?tackleAngle(tackler.field,target.field):'front'
  const players=played.map(p=>{
    if(flow==='HUDDLE'||flow==='PLAY_SELECTED')return {...p,field:game.possession==='home'&&p.team==='away'?p.preSnap:huddles.get(p.id)??p.field}
    if(flow==='BREAKING_HUDDLE'||flow==='LINING_UP')return {...p,field:game.possession==='home'&&p.team==='away'?p.preSnap:blendPoint(oldPositions.get(p.id)??huddles.get(p.id)??p.field,p.preSnap,lineupProgress)}
    if(flow==='READY_FOR_SNAP')return {...p,field:p.preSnap}
    if(flow==='RETURNING_TO_HUDDLE')return {...p,field:blendPoint(returningPositions.get(p.id)??p.preSnap,game.possession==='home'&&p.team==='away'?p.preSnap:huddles.get(p.id)??p.field,progress)}
    if(tackler&&target&&p.id===tackler.id&&p.id!==returnerId)return {...p,field:replayTacklerPosition(p.preSnap,replay!,runProgress)}
    return p
  })
  const thrower=players.find(p=>['QB','P','H'].includes(p.position)&&p.team===matchup.offense[0].team)
  const kick=game.last?.offense==='punt'||game.last?.offense==='fieldGoal'
  const passing=replay&&['completion','incomplete','interception'].includes(replay.event)
  const kickFlight=Math.max(0,Math.min(1,(runProgress-.16)/.76))
  const punterYard=thrower?.preSnap.yard??game.ballStart-12
  const center=players.find(p=>p.position==='C'&&p.team===matchup.offense[0].team)
  const interceptor=players.find(p=>p.id===replay?.interceptorId)
  const normalBall=playing&&replay&&!kick&&!game.last?.conversionReturn?normalBallPosition(replay,center?.preSnap??{yard:game.ballStart,lateral:0},thrower?.field??{yard:game.ballStart-2,lateral:0},target?.field??{yard:game.ballStart,lateral:0},interceptor?.field,runProgress):null
  const ballYard=playing&&punt?runProgress<.18?game.ballStart+(punterYard-game.ballStart)*runProgress/.18:runProgress<.66?punterYard+(punt.catchYard-punterYard)*puntFlight:punt.catchYard-punt.returnYards*puntRun:playing&&game.last?.conversionReturn?conversionReturnYard(game.ballStart,returnSpot,runProgress):playing&&kick?game.ballStart+(game.ballEnd-game.ballStart)*kickFlight:normalBall?.yard??game.yard
  const ballLateral=playing&&punt?runProgress<.66?0:puntReturner?.field.lateral??0:playing&&game.last?.conversionReturn?returner?.field.lateral??0:playing&&kick?(game.last?.text.toUpperCase().includes('MISS')?13*kickFlight:0):normalBall?.lateral??0
  const ballX=world(ballYard)
  const arc=normalBall?.flight??(punt?runProgress<.66?puntFlight:0:kickFlight)
  const ballY=fieldY(ballLateral)-3-(playing&&(passing||kick)&&(!game.last?.conversionReturn||runProgress<.35)?22*Math.sin(Math.PI*arc):0)+(incomplete&&ending?12*progress:0)
  const focus=playing?ballX:world(game.yard)
  const targetCamera=Math.max(0,Math.min(1000-viewWidth,focus-viewWidth/2))
  const [camera,setCamera]=useState(targetCamera)
  const cameraRef=useRef(camera)
  useEffect(()=>{let frame=0;const glide=()=>{const next=cameraRef.current+(targetCamera-cameraRef.current)*.18;cameraRef.current=Math.abs(next-targetCamera)<.15?targetCamera:next;setCamera(cameraRef.current);if(cameraRef.current!==targetCamera)frame=requestAnimationFrame(glide)};frame=requestAnimationFrame(glide);return()=>cancelAnimationFrame(frame)},[targetCamera])
  return <div className="fieldShell" ref={shellRef}>
    <svg viewBox={`0 0 ${viewWidth} 420`} role="img" aria-label={`American football field with ${players.length} individually positioned players`}>
      <SpriteAtlas/>
      <defs><pattern id="grain" width="13" height="11" patternUnits="userSpaceOnUse"><rect x="2" y="3" width="2" height="1" fill="#a7cd7e" opacity=".25"/><rect x="9" y="8" width="2" height="1" fill="#173e31" opacity=".22"/></pattern><pattern id="endHatch" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 12 12 0" stroke="#fff" strokeOpacity=".1" strokeWidth="3"/></pattern><clipPath id="clip"><rect x="0" y="0" width={viewWidth} height="420"/></clipPath></defs>
      <g clipPath="url(#clip)"><g transform={`translate(${-camera} 0)`}>
        <rect width="1000" height="420" fill="#153e32"/>{turfBands.map((band,i)=><rect key={band.yard} x={band.x} y="15" width={band.width} height="390" fill={i%2?'#34764f':'#3b8157'}/>)}<rect y="15" width="1000" height="390" fill="url(#grain)"/>
        <rect x="0" y="15" width={yardX(0)} height="390" fill={teamVisuals.home.endZone}/><rect x={yardX(100)} y="15" width={yardX(0)} height="390" fill={teamVisuals.away.endZone}/>
        <rect x="0" y="15" width={yardX(0)} height="390" fill="url(#endHatch)"/><rect x={yardX(100)} y="15" width={yardX(0)} height="390" fill="url(#endHatch)"/>
        <rect y="2" width="1000" height="13" fill="#273e39"/><rect y="405" width="1000" height="13" fill="#273e39"/>
        {Array.from({length:100},(_,i)=><g key={`crowd-${i}`}><rect x={i*11} y={i%4===0?1:5} width="6" height="6" fill={['#d4b481','#c67353','#71a1a2','#e6d9a1'][i%4]} opacity=".55"/><rect x={i*11+3} y="409" width="5" height="6" fill={['#a9c7ba','#d8b087','#a47c65'][i%3]} opacity=".4"/></g>)}
        {yardLines.map(({yard,x},i)=><g key={yard}><line x1={x} y1="23" x2={x} y2="397" stroke="#f4f5cf" strokeOpacity={i===0||i===20?1:.52} strokeWidth={i===0||i===20?3:1.5}/>{yard>0&&yard<100&&yard%10===0&&<><text x={x} textAnchor="middle" y="77" fill="#f4f5cf" opacity=".68" fontSize="24" fontFamily="monospace" fontWeight="900">{yard<=50?yard:100-yard}</text><text x={x} textAnchor="middle" y="364" fill="#f4f5cf" opacity=".68" fontSize="24" fontFamily="monospace" fontWeight="900">{yard<=50?yard:100-yard}</text></>}</g>)}
        {Array.from({length:99},(_,i)=>{const x=yardX(i+1);return <g key={`hash-${i}`} stroke="#edf1d8" strokeOpacity=".62" strokeWidth="1.4"><line x1={x} x2={x} y1="149" y2="158"/><line x1={x} x2={x} y1="262" y2="271"/></g>})}
        <path d="M0 23H1000M0 397H1000" stroke="#eef3db" strokeWidth="3"/>
        <text x={yardX(-2)} y="218" textAnchor="middle" transform={`rotate(-90 ${yardX(-2)} 218)`} className="endzone">FOUNDRY</text><text x={yardX(102)} y="218" textAnchor="middle" transform={`rotate(90 ${yardX(102)} 218)`} className="endzone">BREAKERS</text>
        {[yardX(-10),yardX(110)].map((x,i)=><g key={i} transform={`translate(${x} 210) scale(${i? -1:1} 1)`} strokeLinecap="square" fill="none"><path d="M0 0H34 M34 -38V38 M34 -38h10 M34 38h10" stroke="#553d29" strokeWidth="9"/><path d="M0 0H34 M34 -38V38 M34 -38h10 M34 38h10" stroke="#f4d784" strokeWidth="5"/><circle cx="34" cy="0" r="3" fill="#fff0aa"/></g>)}
        <line x1={world(game.yard)} y1="23" x2={world(game.yard)} y2="397" stroke="#76d7e7" strokeWidth="3" strokeDasharray="8 5" opacity=".95"/>
        <line x1={world(Math.min(100,game.yard+game.toGo))} y1="23" x2={world(Math.min(100,game.yard+game.toGo))} y2="397" stroke="#f7d76d" strokeWidth="3" opacity=".95"/>
        {players.map(p=><g key={p.id} transform={`translate(${world(p.field.yard)} ${fieldY(p.field.lateral)})`} className="fieldPlayer">
          <title>{`${p.name} #${p.jersey} · ${p.position}${playing||game.possession==='away'?` / ${p.formationRole} · ${p.assignment.kind}`:''}`}</title>
          <ellipse cx="1" cy="9" rx="9" ry="3" fill="#092a24" opacity=".48"/>
          <g transform={`translate(-8 -17) ${p.team==='away'?'translate(16 0) scale(-1 1)':''} ${p.id===tackler?.id&&ending?`rotate(${angle==='side'?-23:angle==='pursuit'?22:0} 8 17)`:''}`}><use href={`#player-${p.team}-${pose(p,flow,flow==='PLAY_RUNNING'?runProgress:progress,game.last,target?.id,tackler?.id??replay?.interceptorId,!!incomplete,returnerId)}`} width="16" height="18"/></g>
          {debug&&<text y="-19" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="900" paintOrder="stroke" stroke="#143124" strokeWidth="2">{p.position}</text>}
        </g>)}
        <g transform={`translate(${ballX} ${ballY})`}><ellipse rx="5" ry="3" fill="#713c24" stroke="#ffedd0" strokeWidth="1"/><path d="M-2-1 2 1" stroke="#fff4d3" strokeWidth=".7"/></g>
        {ending&&tackler&&target&&!intercepted&&<g transform={`translate(${world(target.field.yard)} ${fieldY(target.field.lateral)})`} opacity={1-progress*.7}><circle r={9+progress*13} fill="none" stroke="#f4e0a6" strokeWidth="2"/><path d="M-16 0h-5M16 0h5M0-16v-5" stroke="#f4e0a6" strokeWidth="2"/></g>}
        {ending&&intercepted&&tackler&&<g transform={`translate(${world(tackler.field.yard)} ${fieldY(tackler.field.lateral)})`} opacity={1-progress*.6}><circle r={8+progress*9} fill="none" stroke="#f4e0a6" strokeWidth="2"/></g>}
        {ending&&incomplete&&<g transform={`translate(${ballX} ${ballY})`} opacity={1-progress*.6}><path d="M-11 4l-6 6M11 4l6 6M0 6v8" stroke="#f4e0a6" strokeWidth="2"/></g>}
      </g></g>
    </svg>
    <div className="fieldOverlay"><span className="liveDot"/>{flow==='HUDDLE'?'IN THE HUDDLE':flow==='PLAY_SELECTED'||flow==='BREAKING_HUDDLE'?'BREAKING HUDDLE':flow==='LINING_UP'?'LINING UP':flow==='READY_FOR_SNAP'?'READY FOR SNAP':flow==='PLAY_RUNNING'?'PLAY IN MOTION':flow==='PLAY_ENDING'?'WHISTLE':flow==='SHOWING_RESULT'?'PLAY RESULT':'RETURNING TO HUDDLE'} · 11 V 11</div>
    {flow==='SHOWING_RESULT'&&<div className="fieldResult" role="status">{resultText}</div>}
    {debug&&<div className="debugOverlay"><b>FORMATION DEBUG · {matchup.formation.name} {matchup.personnel.code} / {matchup.look.name}</b><div className="debugRows">{players.map(p=><div key={p.id}><strong>{p.team==='home'?'ICF':'BAY'} #{p.jersey} {p.name}</strong><span>{p.id} · {p.position} → {p.formationRole} · {p.assignment.kind}{p.assignment.gap?` ${p.assignment.gap}`:''}{p.assignment.zone?` ${p.assignment.zone}`:''}{p.assignment.target?` → ${p.assignment.target}`:''}{p.assignment.route?` ${p.assignment.route}`:''} · {p.field.yard.toFixed(1)}, {p.field.lateral.toFixed(1)} · {p.eligible?'eligible':'ineligible'} · {p.state}</span></div>)}</div></div>}
  </div>
}
