import test from 'node:test';import assert from 'node:assert/strict';import '../src/game.js';import '../src/ui.js';
const H=globalThis.HB;
const make=(config={},seed='test')=>H.create({seed,config:{minTurns:3,maxTurns:3,minAttacks:2,maxAttacks:2,personality:'standard',goldenChance:0,...config}});
test('phase generation, immutable plan and public information isolation',()=>{
 for(let i=0;i<200;i++){const g=H.create({seed:i});const s=g.debug().state,v=g.view();assert.equal(s.order.filter(x=>x!=='E').length,v.attacks);assert.equal(v.shield,v.attacks-1);assert.equal(v.r,1);assert.equal(v.hp,3);assert.ok(!JSON.stringify(v).includes('order'));assert.ok(!JSON.stringify(v).includes('personality'));const order=[...s.order];g.act('shield');assert.deepEqual(g.debug().state.order,order);}
});
test('all nine action outcomes and immediate victory/defeat',()=>{
 for(const attack of ['E','H','G'])for(const action of ['none','shield','counter']){
 let g=make({minTurns:3,maxTurns:3,minAttacks:attack==='E'?2:3,maxAttacks:attack==='E'?2:3,goldenChance:attack==='G'?1:0,weights:{standard:[1,0,0],impatient:[1,0,0],patient:[1,0,0]}},attack==='E'?'find':'test');
 if(attack==='E'){for(let seed=0;g.debug().state.order[0]!=='E';seed++)g=make({},String(seed));}
 const power=attack==='G'?2:attack==='H'?1:0;g.act(action);assert.equal(g.view().hp,3-(action==='none'?power:0));assert.equal(g.view().hammer,3-(action==='counter'?power:0));assert.throws(()=>g.act(action));
 }
 const lose=make({minTurns:3,maxTurns:3,minAttacks:3,maxAttacks:3});for(let i=0;i<3;i++){lose.act('none');if(i<2)lose.next();}assert.equal(lose.view().stage,'lost');assert.throws(()=>lose.next());
 const win=make({minTurns:1,maxTurns:1,minAttacks:1,maxAttacks:1});for(let i=0;i<3;i++){win.act('counter');if(i<2)win.next();}assert.equal(win.view().stage,'won');assert.throws(()=>win.item('heal'));
});
test('resources reset each phase and inventory carries over within cap',()=>{
 const g=make({minTurns:2,maxTurns:2,minAttacks:1,maxAttacks:1,itemWeights:[1,0,0],minItems:3,maxItems:3});
 g.item('xray',0);g.item('xray',1);g.act('counter');g.next();g.act('none');g.next();assert.equal(g.view().r,1);assert.equal(g.view().shield,0);assert.equal(g.view().inventory.xray,4);
 g.act('counter');g.next();g.act('none');if(g.view().stage==='result'){g.next();assert.equal(g.view().inventory.xray,6);assert.equal(g.view().discarded,1);}
});
test('xray masks gold, supports future targets, updates conditional probability',()=>{
 const g=make({goldenChance:1,itemWeights:[1,0,0],minItems:3,maxItems:3});const s=g.debug().state;const gold=s.order.indexOf('G');
 const info=g.item('xray',gold);assert.equal(info.attack,true);assert.ok(!JSON.stringify(info).includes('G'));assert.throws(()=>g.item('xray',gold));assert.equal(g.view().probability,gold===0?1:1/2);
 const other=s.order.findIndex((x,i)=>i!==gold&&x!=='E');g.item('xray',other);assert.equal(g.view().probability,s.order[0]==='E'?0:1);assert.ok(!H.render(g.view(),false).includes('ゴールデン攻撃 ·'));
});
test('healing and recharge restrictions, multiple items and no free invalid use',()=>{
 const heal=make({minAttacks:3,maxAttacks:3,itemWeights:[0,1,0],minItems:3,maxItems:3});assert.throws(()=>heal.item('heal'));assert.equal(heal.view().inventory.heal,3);heal.act('none');heal.next();heal.item('heal');assert.equal(heal.view().hp,3);
 const g=make({minAttacks:3,maxAttacks:3,itemWeights:[0,0,1],minItems:3,maxItems:3});assert.throws(()=>g.item('recharge'));g.act('counter');g.next();g.item('recharge');assert.equal(g.view().r,1);assert.throws(()=>g.item('recharge'));g.act('counter');g.next();g.item('recharge');g.act('counter');assert.equal(g.view().stage,'won');
});
test('golden cooldown skips exactly three phases after actual use',()=>{
 const g=make({minTurns:2,maxTurns:2,minAttacks:1,maxAttacks:1,goldenChance:1,itemWeights:[0,1,0],minItems:3,maxItems:3});
 for(let phase=1;phase<=5;phase++){
 assert.equal(g.view().golden,phase===1||phase===5);
 for(let turn=0;turn<2;turn++){if(g.view().hp<3)g.item('heal');const attack=g.debug().state.order[turn];g.act(phase===1&&attack!=='E'?'counter':'none');assert.notEqual(g.view().stage,'lost');if(phase!==5||turn!==1)g.next();}
 }
});
test('position weighting, deterministic seeds and validation',()=>{
 assert.deepEqual(H.positionWeights(3,[70,20,10]),[70,20,10]);assert.deepEqual(H.positionWeights(1,[70,20,10]),[1]);assert.ok(H.positionWeights(4,[70,20,10])[0]>H.positionWeights(4,[70,20,10])[3]);
 const a=make(),b=make();const x=a.debug(),y=b.debug();delete x.state.started;delete y.state.started;assert.deepEqual(x,y);
 assert.throws(()=>make({minTurns:1}));assert.throws(()=>make({itemWeights:[0,0,0]}));assert.throws(()=>make({goldenChance:2}));
});
