import type { Result } from './engine'
import type { ActivePlayer, Coordinate, Matchup } from './football'
import { clamp } from './strategy'

export type ReplayPlan={
  startYard:number;endYard:number;event:NonNullable<Result['event']>;
  carrierId?:string;receiverId?:string;tacklerId?:string;interceptorId?:string;returnerId?:string;
  catchYard?:number;targetYard:number;targetLateral:number;contact:boolean
}
const distance=(a:Coordinate,b:Coordinate)=>Math.hypot(a.yard-b.yard,(a.lateral-b.lateral)*.45)

// Resolve the visual participants once at the snap. The renderer only follows this plan.
export function buildReplay(result:Result,matchup:Matchup,startYard:number):ReplayPlan{
  const event=result.event??(result.offense.toLowerCase().includes('pass')?'completion':'run')
  const endYard=clamp(startYard+result.yards,0,100)
  const offense=matchup.offense,defense=matchup.defense
  const qb=offense.find(p=>p.position==='QB')??offense[0]
  const runner=offense.find(p=>p.assignment.kind==='ballCarry')??qb
  const routes=offense.filter(p=>p.assignment.kind==='route')
  const receiver=routes.find(p=>p.position==='WR')??routes[0]
  const passEvent=['completion','incomplete','interception'].includes(event)
  const carrier=event==='sack'?qb:passEvent?receiver??qb:runner
  const targetLateral=clamp(carrier.preSnap.lateral+(event==='run'?(carrier.assignment.gap?.endsWith('left')?-2:2):0),-23,23)
  const catchYard=event==='completion'?clamp(startYard+Math.max(0,Math.round(result.yards*.7)),0,100):undefined
  const targetYard=event==='completion'?catchYard!:event==='incomplete'?clamp(startYard+Math.max(6,Math.min(23,Math.abs(result.yards)+12)),0,100):endYard
  const contact=!result.touchdown&&!result.safety&&['run','completion','sack','fumble'].includes(event)
  const target={yard:contact?endYard:targetYard,lateral:targetLateral}
  const tackler=contact?[...defense].sort((a,b)=>distance(a.preSnap,target)-distance(b.preSnap,target))[0]:undefined
  const interceptor=event==='interception'?[...defense].sort((a,b)=>distance(a.preSnap,target)-distance(b.preSnap,target))[0]:undefined
  return {startYard,endYard,event,carrierId:carrier.id,receiverId:receiver?.id,tacklerId:tackler?.id,interceptorId:interceptor?.id,returnerId:result.conversionReturn?(interceptor??tackler??defense[0]).id:undefined,catchYard,targetYard,targetLateral,contact}
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
  return {yard:start.yard+(plan.endYard+.3-start.yard)*eased,lateral:start.lateral+(plan.targetLateral+.3-start.lateral)*eased}
}

export function conversionReturnYard(startYard:number,turnoverYard:number,progress:number):number{
  const t=clamp(progress,0,1)
  return t<.35?startYard+(turnoverYard-startYard)*t/.35:turnoverYard*(1-clamp((t-.35)/.6,0,1))
}
