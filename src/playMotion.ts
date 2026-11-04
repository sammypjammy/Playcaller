import type { ActivePlayer, Coordinate } from './football'
import type { ReplayPlan } from './replay'
import { assignmentPath, pointOnPath } from './assignmentPath'
import { offenseById } from './playbook'
import { clamp } from './strategy'

const blend=(a:Coordinate,b:Coordinate,t:number):Coordinate=>({yard:a.yard+(b.yard-a.yard)*clamp(t,0,1),lateral:a.lateral+(b.lateral-a.lateral)*clamp(t,0,1)})

export function quarterbackPosition(qb:ActivePlayer,plan:ReplayPlan|undefined,playId:string,progress:number):Coordinate{
  const t=clamp(progress,0,1),start=qb.preSnap
  if(!plan)return start
  const pass=['completion','incomplete','interception','sack'].includes(plan.event)
  if(!pass)return t<.24?blend(start,{yard:start.yard-.7,lateral:0},t/.24):{yard:start.yard-.7,lateral:0}
  const playAction=qb.assignment.kind==='playAction'
  const boot=offenseById(playId)?.concept==='bootleg'
  const drop={yard:start.yard-(start.yard<plan.startYard-4?1.4:3.8),lateral:boot?4:0}
  if(playAction&&t<.2)return blend(start,{yard:start.yard+.7,lateral:start.lateral},t/.2)
  const from=playAction?{yard:start.yard+.7,lateral:start.lateral}:start
  const dropStart=playAction?.2:.08
  const at=t<dropStart?start:blend(from,drop,(t-dropStart)/(.36-dropStart))
  return plan.event==='sack'&&t>.45?blend(at,{yard:plan.endYard,lateral:drop.lateral},(t-.45)/.48):at
}

export function runnerPosition(runner:ActivePlayer,qb:Coordinate,plan:ReplayPlan,playId:string,progress:number):Coordinate{
  const t=clamp(progress,0,1),start=runner.preSnap,los=plan.startYard
  const gap=runner.assignment.gap??'A-right',side=gap.endsWith('left')?-1:1
  const concept=offenseById(playId)?.concept??'inside-zone'
  const outside=concept==='outside-zone'||concept==='toss'||gap.startsWith('D')
  const counter=concept==='counter'
  const handoff={yard:qb.yard-.5,lateral:outside?side*2:qb.lateral}
  const edge={yard:Math.min(los-.5,plan.endYard),lateral:side*9}
  const inside={yard:Math.min(los+1,plan.endYard),lateral:plan.targetLateral}
  const finish={yard:plan.endYard,lateral:plan.targetLateral}
  if(t<=.23)return blend(start,handoff,t/.23)
  if(counter&&t<.36)return blend(handoff,{yard:los-2,lateral:-side*2},(t-.23)/.13)
  if(counter&&t<.55)return blend({yard:los-2,lateral:-side*2},inside,(t-.36)/.19)
  const lane=outside?edge:inside
  const laneStart=counter?.55:.23
  const laneEnd=counter?.55:outside?.55:.49
  if(t<laneEnd)return blend(handoff,lane,(t-laneStart)/(laneEnd-laneStart))
  return blend(lane,finish,(t-laneEnd)/.39)
}

export function routePosition(receiver:ActivePlayer,plan:ReplayPlan|undefined,progress:number):Coordinate{
  const t=clamp(progress,0,1),path=assignmentPath(receiver)
  if(plan?.receiverId===receiver.id&&plan.event==='completion'){
    const routeFraction=(plan.routeProgress??1)*clamp((t-.08)/.57,0,1)
    const routePoint=pointOnPath(path,routeFraction)
    const onRoute={yard:receiver.preSnap.yard+routePoint.forward,lateral:receiver.preSnap.lateral+routePoint.lateral}
    if(t<=.65)return onRoute
    return blend({yard:plan.catchYard??onRoute.yard,lateral:plan.catchLateral??onRoute.lateral},{yard:plan.endYard,lateral:plan.targetLateral},(t-.65)/.29)
  }
  const point=pointOnPath(path,clamp((t-.08)/.78,0,1))
  return {yard:receiver.preSnap.yard+point.forward,lateral:receiver.preSnap.lateral+point.lateral}
}

export function snapBallPosition(center:Coordinate,qb:Coordinate,t:number):Coordinate{return blend(center,qb,t/.1)}

export function normalBallPosition(plan:ReplayPlan,center:Coordinate,qb:Coordinate,carrier:Coordinate,interceptor:Coordinate|undefined,progress:number){
  const t=clamp(progress,0,1)
  if(t<.1)return {...snapBallPosition(center,qb,t),flight:0}
  if(['completion','incomplete','interception'].includes(plan.event)){
    if(t<.38)return {...qb,flight:0}
    const landing={yard:plan.targetYard,lateral:plan.catchLateral??plan.targetLateral}
    if(t<.65){const flight=clamp((t-.38)/.27,0,1);return {...blend(qb,landing,flight),flight}}
    if(plan.event==='completion')return {...carrier,flight:0}
    if(plan.event==='interception')return {...(interceptor??landing),flight:0}
    return {...landing,flight:0}
  }
  if(plan.event==='sack')return {...qb,flight:0}
  if(t<.25)return {...blend(qb,carrier,(t-.1)/.15),flight:0}
  return {...carrier,flight:0}
}
