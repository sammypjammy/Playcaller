import type { Result } from './engine'
import type { ActivePlayer, Coordinate, Matchup } from './football'
import { clamp } from './strategy'
import { assignmentPath, pointOnPath, type PathPoint } from './assignmentPath'
import { offenseById } from './playbook'

export type ReplayPlan={
  startYard:number;endYard:number;event:NonNullable<Result['event']>;
  carrierId?:string;receiverId?:string;tacklerId?:string;interceptorId?:string;returnerId?:string;
  catchYard?:number;catchLateral?:number;routeProgress?:number;routeExitProgress?:number;returnEndYard?:number;targetYard:number;targetLateral:number;contact:boolean
}
const distance=(a:Coordinate,b:Coordinate)=>Math.hypot(a.yard-b.yard,(a.lateral-b.lateral)*.45)
function routeProgressAt(points:PathPoint[],forward:number){
  if(points.length<2||forward<=points[0].forward)return 0
  for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1]
    if(forward>=a.forward&&forward<=b.forward&&b.forward>a.forward)return (i+(forward-a.forward)/(b.forward-a.forward))/(points.length-1)
  }
  return 1
}

// Resolve the visual participants once at the snap. The renderer only follows this plan.
export function buildReplay(result:Result,matchup:Matchup,startYard:number):ReplayPlan{
  const event=result.event??(result.offense.toLowerCase().includes('pass')?'completion':'run')
  const endYard=clamp(startYard+result.yards,0,100)
  const offense=matchup.offense,defense=matchup.defense
  const qb=offense.find(p=>p.position==='QB'||p.position==='P'||p.position==='H')??offense[0]
  const runner=offense.find(p=>p.assignment.kind==='ballCarry')??qb
  const routes=offense.filter(p=>p.assignment.kind==='route')
  const passEvent=['completion','incomplete','interception'].includes(event)
  const concept=offenseById(result.offense)?.concept
  const intendedDepth=event==='completion'?concept==='mesh'?5:Math.max(2,Math.min(Math.max(0,result.yards)*.62,(offenseById(result.offense)?.base??8)+4)):Math.max(5,offenseById(result.offense)?.base??8)
  const receiver=[...routes].sort((a,b)=>{
    const aDepth=assignmentPath(a).at(-1)?.forward??0,bDepth=assignmentPath(b).at(-1)?.forward??0
    if(concept==='mesh')return Number(b.assignment.route==='cross')-Number(a.assignment.route==='cross')
      ||Math.abs(aDepth-intendedDepth)-Math.abs(bDepth-intendedDepth)
    return Math.abs(aDepth-intendedDepth)-Math.abs(bDepth-intendedDepth)||Number(b.position==='WR')-Number(a.position==='WR')
  })[0]
  const carrier=event==='sack'?qb:passEvent?receiver??qb:runner
  const route=receiver?assignmentPath(receiver):[{forward:0,lateral:0}]
  const desiredYard=event==='completion'?Math.min(endYard,startYard+intendedDepth):startYard+intendedDepth
  const routeProgress=receiver?routeProgressAt(route,desiredYard-receiver.preSnap.yard):0
  const routePoint=pointOnPath(route,routeProgress)
  const catchYard=passEvent?clamp(receiver?receiver.preSnap.yard+routePoint.forward:startYard+intendedDepth,0,100):undefined
  const catchLateral=passEvent?clamp(receiver?receiver.preSnap.lateral+routePoint.lateral:0,-23,23):undefined
  const routeEnd=route.at(-1)??routePoint
  const routeExitProgress=event==='completion'&&receiver&&routeEnd.forward>routePoint.forward
    ?routeProgress+(1-routeProgress)*clamp((endYard-catchYard!)/(routeEnd.forward-routePoint.forward),0,1)
    :routeProgress
  const exitPoint=pointOnPath(route,routeExitProgress)
  const exitLateral=receiver?clamp(receiver.preSnap.lateral+exitPoint.lateral,-23,23):catchLateral??0
  const returnEndYard=event==='interception'?result.defensiveTouchdown?0:Math.max(1,catchYard!-(result.returnYards??0)):undefined
  const gap=runner.assignment.gap??'A-right',gapSide=gap.endsWith('left')?-1:1
  const lane=gap.startsWith('D')?10:gap.startsWith('C')?5:gap.startsWith('B')?2.8:.9
  const targetLateral=event==='completion'?exitLateral:passEvent?catchLateral??0:event==='sack'?qb.preSnap.lateral:clamp(gapSide*lane,-23,23)
  const targetYard=passEvent?catchYard!:endYard
  const contact=!result.touchdown&&!result.safety&&['run','completion','sack','fumble','interception'].includes(event)
  const target={yard:event==='interception'?returnEndYard!:contact?endYard:targetYard,lateral:targetLateral}
  const tackler=contact?[...(event==='interception'?offense:defense)].sort((a,b)=>distance(a.preSnap,target)-distance(b.preSnap,target))[0]:undefined
  const catchSpot={yard:catchYard??targetYard,lateral:catchLateral??targetLateral}
  const interceptor=event==='interception'?[...defense].sort((a,b)=>distance(a.preSnap,catchSpot)-distance(b.preSnap,catchSpot))[0]:undefined
  return {startYard,endYard,event,carrierId:carrier.id,receiverId:receiver?.id,tacklerId:tackler?.id,interceptorId:interceptor?.id,returnerId:result.conversionReturn?(interceptor??tackler??defense[0]).id:undefined,catchYard,catchLateral,routeProgress,routeExitProgress,returnEndYard,targetYard,targetLateral,contact}
}

export function replayCarrierYard(plan:ReplayPlan,progress:number):number{
  const t=clamp(progress,0,1)
  if(plan.event==='completion'){
    const catchYard=plan.catchYard??plan.endYard
    return t<.65?plan.startYard+(catchYard-plan.startYard)*clamp((t-.2)/.45,0,1):catchYard+(plan.endYard-catchYard)*clamp((t-.65)/.28,0,1)
  }
  return plan.startYard+(plan.endYard-plan.startYard)*clamp(t/.9,0,1)
}

export function replayTacklerPosition(start:Coordinate,plan:ReplayPlan,progress:number):Coordinate{
  const t=clamp(progress/.9,0,1)
  const eased=t*t*(3-2*t)
  const end=plan.event==='interception'?plan.returnEndYard??plan.targetYard:plan.endYard
  return {yard:start.yard+(end+.3-start.yard)*eased,lateral:start.lateral+(plan.targetLateral+.3-start.lateral)*eased}
}

export function conversionReturnYard(startYard:number,turnoverYard:number,progress:number):number{
  const t=clamp(progress,0,1)
  return t<.35?startYard+(turnoverYard-startYard)*t/.35:turnoverYard*(1-clamp((t-.35)/.6,0,1))
}
