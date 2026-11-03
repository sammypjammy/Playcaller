const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const source=fs.readFileSync('dist/app.js','utf8').replace(/render\(\);\s*$/,'');
const context={localStorage:{getItem:()=>null,setItem:()=>{}},document:{},Math,console,setTimeout,clearTimeout};
vm.createContext(context);
vm.runInContext(source+'\nthis.api={fresh,weekly,spots,concepts};',context);
const {fresh,weekly,spots,concepts}=context.api;
for(let seed=1;seed<=100;seed++){
  let g=fresh();g.seed=seed;
  for(let week=1;week<=20;week++){
    g.week=week;g.spot=week%spots.length;g.concept=concepts[week%concepts.length].id;
    g.price=concepts[week%concepts.length].base;g.inventory=100;g.staff=2;
    const a=weekly(g),b=weekly(g);
    assert.equal(JSON.stringify(a),JSON.stringify(b),'same state and seed must reproduce');
    assert(a.sold<=a.demand&&a.sold<=g.inventory&&a.sold<=a.capacity);
    assert.equal(a.closing,a.opening+a.revenue-a.expenses);
    assert.equal(a.spoiled,g.inventory-a.sold);
    g.cash=a.closing;g.rivals=a.rivals;
  }
}
console.log('Simulation checks passed: 2,000 deterministic weeks.');
