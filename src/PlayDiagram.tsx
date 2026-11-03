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

export function MiniPlayDiagram({matchup}:{matchup:Matchup}){
  const los=matchup.offense.find(p=>p.position==='C')?.field.yard??matchup.offense[0].field.yard
  const x=(yard:number)=>38+(yard-los)*1.4
  const y=(lateral:number)=>30+lateral*.78
  return <svg className="miniDiagram" viewBox="0 0 76 60" role="img" aria-label={`${matchup.formation.name} offensive alignment and assignments`}>
    <rect width="76" height="60" fill="#28533e"/><path d="M38 0V60" stroke="#8ccbd5" strokeDasharray="2 2"/>
    <Arrow/>{paths(matchup,x,y)}
    {matchup.offense.map(p=><rect key={p.id} x={x(p.field.yard)-1.5} y={y(p.field.lateral)-1.5} width="3" height="3" fill={teamVisuals[p.team].primary} stroke={teamVisuals[p.team].secondary} strokeWidth=".5"/>)}
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
