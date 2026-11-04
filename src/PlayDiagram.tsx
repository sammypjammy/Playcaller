import type { Matchup } from './football'
import { teamVisuals } from './visuals'
import { assignmentPath } from './assignmentPath'

function paths(matchup:Matchup,x:(yard:number)=>number,y:(lateral:number)=>number){
  return matchup.offense.filter(p=>['route','ballCarry','leadBlock','pullBlock','runBlock'].includes(p.assignment.kind)).map(p=>{
    const points=assignmentPath(p).map(delta=>`${x(p.field.yard+delta.forward)},${y(p.field.lateral+delta.lateral)}`).join(' ')
    return <polyline key={p.id} points={points} fill="none" stroke="#f8d276" strokeWidth="1.5" strokeDasharray={p.assignment.kind==='route'?'':'3 2'} markerEnd="url(#assignmentArrow)"/>
  })
}

function Arrow(){return <defs><marker id="assignmentArrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 6 3 0 6Z" fill="#f8d276"/></marker></defs>}

export function MiniPlayDiagram({matchup,side='offense'}:{matchup:Matchup;side?:'offense'|'defense'}){
  const los=matchup.offense.find(p=>p.position==='C')?.field.yard??matchup.offense[0].field.yard
  const x=(yard:number)=>38+(yard-los)*1.4
  const y=(lateral:number)=>30+lateral*.78
  const defending=side==='defense'
  const players=defending?matchup.defense:matchup.offense
  return <svg className="miniDiagram" viewBox="0 0 76 60" role="img" aria-label={defending?`${matchup.look.name} defensive alignment and assignments`:`${matchup.formation.name} offensive alignment and assignments`}>
    <rect width="76" height="60" fill="#28533e"/><path d="M38 0V60" stroke="#8ccbd5" strokeDasharray="2 2"/>
    {defending?<>{matchup.offense.map(p=><rect key={p.id} x={x(p.field.yard)-1} y={y(p.field.lateral)-1} width="2" height="2" fill="#b7c7a8" opacity=".45"/>)}{players.map(p=>{const kind=p.assignment.kind;const rush=['blitz','passRush','runGap','edgeContain'].includes(kind);const cover=['zone','deepSafety','man'].includes(kind);if(!rush&&!cover)return null;const dx=rush?-7:kind==='deepSafety'?7:4;const dy=kind==='man'?0:Math.sign(p.field.lateral)*1.5;return <path key={`${p.id}-path`} d={`M${x(p.field.yard)} ${y(p.field.lateral)}l${dx} ${dy}`} stroke={rush?'#f8d276':'#8cd6e4'} strokeWidth="1.2" fill="none"/>})}</>:<><Arrow/>{paths(matchup,x,y)}</>}
    {players.map(p=><rect key={p.id} x={x(p.field.yard)-1.5} y={y(p.field.lateral)-1.5} width="3" height="3" fill={teamVisuals[p.team].primary} stroke={teamVisuals[p.team].secondary} strokeWidth=".5"/>)}
  </svg>
}

export default function PlayDiagram({matchup}:{matchup:Matchup}){
  const los=matchup.offense.find(p=>p.position==='C')?.field.yard??matchup.offense[0].field.yard
  const x=(yard:number)=>118+(yard-los)*2.6
  const y=(lateral:number)=>62+lateral*1.65
  return <div className="diagram"><div className="diagramLabel"><b>PLAY PREVIEW</b><span>{matchup.formation.name} / OFFENSIVE ASSIGNMENTS</span></div>
    <svg viewBox="0 0 236 124" role="img" aria-label={`Play diagram showing ${matchup.offense.length} offensive positions`}>
      <rect width="236" height="124" fill="#244f3e"/><path d="M0 16H236M0 108H236" stroke="#bad0a6" strokeWidth="1" opacity=".6"/>
      <path d="M118 0V124" stroke="#75c8da" strokeDasharray="4 3" strokeWidth="2"/>
      <Arrow/>{paths(matchup,x,y)}
      {matchup.offense.map(p=><g key={p.id}><rect x={x(p.field.yard)-3} y={y(p.field.lateral)-3} width="6" height="6" fill={teamVisuals[p.team].primary} stroke={teamVisuals[p.team].secondary} strokeWidth="1"/><title>{p.position} · {p.assignment.kind}</title></g>)}
    </svg>
    <div className="diagramLegend"><span><i className="dotHome"/>FOUNDRY</span><span><i className="dotAway"/>BREAKERS</span><span className="routeLegend">→ ASSIGNMENT</span></div>
  </div>
}

export function DetailedPlayDiagram({matchup,side='offense'}:{matchup:Matchup;side?:'offense'|'defense'}){
  const los=matchup.offense.find(p=>p.position==='C')?.preSnap.yard??matchup.offense[0].preSnap.yard
  const x=(yard:number)=>255+(yard-los)*8
  const y=(lateral:number)=>210+lateral*6.1
  const isDefense=side==='defense'
  const unit=isDefense?matchup.defense:matchup.offense
  const other=isDefense?matchup.offense:matchup.defense
  const special=matchup.playId==='punt'||matchup.playId==='fieldGoal'
  const carrier=matchup.offense.find(p=>p.assignment.kind==='ballCarry')
  const passer=matchup.offense.find(p=>p.position==='QB')
  const kicker=matchup.offense.find(p=>p.position==='K'||p.position==='P')
  const holder=matchup.offense.find(p=>p.position==='H')
  const returner=matchup.defense.find(p=>p.position==='FS')
  const isPunt=matchup.playId==='punt'
  const route=(p:typeof unit[number])=>assignmentPath(p).map(d=>`${x(p.preSnap.yard+d.forward)},${y(p.preSnap.lateral+d.lateral)}`).join(' ')
  const planned=unit.flatMap(p=>{
    const a=p.assignment,k=a.kind
    if(isDefense){
      if(k==='man'){
        const receiver=matchup.offense.find(q=>q.id===a.target)
        return receiver?[<line key={p.id} x1={x(p.preSnap.yard)} y1={y(p.preSnap.lateral)} x2={x(receiver.preSnap.yard+5)} y2={y(receiver.preSnap.lateral)} stroke="#8fe4e1" strokeWidth="2.5" strokeDasharray="6 4" markerEnd="url(#artBlueArrow)"/>]:[]
      }
      if(k==='zone'||k==='deepSafety')return [<g key={p.id}><ellipse cx={x(p.preSnap.yard+(k==='deepSafety'?4:1))} cy={y(p.preSnap.lateral)} rx={k==='deepSafety'?44:32} ry={k==='deepSafety'?25:21} fill="#8fe4e1" fillOpacity=".13" stroke="#8fe4e1" strokeOpacity=".72" strokeDasharray="5 4"/><text x={x(p.preSnap.yard+(k==='deepSafety'?4:1))} y={y(p.preSnap.lateral)-27} textAnchor="middle" fill="#b8f1ec" fontSize="10" fontWeight="800">{a.zone?.toUpperCase()??'ZONE'}</text></g>]
      if(['blitz','passRush','runGap','edgeContain'].includes(k))return [<line key={p.id} x1={x(p.preSnap.yard)} y1={y(p.preSnap.lateral)} x2={x(p.preSnap.yard-5)} y2={y(p.preSnap.lateral+(a.gap?.endsWith('left')?-1:1)*2)} stroke="#f3d387" strokeWidth="3" markerEnd="url(#artGoldArrow)"/>]
      return []
    }
    if(['route','ballCarry','leadBlock','pullBlock','runBlock'].includes(k))return [<polyline key={p.id} points={route(p)} fill="none" stroke={k==='route'?'#ffe49c':k==='ballCarry'?'#ffbd75':'#b9d8c9'} strokeWidth={k==='route'||k==='ballCarry'?3.5:2} strokeDasharray={k==='route'||k==='ballCarry'?undefined:'6 4'} markerEnd="url(#artGoldArrow)"/>]
    if(['passBlock','protection'].includes(k))return [<path key={p.id} d={`M${x(p.preSnap.yard)+8} ${y(p.preSnap.lateral)-9}v18`} stroke="#b9d8c9" strokeWidth="3" strokeLinecap="round"/>]
    return []
  })
  return <div className="detailedPlayDiagram"><svg viewBox="0 0 760 420" role="img" aria-label={`${matchup.formation.name} ${isDefense?'defensive':'offensive'} play art with player positions and assignments`}>
    <defs><marker id="artGoldArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 10 5 0 10Z" fill="#ffe49c"/></marker><marker id="artBlueArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 10 5 0 10Z" fill="#8fe4e1"/></marker></defs>
    <rect width="760" height="420" fill="#24533f"/>{[0,5,10,15,20,25,30,35,40,45,50].map(n=><g key={n}><path d={`M${x(los+n)} 12v396`} stroke="#d7e7c4" strokeOpacity={n%10===0?.34:.18} strokeWidth={n%10===0?2:1}/>{n>0&&n%10===0&&<text x={x(los+n)} y="34" textAnchor="middle" fill="#d7e7c4" fillOpacity=".55" fontSize="13" fontWeight="900">{n}</text>}</g>)}
    <path d={`M${x(los)} 12v396`} stroke="#8fe4e1" strokeWidth="3" strokeDasharray="8 6"/><text x={x(los)-7} y="25" textAnchor="end" fill="#b8f1ec" fontSize="12" fontWeight="900">LINE OF SCRIMMAGE</text>
    {other.map(p=><circle key={p.id} cx={x(p.preSnap.yard)} cy={y(p.preSnap.lateral)} r="6" fill="#b4c4b8" fillOpacity=".45"/>)}
    {planned}
    {!isDefense&&carrier&&passer&&<path d={`M${x(passer.preSnap.yard)} ${y(passer.preSnap.lateral)}L${x(carrier.preSnap.yard+2)} ${y(carrier.preSnap.lateral)}`} stroke="#ffbd75" strokeWidth="2.5" strokeDasharray="4 4" markerEnd="url(#artGoldArrow)"/>}
    {!isDefense&&special&&kicker&&<><path d={`M${x(isPunt?kicker.preSnap.yard:holder?.preSnap.yard??kicker.preSnap.yard)} ${y(isPunt?kicker.preSnap.lateral:holder?.preSnap.lateral??0)}L${x(los+(isPunt?45:48))} ${y(0)}`} stroke="#ffbd75" strokeWidth="3.5" strokeDasharray="9 5" markerEnd="url(#artGoldArrow)"/><text x={x(los+24)} y={y(0)-14} fill="#ffe49c" fontSize="13" fontWeight="900">{isPunt?'PUNT / RETURN':'FIELD GOAL ATTEMPT'}</text>{isPunt&&returner&&<path d={`M${x(los+45)} ${y(0)}L${x(los+33)} ${y(0)}`} stroke="#8fe4e1" strokeWidth="3" markerEnd="url(#artBlueArrow)"/>}</>}
    {unit.map(p=><g key={p.id} transform={`translate(${x(p.preSnap.yard)} ${y(p.preSnap.lateral)})`}><circle r="11" fill={teamVisuals[p.team].primary} stroke={teamVisuals[p.team].secondary} strokeWidth="2.5"/><text textAnchor="middle" y="4" fill="#fff" fontSize="9" fontWeight="900">{p.position}</text><title>{p.formationRole}: {p.assignment.kind}{p.assignment.route?` · ${p.assignment.route}`:''}{p.assignment.gap?` · ${p.assignment.gap}`:''}{p.assignment.zone?` · ${p.assignment.zone}`:''}</title></g>)}
    <text x="22" y="401" fill="#d9eac9" fontSize="12" fontWeight="800">{isDefense?'GOLD = RUSH / BLUE = COVERAGE':'GOLD = ROUTE OR BALL / DASHED = BLOCK OR HANDOFF'}</text>
  </svg></div>
}
