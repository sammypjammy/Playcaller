import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMatchup } from './football'
import { defensivePlays, defensiveLookForCall } from './playbook'

test('defensive call art matches its coverage and pressure concept',()=>{
  const expectedDeep:Record<string,number>={cover0:0,cover1:1,cover2:2,cover3:3,cover4:4,samBlitz:3,nickelBlitz:3}
  for(const call of defensivePlays){
    const m=buildMatchup('home','shotgunSpread',defensiveLookForCall(call.id),'sgMesh',call.id,50)
    const deep=m.defense.filter(p=>p.assignment.kind==='deepSafety')
    assert.equal(deep.length,expectedDeep[call.id],call.id)
    if(call.kind==='man')assert.ok(m.defense.some(p=>p.assignment.kind==='man'),call.id)
    if(call.kind==='blitz')assert.ok(m.defense.some(p=>p.assignment.kind==='blitz'),call.id)
    if(call.id==='samBlitz')assert.ok(m.defense.some(p=>p.formationRole==='Sam LB'&&p.assignment.kind==='blitz'&&p.assignment.gap==='C-right'))
    if(call.id==='nickelBlitz')assert.ok(m.defense.some(p=>p.position==='NB'&&p.assignment.kind==='blitz'))
  }
})
