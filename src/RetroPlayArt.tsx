import type { ActivePlayer, Matchup } from './football'
import { assignmentPath } from './assignmentPath'

const ink=['#ffdb78','#f5a874','#9fd6d8','#e9efb5','#d7b4d8']
const label=(p:ActivePlayer)=>{
  const a=p.assignment
  if(a.kind==='route')return `${p.formationRole}: ${a.route??'route'}`
  if(a.kind==='ballCarry')return `${p.formationRole}: carry through ${a.gap??'the called gap'}`
  if(a.kind==='leadBlock'||a.kind==='pullBlock')return `${p.formationRole}: ${a.kind==='leadBlock'?'lead':'pull'} through ${a.gap??'the lane'}`
  if(a.kind==='man')return `${p.formationRole}: man coverage`
  if(a.kind==='zone'||a.kind==='deepSafety')return `${p.formationRole}: ${a.zone??'zone'} coverage`
  if(a.kind==='blitz')return `${p.formationRole}: blitz ${a.gap??''}`
  if(a.kind==='runGap'||a.kind==='edgeContain')return `${p.formationRole}: fit ${a.gap??'the edge'}`
  if(a.kind==='playAction')return `${p.formationRole}: fake the handoff`
  if(a.kind==='handoff')return `${p.formationRole}: handoff`
  if(a.kind==='passing')return `${p.formationRole}: pass progression`
  return `${p.formationRole}: ${a.target??a.kind}`
}

export default function RetroPlayArt({matchup,side}:{matchup:Matchup;side:'offense'|'defense'}){
  const los=matchup.offense.find(p=>p.position==='C')?.preSnap.yard??matchup.offense[0].preSnap.yard
  const x=(yard:number)=>300+(yard-los)*10
  // Football linemen are shoulder to shoulder. Give their marks extra room
  // in this coaching diagram while preserving the side and order of each spot.
  const y=(lateral:number)=>280+Math.sign(lateral)*(Math.abs(lateral)<=6?Math.abs(lateral)*20:120+(Math.abs(lateral)-6)*4)
  const defending=side==='defense',players=defending?matchup.defense:matchup.offense
  const special=matchup.playId==='punt'||matchup.playId==='fieldGoal'
  const punt=matchup.playId==='punt'
  const c=matchup.offense.find(p=>p.position==='C')
  const qb=matchup.offense.find(p=>p.position==='QB')
  const back=matchup.offense.find(p=>p.assignment.kind==='ballCarry')
  const kicker=matchup.offense.find(p=>p.position=== (punt?'P':'K'))
  const holder=matchup.offense.find(p=>p.position==='H')
  const returner=matchup.defense.find(p=>p.position==='FS')
  const keyPlayers=players.filter(p=>defending?['man','zone','deepSafety','blitz','runGap','edgeContain'].includes(p.assignment.kind):['route','ballCarry','leadBlock','pullBlock','playAction','handoff'].includes(p.assignment.kind))
  const notes=special&&!defending?[punt?'Punter receives the snap and kicks downfield.':'Holder receives the snap; kicker approaches and kicks.',...(punt?['Gunners cover the kick; returner fields it and heads upfield.']:[])]:keyPlayers.map(label)
  return <div className="retroArt">
    <div className="retroArtTop"><span>COACH'S CHALKBOARD</span><span>{matchup.formation.name.toUpperCase()} / {defending?'DEFENSE':'OFFENSE'}</span></div>
    <svg viewBox="0 0 1000 560" role="img" aria-label={`${matchup.formation.name} ${defending?'defensive':'offensive'} assignments on a retro football field`}>
      <defs><pattern id="artTurf" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#27543f"/><rect x="3" y="5" width="2" height="2" fill="#417259" opacity=".5"/><rect x="12" y="11" width="2" height="2" fill="#122f29" opacity=".5"/></pattern><marker id="chalkArrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 8 4 0 8Z" fill="#ffdb78"/></marker><marker id="blueChalkArrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 8 4 0 8Z" fill="#9fd6d8"/></marker></defs>
      <rect width="1000" height="560" fill="url(#artTurf)"/>
      {[0,10,20,30,40,50,60].map(n=><g key={n}><path d={`M${x(los+n)} 25v510`} stroke="#d7e4cb" strokeWidth="2" opacity={n===0?.65:.24}/>{n>0&&<text x={x(los+n)} y="57" textAnchor="middle" className="retroArtYard">{n}</text>}</g>)}
      {[55,505].map(v=><path key={v} d={`M16 ${v}H984`} stroke="#d7e4cb" strokeWidth="2" opacity=".4"/>)}
      <path d={`M${x(los)} 25v510`} stroke="#83d0d7" strokeWidth="4" strokeDasharray="10 7"/><text x={x(los)-12} y="39" textAnchor="end" className="retroArtLos">LINE OF SCRIMMAGE</text>
      {defending?matchup.offense.filter(p=>p.position==='C'||p.eligible).map(p=><rect key={p.id} x={x(p.preSnap.yard)-6} y={y(p.preSnap.lateral)-6} width="12" height="12" fill="#a8b7a9" opacity=".55"/>):null}
      {players.map((p,i)=>{
        const a=p.assignment,k=a.kind,px=x(p.preSnap.yard),py=y(p.preSnap.lateral)
        if(defending){
          if(k==='man'){
            const mark=matchup.offense.find(q=>q.id===a.target)
            return mark?<path key={p.id} d={`M${px} ${py}L${x(mark.preSnap.yard+5)} ${y(mark.preSnap.lateral)}`} stroke="#9fd6d8" strokeWidth="3" strokeDasharray="8 6" fill="none" markerEnd="url(#blueChalkArrow)"/>:null
          }
          if(k==='zone'||k==='deepSafety')return <rect key={p.id} x={px-34} y={py-24} width="68" height="48" rx="5" fill="#9fd6d8" fillOpacity=".12" stroke="#9fd6d8" strokeWidth="2" strokeDasharray="7 5"/>
          if(['blitz','runGap','edgeContain','passRush'].includes(k))return <path key={p.id} d={`M${px} ${py}L${px-45} ${py+(a.gap?.endsWith('left')?-12:12)}`} stroke="#ffdb78" strokeWidth="3" fill="none" markerEnd="url(#chalkArrow)"/>
          return null
        }
        if(k==='route'||k==='ballCarry'||k==='leadBlock'||k==='pullBlock'){
          const color=k==='route'?ink[i%ink.length]:k==='ballCarry'?'#ffdb78':'#d7e4cb'
          const points=assignmentPath(p).map(d=>`${x(p.preSnap.yard+d.forward)},${y(p.preSnap.lateral+d.lateral)}`).join(' ')
          return <polyline key={p.id} points={points} fill="none" stroke={color} strokeWidth={k==='route'||k==='ballCarry'?4:3} strokeDasharray={k==='leadBlock'||k==='pullBlock'?'7 5':undefined} strokeLinejoin="bevel" markerEnd="url(#chalkArrow)"/>
        }
        if(k==='passBlock'||k==='runBlock'||k==='protection')return <path key={p.id} d={`M${px+13} ${py-10}v20`} stroke="#d7e4cb" strokeWidth="4"/>
        return null
      })}
      {!defending&&back&&qb&&<path d={`M${x(qb.preSnap.yard)} ${y(qb.preSnap.lateral)}L${x(back.preSnap.yard+1)} ${y(back.preSnap.lateral)}`} stroke="#ffdb78" strokeWidth="3" strokeDasharray="6 5" markerEnd="url(#chalkArrow)"/>}
      {!defending&&special&&kicker&&<><path d={`M${x(c?.preSnap.yard??los)} ${y(0)}L${x(punt?kicker.preSnap.yard:holder?.preSnap.yard??kicker.preSnap.yard)} ${y(punt?0:holder?.preSnap.lateral??0)}`} stroke="#ffdb78" strokeWidth="3" strokeDasharray="6 5"/><path d={`M${x(punt?kicker.preSnap.yard:holder?.preSnap.yard??kicker.preSnap.yard)} ${y(punt?0:holder?.preSnap.lateral??0)}L${x(los+(punt?45:55))} ${y(0)}`} stroke="#ffdb78" strokeWidth="4" strokeDasharray="11 7" markerEnd="url(#chalkArrow)"/><text x={x(los+23)} y={y(0)-15} className="retroArtKick">{punt?'PUNT FLIGHT':'KICK FLIGHT'}</text>{punt&&returner&&<><circle cx={x(los+45)} cy={y(0)} r="11" fill="#86d3d7" stroke="#ebf5de" strokeWidth="3"/><text x={x(los+45)} y={y(0)+4} textAnchor="middle" className="retroArtPlayerText">R</text><path d={`M${x(los+45)} ${y(0)}L${x(los+33)} ${y(0)}`} stroke="#9fd6d8" strokeWidth="4" markerEnd="url(#blueChalkArrow)"/><text x={x(los+34)} y={y(0)+28} className="retroArtKick">RETURN</text></>}</>}
      {players.map(p=><g key={p.id} transform={`translate(${x(p.preSnap.yard)} ${y(p.preSnap.lateral)})`}><rect x="-13" y="-13" width="26" height="26" fill={defending?'#78c5ce':'#b75c3e'} stroke="#f7e5af" strokeWidth="3"/><text textAnchor="middle" y="4" className="retroArtPlayerText">{p.position}</text><title>{label(p)}</title></g>)}
      <text x="25" y="540" className="retroArtFooter">{defending?'BLUE = COVERAGE   GOLD = PRESSURE':'SOLID = ROUTE / CARRY   DASHED = BLOCK / EXCHANGE'}</text>
    </svg>
    <div className="retroArtAssignments"><b>{defending?'DEFENSIVE RESPONSIBILITIES':'PLAY ASSIGNMENTS'}</b><div>{notes.map((note,i)=><span key={`${i}-${note}`}><em>{String(i+1).padStart(2,'0')}</em>{note}</span>)}</div></div>
  </div>
}
