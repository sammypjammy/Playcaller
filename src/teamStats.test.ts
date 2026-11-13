import assert from 'node:assert/strict'
import test from 'node:test'
import { finish, fresh, type Result } from './engine'

const result=(event:Result['event'],yards:number,offense:string):Result=>({event,yards,offense,defense:'cover3',text:'Test play',turnover:event==='interception',touchdown:false,safety:false,firstDown:false,clock:5})

test('normal plays update team totals and defensive stops',()=>{
  let g=fresh(5)
  g=finish(g,result('run',7,'sbInside'),6)
  g=finish(g,result('completion',12,'sbSlants'),7)
  g=finish(g,result('incomplete',0,'sbSlants'),8)
  g=finish(g,result('sack',-4,'sbSlants'),9)
  assert.equal(g.stats.home.rushingYards,7)
  assert.equal(g.stats.home.passingYards,12)
  assert.equal(g.stats.home.attempts,3)
  assert.equal(g.stats.home.completions,1)
  assert.equal(g.stats.away.sacks,1)
  assert.equal(g.stats.away.tacklesForLoss,1)
})
