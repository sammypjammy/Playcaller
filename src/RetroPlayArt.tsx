import type { ActivePlayer, Matchup } from './football'
import { assignmentPath } from './assignmentPath'

const ink=['#ffdb78','#f5a874','#9fd6d8','#e9efb5','#d7b4d8']
const label=(p:ActivePlayer)=>{
  const a=p.assignment
  if(a.kind==='route')return `Run ${a.route??'route'}`
  if(a.kind==='ballCarry')return `Carry through ${a.gap??'called gap'}`
  if(a.kind==='leadBlock'||a.kind==='pullBlock')return `${a.kind==='leadBlock'?'Lead':'Pull'} through ${a.gap??'the lane'}`
  if(a.kind==='runBlock')return a.target==='outside-zone'||a.target==='toss'?'Seal the outside edge':p.position==='WR'||p.position==='TE'?'Block downfield':`Block toward ${a.gap??'the run lane'}`
  if(a.kind==='passBlock')return a.target==='protect kick lane'?'Protect kick lane':'Protect the passer'
  if(a.kind==='protection')return `Pick up ${a.target??'a rusher'}`
  if(a.kind==='man')return 'Cover assigned receiver'
  if(a.kind==='zone'||a.kind==='deepSafety')return `Cover ${a.zone??'assigned zone'}`
  if(a.kind==='blitz')return `Rush through ${a.gap??'called gap'}`
  if(a.kind==='runGap'||a.kind==='edgeContain')return `Fit ${a.gap??'the edge'} run gap`
  if(a.kind==='playAction')return 'Fake the handoff'
  if(a.kind==='handoff')return 'Hand off to the back'
  if(a.kind==='passing')return p.position==='P'?'Catch snap and punt':p.position==='H'?'Hold for the kicker':p.position==='K'?'Kick field goal':'Read the routes and throw'
  if(a.kind==='runSupport')return a.target==='return catch'?'Field the punt and return':a.target==='coverage lane'?'Cover the kick':'Pursue the ball'
  return a.target??a.kind
}

export default function RetroPlayArt({matchup,side}:{matchup:Matchup;side:'offense'|'defense'}){
  const los=matchup.offense.find(p=>p.position==='C')?.preSnap.yard??matchup.offense[0].preSnap.yard
  const special=matchup.playId==='punt'||matchup.playId==='fieldGoal'
  const scale=special?12:22
  const x=(yard:number)=>(special?280:330)+(yard-los)*scale
  // Football linemen are shoulder to shoulder. Give their marks extra room
  // in this coaching diagram while preserving the side and order of each spot.
  const y=(lateral:number)=>280+Math.sign(lateral)*(Math.abs(lateral)<=6?Math.abs(lateral)*20:120+(Math.abs(lateral)-6)*4)
  const defending=side==='defense',players=defending?matchup.defense:matchup.offense
  const punt=matchup.playId==='punt'
  const c=matchup.offense.find(p=>p.position==='C')
  const qb=matchup.offense.find(p=>p.position==='QB')
  const back=matchup.offense.find(p=>p.assignment.kind==='ballCarry')
  const kicker=matchup.offense.find(p=>p.position=== (punt?'P':'K'))
  const holder=matchup.offense.find(p=>p.position==='H')
  const returner=matchup.defense.find(p=>p.position==='FS')
  const yardMarks=Array.from({length:101},(_,n)=>n).filter(n=>x(n)>=25&&x(n)<=975)
  return <div className="retroArt">
    <div className="retroArtTop"><span>COACH'S CHALKBOARD</span><span>{matchup.formation.name.toUpperCase()} / {defending?'DEFENSE':'OFFENSE'}</span></div>
    <div className="retroArtLegend"><span><i className="artSolid"/> Route / carry</span><span><i className="artDashed"/> Block / exchange</span><span><i className="artBlue"/> Coverage / return</span></div>
    <div className="retroArtBody"><svg viewBox="0 0 1000 560" role="img" aria-label={`${matchup.formation.name} ${defending?'defensive':'offensive'} assignments on a retro football field`}>
      <defs><pattern id="artTurf" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#27543f"/><rect x="3" y="5" width="2" height="2" fill="#417259" opacity=".5"/><rect x="12" y="11" width="2" height="2" fill="#122f29" opacity=".5"/></pattern><marker id="chalkArrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 8 4 0 8Z" fill="#ffdb78"/></marker><marker id="blueChalkArrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 8 4 0 8Z" fill="#9fd6d8"/></marker></defs>
      <rect width="1000" height="560" fill="#2d6d49"/>
      {yardMarks.filter(n=>n%5===0).map((n,i)=><rect key={`band-${n}`} x={x(n)} y="16" width={5*scale} height="528" fill={i%2?'#397d51':'#34764e'} opacity=".8"/>)}
      <rect width="1000" height="560" fill="url(#artTurf)" opacity=".22"/>
      {yardMarks.filter(n=>n%5===0).map(n=><g key={`line-${n}`}><path d={`M${x(n)} 18v524`} stroke="#eff3da" strokeWidth={n%10===0?3:2} opacity=".65"/>{n%10===0&&n>0&&n<100&&<><text x={x(n)} y="105" textAnchor="middle" className="retroArtYard">{n<=50?n:100-n}</text><text x={x(n)} y="474" textAnchor="middle" className="retroArtYard">{n<=50?n:100-n}</text></>}</g>)}
      {yardMarks.filter(n=>n%5!==0).map(n=><g key={`hash-${n}`} stroke="#eff3da" strokeWidth="2" opacity=".62"><path d={`M${x(n)} 175v13M${x(n)} 372v13`}/></g>)}
      <path d="M0 18H1000M0 542H1000" stroke="#f7f4db" strokeWidth="4"/>
      <path d={`M${x(los)} 18v524`} stroke="#83d0d7" strokeWidth="4" strokeDasharray="10 7"/><text x={x(los)-12} y="39" textAnchor="end" className="retroArtLos">LINE OF SCRIMMAGE</text>
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
        if(special&&punt&&p.formationRole.includes('Gunner'))return <path key={p.id} d={`M${px} ${py}L${x(los+38)} ${y(p.preSnap.lateral/3)}`} stroke="#d7e4cb" strokeWidth="3" strokeDasharray="7 5" fill="none" markerEnd="url(#chalkArrow)"/>
        if(k==='route'||k==='ballCarry'||k==='leadBlock'||k==='pullBlock'){
          const color=k==='route'?ink[i%ink.length]:k==='ballCarry'?'#ffdb78':'#d7e4cb'
          const path=assignmentPath(p)
          const lane=path[path.length-1].lateral+p.preSnap.lateral
          const designedRun=k==='ballCarry'&&['outside-zone','toss','counter'].includes(a.target??'')
          const points=(k==='ballCarry'||k==='leadBlock')&&!designedRun?`${x(p.preSnap.yard)},${y(p.preSnap.lateral)} ${x(los-2)},${y((p.preSnap.lateral+lane)/2)} ${x(los+(k==='ballCarry'?8:5))},${y(lane)}`:path.map(d=>`${x(p.preSnap.yard+d.forward)},${y(p.preSnap.lateral+d.lateral)}`).join(' ')
          return <polyline key={p.id} points={points} fill="none" stroke={color} strokeWidth={k==='route'||k==='ballCarry'?4:3} strokeDasharray={k==='leadBlock'||k==='pullBlock'?'7 5':undefined} strokeLinejoin="bevel" markerEnd="url(#chalkArrow)"/>
        }
        if(k==='passBlock'||k==='runBlock'||k==='protection')return <path key={p.id} d={`M${px+13} ${py-10}v20`} stroke="#d7e4cb" strokeWidth="4"/>
        return null
      })}
      {!defending&&back&&qb&&<path d={`M${x(qb.preSnap.yard)} ${y(qb.preSnap.lateral)}L${x(back.preSnap.yard+1)} ${y(back.preSnap.lateral)}`} stroke="#ffdb78" strokeWidth="3" strokeDasharray="6 5" markerEnd="url(#chalkArrow)"/>}
      {!defending&&special&&kicker&&<><path d={`M${x(c?.preSnap.yard??los)} ${y(0)}L${x(punt?kicker.preSnap.yard:holder?.preSnap.yard??kicker.preSnap.yard)} ${y(punt?0:holder?.preSnap.lateral??0)}`} stroke="#ffdb78" strokeWidth="3" strokeDasharray="6 5"/><path d={`M${x(punt?kicker.preSnap.yard:holder?.preSnap.yard??kicker.preSnap.yard)} ${y(punt?0:holder?.preSnap.lateral??0)}L${x(los+(punt?45:55))} ${y(0)}`} stroke="#ffdb78" strokeWidth="4" strokeDasharray="11 7" markerEnd="url(#chalkArrow)"/><text x={x(los+23)} y={y(0)-15} className="retroArtKick">{punt?'PUNT FLIGHT':'KICK FLIGHT'}</text>{punt&&returner&&<><circle cx={x(los+45)} cy={y(0)} r="11" fill="#86d3d7" stroke="#ebf5de" strokeWidth="3"/><text x={x(los+45)} y={y(0)+4} textAnchor="middle" className="retroArtPlayerText">R</text><path d={`M${x(los+45)} ${y(0)}L${x(los+33)} ${y(0)}`} stroke="#9fd6d8" strokeWidth="4" markerEnd="url(#blueChalkArrow)"/><text x={x(los+34)} y={y(0)+28} className="retroArtKick">RETURN</text></>}</>}
      {players.map((p,i)=><g key={p.id} transform={`translate(${x(p.preSnap.yard)} ${y(p.preSnap.lateral)})`}><rect x="-15" y="-15" width="30" height="30" fill={defending?'#78c5ce':'#b75c3e'} stroke="#f7e5af" strokeWidth="3"/><text textAnchor="middle" y="0" className="retroArtPlayerText">{p.position}</text><text x="9" y="11" textAnchor="middle" className="retroArtNumber">{i+1}</text><title>{p.formationRole}: {label(p)}</title></g>)}
    </svg><aside className="retroArtAssignments"><b>{defending?'DEFENSIVE JOBS':'PLAYER JOBS'}</b><div>{players.map((p,i)=><span key={p.id}><em>{i+1}</em><strong>{p.position}</strong><small><b>{p.formationRole}</b> · {label(p)}</small></span>)}</div></aside></div>
  </div>
}
