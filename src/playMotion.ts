import type { ActivePlayer, Coordinate } from './football'
import type { ReplayPlan } from './replay'
import { assignmentPath, pointOnPath } from './assignmentPath'
import { offenseById } from './playbook'
import { clamp } from './strategy'

const blend=(a:Coordinate,b:Coordinate,t:number):Coordinate=>({yard:a.yard+(b.yard-a.yard)*clamp(t,0,1),lateral:a.lateral+(b.lateral-a.lateral)*clamp(t,0,1)})
const segmentLength=(a:Coordinate,b:Coordinate)=>Math.hypot(b.yard-a.yard,b.lateral-a.lateral)
function along(points:Coordinate[],progress:number):Coordinate{
  const lengths=points.slice(1).map((point,i)=>segmentLength(points[i],point))
  const total=lengths.reduce((sum,length)=>sum+length,0)
  let remaining=total*clamp(progress,0,1)
  for(let i=0;i<lengths.length;i++){
    if(remaining<=lengths[i]||i===lengths.length-1)return blend(points[i],points[i+1],lengths[i]?remaining/lengths[i]:1)
    remaining-=lengths[i]
  }
  return points.at(-1)??{yard:0,lateral:0}
}
function routePoints(receiver:ActivePlayer,from:number,to:number):Coordinate[]{
  const path=assignmentPath(receiver)
  const absolute=(fraction:number)=>{const p=pointOnPath(path,fraction);return {yard:receiver.preSnap.yard+p.forward,lateral:receiver.preSnap.lateral+p.lateral}}
  const points=[absolute(from)]
  for(let i=1;i<path.length-1;i++){const fraction=i/(path.length-1);if(fraction>from&&fraction<to)points.push(absolute(fraction))}
  points.push(absolute(to))
  return points
}

// Equal speed ratings allow equal travel after the catch.
export function pursuitPosition(start:Coordinate,target:Coordinate,carrierTravel:number,defenderSpeed:number,carrierSpeed:number):Coordinate{
  const gap=Math.hypot(target.yard-start.yard,target.lateral-start.lateral)
  if(gap===0)return start
  return blend(start,target,Math.min(1,carrierTravel*(defenderSpeed/Math.max(1,carrierSpeed))/gap))
}

export function quarterbackPosition(qb:ActivePlayer,plan:ReplayPlan|undefined,playId:string,progress:number):Coordinate{
  const t=clamp(progress,0,1),start=qb.preSnap
  if(!plan)return start
  const pass=['completion','incomplete','interception','sack'].includes(plan.event)
  if(!pass)return t<.24?blend(start,{yard:start.yard-.7,lateral:0},t/.24):{yard:start.yard-.7,lateral:0}
  const playAction=qb.assignment.kind==='playAction'
  const boot=offenseById(playId)?.concept==='bootleg'
  const drop={yard:start.yard-(start.yard<plan.startYard-4?1.4:3.8),lateral:boot?4:0}
  const throwAt=plan.event==='completion'?plan.throwAt??.38:.38
  const fakeEnd=throwAt*.35
  if(playAction&&t<fakeEnd)return blend(start,{yard:start.yard+.7,lateral:start.lateral},t/fakeEnd)
  const from=playAction?{yard:start.yard+.7,lateral:start.lateral}:start
  const dropStart=playAction?fakeEnd:Math.min(.08,throwAt*.15)
  const at=t<dropStart?start:blend(from,drop,(t-dropStart)/(throwAt-dropStart))
  return plan.event==='sack'&&t>.45?blend(at,{yard:plan.endYard,lateral:drop.lateral},(t-.45)/.48):at
}

export function runnerPath(runner:ActivePlayer,qb:Coordinate,plan:Pick<ReplayPlan,'startYard'|'endYard'|'targetLateral'>,playId:string):Coordinate[]{
  const start=runner.preSnap,los=plan.startYard
  const gap=runner.assignment.gap??'A-right',side=gap.endsWith('left')?-1:1
  const concept=offenseById(playId)?.concept??'inside-zone'
  const outside=concept==='outside-zone'||concept==='toss'||gap.startsWith('D')
  const counter=concept==='counter'
  const handoff={yard:qb.yard-.5,lateral:outside?side*2:qb.lateral}
  const edge={yard:Math.min(los-.5,plan.endYard),lateral:side*9}
  const inside={yard:Math.min(los+1,plan.endYard),lateral:plan.targetLateral}
  const finish={yard:plan.endYard,lateral:plan.targetLateral}
  return counter?[start,handoff,{yard:los-2,lateral:-side*2},inside,finish]:[start,handoff,outside?edge:inside,finish]
}

export function runnerPosition(runner:ActivePlayer,qb:Coordinate,plan:ReplayPlan,playId:string,progress:number):Coordinate{
  return along(runnerPath(runner,qb,plan,playId),progress)
}

export function routePosition(receiver:ActivePlayer,plan:ReplayPlan|undefined,progress:number):Coordinate{
  const t=clamp(progress,0,1),path=assignmentPath(receiver)
  if(plan?.receiverId===receiver.id&&plan.event==='completion'){
    const catchAt=plan.catchAt??.65,routeProgress=plan.routeProgress??1
    const before=routePoints(receiver,0,routeProgress)
    if(t<=catchAt)return along(before,clamp((t-.02)/(catchAt-.02),0,1))
    const after=routePoints(receiver,routeProgress,plan.routeExitProgress??routeProgress)
    after.push({yard:plan.endYard,lateral:plan.targetLateral})
    return along(after,(t-catchAt)/(1-catchAt))
  }
  const point=pointOnPath(path,clamp((t-.08)/.78,0,1))
  return {yard:receiver.preSnap.yard+point.forward,lateral:receiver.preSnap.lateral+point.lateral}
}

export function snapBallPosition(center:Coordinate,qb:Coordinate,t:number):Coordinate{return blend(center,qb,t/.1)}

export function normalBallPosition(plan:ReplayPlan,center:Coordinate,qb:Coordinate,carrier:Coordinate,interceptor:Coordinate|undefined,progress:number){
  const t=clamp(progress,0,1)
  const snapAt=plan.event==='completion'&&plan.durationMs?Math.min(.1,100/plan.durationMs):.1
  if(t<snapAt)return {...blend(center,qb,t/snapAt),flight:0}
  if(['completion','incomplete','interception'].includes(plan.event)){
    const throwAt=plan.event==='completion'?plan.throwAt??.38:.38
    const catchAt=plan.event==='completion'?plan.catchAt??.65:.65
    if(t<throwAt)return {...qb,flight:0}
    const landing={yard:plan.targetYard,lateral:plan.catchLateral??plan.targetLateral}
    if(t<catchAt){const flight=clamp((t-throwAt)/(catchAt-throwAt),0,1);return {...blend(qb,landing,flight),flight}}
    if(plan.event==='completion')return {...carrier,flight:0}
    if(plan.event==='interception')return {...(interceptor??landing),flight:0}
    return {...landing,flight:0}
  }
  if(plan.event==='sack')return {...qb,flight:0}
  if(t<.25)return {...blend(qb,carrier,(t-.1)/.15),flight:0}
  return {...carrier,flight:0}
}
