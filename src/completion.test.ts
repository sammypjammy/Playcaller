import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMatchup } from './football'
import { completionWithContact } from './completion'
import { buildReplay } from './replay'
import type { Result } from './engine'

const outcome:Result={offense:'sgMesh',defense:'d43Cover3',event:'completion',yards:17,text:'17-yard completion.',turnover:false,touchdown:false,safety:false,firstDown:true,clock:19}

test('a completion continues to the end zone when the field is open',()=>{
  const scene=buildMatchup('home','shotgunSpread','look43','sgMesh','d43Cover3',25)
  for(const defender of scene.defense)defender.preSnap={yard:1,lateral:defender.preSnap.lateral}
  const result=completionWithContact(outcome,scene,25,10)
  assert.equal(result.yards,75)
  assert.equal(result.touchdown,true)
  assert.equal(result.replay?.contact,false)
})

test('a nearby defender ends the play at the awarded yard line',()=>{
  const scene=buildMatchup('home','shotgunSpread','look43','sgMesh','d43Cover3',25)
  const plan=buildReplay(outcome,scene,25)
  const defender=scene.defense[0]
  defender.preSnap={yard:plan.endYard,lateral:plan.targetLateral}
  const result=completionWithContact(outcome,scene,25,10)
  assert.equal(result.yards,17)
  assert.equal(result.touchdown,false)
  assert.equal(result.replay?.tacklerId,defender.id)
})
