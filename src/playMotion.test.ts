import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMatchup } from './football'
import { fresh, resolve, type Result } from './engine'
import { buildReplay } from './replay'
import { normalBallPosition, pursuitPosition, quarterbackPosition, routePosition, runnerPosition } from './playMotion'
import { durationFor } from './flow'

const outcome=(offense:string,event:NonNullable<Result['event']>,yards:number):Result=>({offense,defense:'cover3',event,yards,text:'test',turnover:false,touchdown:false,safety:false,firstDown:false,clock:19})

test('the snap reaches the quarterback before he drops and throws',()=>{
  const scene=buildMatchup('home','singleDoubles','look43','sbSlants','cover3',25)
  const plan=buildReplay(outcome('sbSlants','completion',12),scene,25)
  const qb=scene.offense.find(p=>p.position==='QB')!
  const center=scene.offense.find(p=>p.position==='C')!
  const receiver=scene.offense.find(p=>p.id===plan.receiverId)!
  const drop=quarterbackPosition(qb,plan,'sbSlants',.38)
  assert.ok(drop.yard<qb.preSnap.yard-2)
  assert.equal(normalBallPosition(plan,center.preSnap,qb.preSnap,receiver.preSnap,undefined,0).yard,center.preSnap.yard)
  assert.equal(normalBallPosition(plan,center.preSnap,drop,receiver.preSnap,undefined,.1).yard,drop.yard)
  assert.ok(normalBallPosition(plan,center.preSnap,drop,receiver.preSnap,undefined,.5).flight>0)
})

test('receiver runs the assigned route to the catch, then gains yards after it',()=>{
  const scene=buildMatchup('home','singleDoubles','look43','sbSlants','cover3',25)
  const plan=buildReplay(outcome('sbSlants','completion',28),scene,25)
  const receiver=scene.offense.find(p=>p.id===plan.receiverId)!
  const caught=routePosition(receiver,plan,plan.catchAt!)
  const finished=routePosition(receiver,plan,1)
  assert.ok(receiver.assignment.kind==='route')
  assert.ok(Math.abs(caught.yard-plan.catchYard!)<.01)
  assert.ok(Math.abs(caught.lateral-plan.catchLateral!)<.01)
  assert.equal(finished.yard,53)
  assert.ok(finished.yard-caught.yard>10)
  const ball=normalBallPosition(plan,scene.offense.find(p=>p.position==='C')!.preSnap,scene.offense.find(p=>p.position==='QB')!.preSnap,finished,undefined,1)
  assert.equal(ball.yard,finished.yard)
})

test('a mesh catch continues across the field before turning upfield',()=>{
  const scene=buildMatchup('home','shotgunSpread','look43','sgMesh','cover3',25)
  const plan=buildReplay(outcome('sgMesh','completion',30),scene,25)
  const receiver=scene.offense.find(p=>p.id===plan.receiverId)!
  const caught=routePosition(receiver,plan,plan.catchAt!)
  const crossing=routePosition(receiver,plan,plan.catchAt!+(1-plan.catchAt!)*.2)
  const upfield=routePosition(receiver,plan,plan.catchAt!+(1-plan.catchAt!)*.8)
  const finished=routePosition(receiver,plan,1)
  assert.ok(Math.abs(crossing.lateral-caught.lateral)>1)
  assert.ok(Math.abs(upfield.lateral-finished.lateral)<.01)
  assert.ok(finished.yard>upfield.yard)
  assert.equal(finished.yard,55)
})

test('pursuers with equal speed cover at most the same post-catch distance',()=>{
  const start={yard:25,lateral:10},carrier={yard:45,lateral:0}
  const equal=pursuitPosition(start,carrier,10,84,84)
  const slower=pursuitPosition(start,carrier,10,70,84)
  assert.ok(Math.abs(Math.hypot(equal.yard-start.yard,equal.lateral-start.lateral)-10)<.01)
  assert.ok(slower.yard<equal.yard)
})

test('outside runs stretch laterally while inside runs hit near the center',()=>{
  const inside=buildMatchup('home','singleDoubles','look43','sbInside','cover3',25)
  const outside=buildMatchup('home','singleDoubles','look43','sbOutside','cover3',25)
  const insidePlan=buildReplay(outcome('sbInside','run',8),inside,25)
  const outsidePlan=buildReplay(outcome('sbOutside','run',8),outside,25)
  assert.ok(outsidePlan.durationMs!>insidePlan.durationMs!)
  const insideBack=inside.offense.find(p=>p.position==='HB')!,outsideBack=outside.offense.find(p=>p.position==='HB')!
  const insideAt=runnerPosition(insideBack,inside.offense.find(p=>p.position==='QB')!.preSnap,insidePlan,'sbInside',.55)
  const outsideAt=runnerPosition(outsideBack,outside.offense.find(p=>p.position==='QB')!.preSnap,outsidePlan,'sbOutside',.55)
  assert.ok(Math.abs(outsideAt.lateral)>Math.abs(insideAt.lateral)+6)
  assert.ok(outsideAt.yard<insideAt.yard)
  assert.equal(runnerPosition(outsideBack,outside.offense.find(p=>p.position==='QB')!.preSnap,outsidePlan,'sbOutside',1).yard,33)
})

test('an open receiver can break away after the catch for a long touchdown',()=>{
  const scene=buildMatchup('home','singleDoubles','look43','sbSlants','cover3',25)
  let long:Result|undefined
  for(let seed=0;seed<10000&&!long;seed++){
    const result=resolve(fresh(seed),'sbSlants','cover3').result
    if(result.event==='completion'&&result.yards>=75)long=result
  }
  assert.ok(long)
  assert.equal(long.touchdown,true)
  const plan=buildReplay(long,scene,25)
  const receiver=scene.offense.find(p=>p.id===plan.receiverId)!
  assert.ok(plan.catchYard!<50)
  assert.equal(routePosition(receiver,plan,1).yard,100)
  assert.equal(plan.contact,false)
  assert.ok(durationFor('PLAY_RUNNING',false,{...long,replay:plan})>5500)
  const points=[0,.25,.5,.75,1].map(fraction=>routePosition(receiver,plan,plan.catchAt!+(1-plan.catchAt!)*fraction))
  const steps=points.slice(1).map((point,i)=>point.yard-points[i].yard)
  assert.ok(Math.max(...steps)-Math.min(...steps)<1)
})

test('a runner and a dropping quarterback move at steady speeds',()=>{
  const runScene=buildMatchup('home','singleDoubles','look43','sbInside','cover3',25)
  const runPlan=buildReplay(outcome('sbInside','run',20),runScene,25)
  const back=runScene.offense.find(p=>p.position==='HB')!
  const qb=runScene.offense.find(p=>p.position==='QB')!
  const runPoints=[0,.25,.5,.75,1].map(t=>runnerPosition(back,qb.preSnap,runPlan,'sbInside',t))
  const distances=runPoints.slice(1).map((point,i)=>Math.hypot(point.yard-runPoints[i].yard,point.lateral-runPoints[i].lateral))
  assert.ok(Math.max(...distances)/Math.min(...distances)<1.5)
  const passScene=buildMatchup('home','singleDoubles','look43','sbPACross','cover3',25)
  const passPlan=buildReplay(outcome('sbPACross','completion',22),passScene,25)
  const passer=passScene.offense.find(p=>p.position==='QB')!
  const start=passPlan.throwAt!*.35,end=passPlan.throwAt!
  const dropPoints=[0,.25,.5,.75,1].map(f=>quarterbackPosition(passer,passPlan,'sbPACross',start+(end-start)*f))
  const drops=dropPoints.slice(1).map((point,i)=>Math.hypot(point.yard-dropPoints[i].yard,point.lateral-dropPoints[i].lateral))
  assert.ok(Math.max(...drops)-Math.min(...drops)<.01)
})
