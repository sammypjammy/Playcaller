import assert from 'node:assert/strict'
import test from 'node:test'
import { allTechniques, buildMatchup, buildOffense, buildSpecialMatchup, defensiveFronts, defensiveLooks, defensivePackages, offensiveFormations, personnel, rosters, validateMatchup, validateSpecialMatchup } from './football'
import { attemptPAT, attemptTwo, chooseConversion, completeConversion, defense, finish, fresh, opponentSpecial, resolve, selectAI, special } from './engine'
import { assignmentEdge } from './football'
import { defenseGroups, defensiveLookForCall, fakePlays, offenseGroupFor, offenseGroups, offensivePlays, specialGroups } from './playbook'

test('every offensive formation validates with each compatible personnel group',()=>{
  for(const formation of offensiveFormations)for(const code of formation.compatible){
    const players=buildOffense('home',formation.id,code,50)
    assert.equal(players.length,11,`${formation.id} ${code}`)
    assert.equal(players.filter(p=>p.onLine).length,7)
    assert.equal(players.filter(p=>p.eligible&&p.onLine).length,2)
    assert.equal(players.filter(p=>p.position==='HB'||p.position==='FB').length,personnel[code].rb)
    assert.equal(players.filter(p=>p.position==='TE').length,personnel[code].te)
    assert.equal(players.filter(p=>p.position==='WR').length,personnel[code].wr)
    assert.equal(new Set(players.map(p=>p.id)).size,11)
  }
})
test('every defensive package and look fields eleven assigned players',()=>{
  const offense=buildOffense('home','shotgunSpread','11',50)
  for(const pack of defensivePackages)assert.equal(pack.line.length+pack.linebackers.length+pack.backs.length,11,pack.id)
  for(const look of defensiveLooks){
    const m=buildMatchup('home','shotgunSpread',look.id,'sgMesh','d43Cover3',50)
    assert.equal(m.defense.length,11,look.id)
    assert.equal(m.offense.length,11,look.id)
    assert.equal(validateMatchup(m).length,0,look.id)
    assert.ok(m.defense.every(p=>p.assignment.kind&&p.field&&p.preSnap))
    assert.ok(m.defense.some(p=>p.formationRole&&p.technique))
    assert.equal(offense.length,11)
  }
})
test('all techniques are represented by reusable fronts',()=>{
  const covered=new Set(defensiveFronts.flatMap(f=>f.slots.map(s=>s.technique)))
  assert.deepEqual([...covered].sort(),[...allTechniques].sort())
})
test('left and right formations mirror skill alignment',()=>{
  const right=buildOffense('home','shotgunTripsRight','11',50)
  const left=buildOffense('home','shotgunTripsLeft','11',50)
  for(const position of ['WR1','WR2','WR3']){
    const a=right.find(p=>p.formationRole===position)!,b=left.find(p=>p.formationRole===position)!
    assert.equal(a.field.lateral,-b.field.lateral,position)
  }
})
test('changing personnel substitutes the correct players',()=>{
  const a=buildOffense('home','i','21',50),b=buildOffense('home','i','23',50)
  assert.equal(a.find(p=>p.position==='QB')?.id,b.find(p=>p.position==='QB')?.id)
  assert.notDeepEqual(a.filter(p=>p.position==='WR').map(p=>p.id),b.filter(p=>p.position==='WR').map(p=>p.id))
  assert.equal(b.filter(p=>p.position==='TE').length,3)
})
test('all 22 have unique identities and meaningful assignments',()=>{
  const m=buildMatchup('away','pistolStrong','look425','iLead','dNickelCover2',45)
  const all=[...m.offense,...m.defense]
  assert.equal(all.length,22)
  assert.equal(new Set(all.map(p=>p.id)).size,22)
  assert.ok(all.every(p=>p.name&&p.jersey&&p.position&&p.formationRole&&p.assignment.kind&&p.team&&p.ratings.speed))
  assert.equal(rosters.home.length,rosters.away.length)
})
test('formations remain valid near either goal line',()=>{
  for(const yard of [1,2,5,95,98,99])for(const formation of offensiveFormations){
    const look=defensiveLooks.find(x=>x.id==='look43')!
    const m=buildMatchup('home',formation.id,look.id,'sbSlants','d43Cover3',yard)
    assert.equal(validateMatchup(m).length,0,`${formation.id} at ${yard}`)
  }
})
test('every offensive formation combines with every defensive look',()=>{
  for(const formation of offensiveFormations)for(const look of defensiveLooks){
    const m=buildMatchup('home',formation.id,look.id,'sbSlants','d43Cover3',50)
    assert.equal(validateMatchup(m).length,0,`${formation.id} vs ${look.id}`)
  }
})
test('a complete exhibition keeps a validated 22-player matchup at every normal snap',()=>{
  let g=fresh(2187)
  for(let i=0;i<1000&&g.phase!=='final';i++){
    if(g.conversion){const ready=chooseConversion(g,g.overtime?.mode==='shootout'?'two':'pat');g=completeConversion(ready.conversion?.mode==='two'?attemptTwo(ready,'sbInside','cover3'):attemptPAT(ready));continue}
    const kick=opponentSpecial(g)
    if(kick){g=special(g,kick,'puntReturn');continue}
    if(g.possession==='home'&&g.down===4){g=special(g,'punt');continue}
    const attack=g.possession==='home'?'sbInside':selectAI(g)
    const defend=g.possession==='home'?selectAI(g):'cover3'
    const formation=offenseGroupFor(attack)?.id??'singleDoubles'
    const m=buildMatchup(g.possession,formation,defensiveLookForCall(defend),attack,defend,g.yard)
    assert.equal(m.offense.length+m.defense.length,22)
    const {result,seed}=resolve(g,attack,defend,assignmentEdge(m))
    g=finish(g,result,seed)
  }
  assert.equal(g.phase,'final')
})
test('coverage assignments match the called shell and press alignment',()=>{
  const two=buildMatchup('home','shotgunSpread','look43','sgMesh','cover2',50)
  const three=buildMatchup('home','shotgunSpread','look43','sgMesh','cover3',50)
  const press=buildMatchup('home','shotgunSpread','look43','sgMesh','cover1',50)
  assert.equal(two.defense.filter(p=>p.assignment.kind==='deepSafety').length,2)
  assert.equal(three.defense.filter(p=>p.assignment.kind==='deepSafety').length,3)
  assert.ok(press.defense.filter(p=>p.assignment.kind==='man').length>=4)
  assert.ok(press.defense.filter(p=>p.position==='CB').every(p=>p.field.yard-50<3))
})
test('all defensive calls remain valid across packages and representative formations',()=>{
  for(const formation of ['i','shotgunEmpty','pistolWeak'])for(const look of defensiveLooks)for(const call of defense){
    const m=buildMatchup('home',formation,look.id,'sbSlants',call.id,50)
    assert.equal(validateMatchup(m).length,0,`${formation} / ${look.id} / ${call.id}`)
  }
})

test('active playbook has four offensive families and seven distinct defensive calls',()=>{
  assert.equal(offenseGroups.length,4)
  assert.equal(defenseGroups.length,3)
  assert.equal(offensivePlays.length,20)
  assert.equal(defense.length,7)
  for(const group of offenseGroups){
    assert.equal(group.plays.length,5)
    const signatures=new Set<string>()
    for(const id of group.plays){
      const m=buildMatchup('home',group.id,'look43',id,'cover3',50)
      assert.equal(validateMatchup(m).length,0,id)
      assert.equal(m.personnel.code,group.id==='i'||group.id==='pistolStrong'?'21':'11')
      signatures.add(JSON.stringify(m.offense.map(p=>[p.position,p.assignment])))
    }
    assert.equal(signatures.size,5,group.name)
  }
  for(const group of defenseGroups){
    const signatures=new Set<string>()
    for(const id of group.plays){
      const m=buildMatchup('home','shotgunSpread',defensiveLookForCall(id),'sgMesh',id,50)
      assert.equal(validateMatchup(m).length,0,id)
      signatures.add(JSON.stringify(m.defense.map(p=>[p.position,p.assignment])))
    }
    assert.equal(signatures.size,group.plays.length,group.name)
  }
})

test('six special calls field legal unique units and fakes use normal downs',()=>{
  assert.equal(specialGroups.flatMap(g=>g.plays).length,6)
  for(const id of specialGroups.flatMap(g=>g.plays)){
    for(const yard of [1,50,95,99]){
      const m=buildSpecialMatchup('home',id,id.includes('Punt')||id==='punt'?'puntReturn':'fieldGoalBlock',yard)
      assert.equal(validateSpecialMatchup(m).length,0,`${id} at ${yard}`)
      assert.equal(m.offense.length,11)
      assert.equal(m.defense.length,11)
    }
  }
  for(const fake of fakePlays){
    const g={...fresh(4),down:4,toGo:8,yard:45}
    const {result,seed}=resolve(g,fake.id,fake.id.startsWith('fakePunt')?'puntSafe':'fieldGoalSafe')
    const next=finish(g,result,seed)
    assert.equal(result.offense,fake.id)
    assert.equal(next.snap,1)
    assert.equal(next.possession,result.firstDown?'home':'away')
  }
})
