(function (H) {
  'use strict';
  H.defaults = { minTurns: 5, maxTurns: 7, minAttacks: 2, maxAttacks: 4, goldenChance: .5, cooldown: 3,
    personality: 'random', weights: { impatient: [70,20,10], standard: [33,34,33], patient: [10,20,70] },
    itemWeights: [1,1,1], minItems: 2, maxItems: 3, capacity: 6, goldenShield: true };
  H.names = { impatient:'短気', standard:'標準', patient:'気長', xray:'レントゲン', heal:'回復', recharge:'リチャージ', none:'何も置かない', shield:'シールド', counter:'カウンターR', H:'通常攻撃', G:'ゴールデン攻撃', E:'非攻撃' };
  H.copy = x => JSON.parse(JSON.stringify(x));
  H.rng = seed => { let a=2166136261; for(const c of String(seed)) a=Math.imul(a^c.charCodeAt(0),16777619); return () => { a+=0x6D2B79F5; let t=Math.imul(a^a>>>15,1|a); t^=t+Math.imul(t^t>>>7,61|t); return ((t^t>>>14)>>>0)/4294967296; }; };
  H.config = input => {
    const c={...H.copy(H.defaults),...input};
    for(const k of ['minTurns','maxTurns','minAttacks','maxAttacks','cooldown','minItems','maxItems','capacity']) if(!Number.isInteger(c[k])||c[k]<(k==='cooldown'||k==='minItems'||k==='maxItems'?0:1)||c[k]>30) throw Error('設定値は許容範囲の整数で指定してください。');
    if(c.minTurns>c.maxTurns||c.minAttacks>c.maxAttacks||c.maxAttacks>c.minTurns||c.minItems>c.maxItems) throw Error('最小・最大の順序、攻撃数≦最小ターン数を確認してください。');
    if(!Number.isFinite(c.goldenChance)||c.goldenChance<0||c.goldenChance>1) throw Error('使用率は0〜100%です。');
    if(!['random','impatient','standard','patient'].includes(c.personality)) throw Error('性格が不正です。');
    for(const w of [...Object.values(c.weights),c.itemWeights]) if(w.length!==3||w.some(n=>!Number.isFinite(n)||n<0)||w.reduce((a,b)=>a+b,0)<=0) throw Error('重みは非負の数3個、合計は0より大きくしてください。');
    return c;
  };
  H.weighted = (weights,rng) => { let n=rng()*weights.reduce((a,b)=>a+b,0); for(let i=0;i<weights.length;i++){n-=weights[i];if(n<0)return i;}return weights.length-1; };
  H.positionWeights = (a,w) => a===1?[1]:Array.from({length:a},(_,i)=>{const x=i/(a-1)*2;return x<=1?w[0]*(1-x)+w[1]*x:w[1]*(2-x)+w[2]*(x-1);});
  H.probability = s => {
    const unknown=s.order.length-s.turn-Object.keys(s.scans).filter(i=>+i>=s.turn).length;
    const attacks=s.attacks-s.history.filter(x=>x.attack!=='E').length-Object.entries(s.scans).filter(([i,v])=>+i>=s.turn&&v).length;
    return s.scans[s.turn]!==undefined?Number(s.scans[s.turn]):unknown?attacks/unknown:0;
  };
  H.create = (options={}) => {
    const config=H.config(options.config||{}), seed=String(options.seed??Date.now()), rng=options.rng||H.rng(seed);
    const integer=(a,b)=>a+Math.floor(rng()*(b-a+1));
    const personality=config.personality==='random'?['impatient','standard','patient'][integer(0,2)]:config.personality;
    const s={phase:0,turn:0,hp:3,hammer:3,shield:0,r:1,inventory:{xray:0,heal:0,recharge:0},nextGoldenPhase:1,personality,archive:[],stage:'action',last:null,started:Date.now(),pendingItems:[]};
    function phase(){
      s.phase++;s.turn=0;s.stage='action';s.scans={};s.history=[];s.last=null;s.pendingItems=[];
      const n=integer(config.minTurns,config.maxTurns);s.attacks=integer(config.minAttacks,Math.min(config.maxAttacks,n));
      s.order=Array.from({length:n},(_,i)=>i<s.attacks?'H':'E');
      for(let i=n-1;i>0;i--){const j=integer(0,i);[s.order[i],s.order[j]]=[s.order[j],s.order[i]];}
      s.golden=s.phase>=s.nextGoldenPhase&&rng()<config.goldenChance;
      s.cooldown=Math.max(0,s.nextGoldenPhase-s.phase);
      if(s.golden){const indices=s.order.flatMap((x,i)=>x==='H'?[i]:[]);s.order[indices[H.weighted(H.positionWeights(indices.length,config.weights[personality]),rng)]]='G';}
      s.shield=s.attacks-1;s.r=1;s.supplies=[];s.discarded=0;
      for(let i=integer(config.minItems,config.maxItems);i>0;i--){const item=['xray','heal','recharge'][H.weighted(config.itemWeights,rng)];if(Object.values(s.inventory).reduce((a,b)=>a+b,0)<config.capacity){s.inventory[item]++;s.supplies.push(item);}else s.discarded++;}
    }
    function view(){return H.copy({phase:s.phase,turn:s.turn,n:s.order.length,attacks:s.attacks,remaining:s.attacks-s.history.filter(x=>x.attack!=='E').length,hp:s.hp,hammer:s.hammer,shield:s.shield,r:s.r,inventory:s.inventory,scans:s.scans,history:s.history.map(({knowledge,...record})=>record),stage:s.stage,last:s.last?(({knowledge,...record})=>record)(s.last):null,golden:s.golden,cooldown:s.cooldown,supplies:s.supplies,discarded:s.discarded,pendingItems:s.pendingItems,probability:s.stage==='action'?H.probability(s):s.last.knowledge.probability,goldenShield:config.goldenShield,capacity:config.capacity});}
    function archive(){s.archive.push({phase:s.phase,order:[...s.order],history:H.copy(s.history)});}
    function act(action){
      if(s.stage!=='action'||!['none','shield','counter'].includes(action))throw Error('今は行動できません。');
      if(action==='shield'&&!s.shield||action==='counter'&&!s.r)throw Error('残数がありません。');
      const knowledge=view(),attack=s.order[s.turn],power=attack==='G'?2:attack==='H'?1:0, before={hp:s.hp,hammer:s.hammer};
      if(action==='shield')s.shield--;if(action==='counter')s.r--;
      if(action==='none'||action==='shield'&&attack==='G'&&!config.goldenShield)s.hp=Math.max(0,s.hp-power);
      if(action==='counter')s.hammer=Math.max(0,s.hammer-power);
      if(attack==='G'){s.nextGoldenPhase=s.phase+config.cooldown+1;s.cooldown=config.cooldown;}
      s.last={turn:s.turn,attack,action,hpDelta:s.hp-before.hp,hammerDelta:s.hammer-before.hammer,items:H.copy(s.pendingItems),knowledge};
      s.history.push(H.copy(s.last));s.pendingItems=[];
      s.stage=s.hp===0?'lost':s.hammer===0?'won':'result';
      if(['won','lost'].includes(s.stage)){archive();s.finished=Date.now();}
    }
    function item(kind,target=s.turn){
      if(s.stage!=='action'||!s.inventory[kind])throw Error('このアイテムは使用できません。');
      if(kind==='heal'&&s.hp>=3)throw Error('HPは上限です。');
      if(kind==='recharge'&&s.r!==0)throw Error('Rが0のときだけ使用できます。');
      if(kind==='xray'&&(!Number.isInteger(target)||target<s.turn||target>=s.order.length||s.scans[target]!==undefined))throw Error('未実行・未検査のターンを指定してください。');
      const e={item:kind};
      if(kind==='xray'){s.scans[target]=s.order[target]!=='E';e.target=target;e.attack=s.scans[target];}
      if(kind==='heal'){s.hp++;e.recovered=1;}
      if(kind==='recharge')s.r++;
      s.inventory[kind]--;s.pendingItems.push(e);return H.copy(e);
    }
    phase();
    return {view,act,item,next(){if(s.stage!=='result')throw Error('結果確認後に進めます。');if(s.turn===s.order.length-1){archive();phase();}else{s.turn++;s.stage='action';s.last=null;}},debug:()=>H.copy({seed,config,state:s}),export:()=>H.copy({version:'4.0',seed,config,state:s})};
  };
})(globalThis.HB=globalThis.HB||{});
