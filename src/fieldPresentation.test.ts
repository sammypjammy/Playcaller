import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMatchup } from './football'
import { blendPoint, huddlePositions, tackleAngle } from './fieldPresentation'

test('huddles keep all 22 players distinct and inside the field near both goals',()=>{
  for(const los of [1,25,50,99]){
    const m=buildMatchup('home','singleDoubles','look43','sbInside','d43Cover3',los)
    const spots=huddlePositions(m,los)
    assert.equal(spots.size,22)
    const offense=m.offense.map(p=>spots.get(p.id)!)
    const defense=m.defense.map(p=>spots.get(p.id)!)
    assert.ok(offense.every(p=>p.yard<los&&p.yard>=-10&&Math.abs(p.lateral)<5))
    assert.ok(defense.every(p=>p.yard>los&&p.yard<=110&&Math.abs(p.lateral)<5))
    const all=[...offense,...defense]
    for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++)assert.ok(Math.hypot(all[i].yard-all[j].yard,all[i].lateral-all[j].lateral)>.75)
  }
})

test('movement endpoints and tackle approach angles are stable',()=>{
  const a={yard:20,lateral:-4},b={yard:25,lateral:6}
  assert.deepEqual(blendPoint(a,b,0),a)
  assert.deepEqual(blendPoint(a,b,1),b)
  assert.equal(tackleAngle({yard:26,lateral:0},{yard:25,lateral:0}),'front')
  assert.equal(tackleAngle({yard:25,lateral:4},{yard:25,lateral:0}),'side')
  assert.equal(tackleAngle({yard:24,lateral:0},{yard:25,lateral:0}),'pursuit')
})
