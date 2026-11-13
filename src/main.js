(function(H){
  const app=document.querySelector('#app');let game=H.create({seed:crypto.randomUUID?.()||Date.now()}),debug=false,modal=null,notice='';
  function render(){const v=game.view();app.innerHTML=H.render(v,debug)+(debug?H.debugPanel(game.debug()):'')+(notice?`<p class="notice" role="status">${H.esc(notice)} <button data-do="dismiss">×</button></p>`:'');
    if(modal){const dialog=document.createElement('dialog');dialog.innerHTML=modal==='help'?`<small>PARTICIPANT GUIDE</small><h2>ハートを守り、ハンマーを壊す。</h2><p>あなたとハンマーのHPは3。先に相手を0にすれば勝利です。</p><p>毎ターン、何も置かない・シールド・カウンターRを選びます。攻撃時にRを置けば無傷で反撃。金の攻撃は被害も反撃も2倍です。</p><p>シールドは攻撃数−1個、Rは1個を毎フェーズ支給。空振りでも消費し、持ち越せません。</p><p>レントゲンは任意の未実行ターンを検査します。攻撃ありでも通常か金かは分かりません。HP回復は上限3、リチャージはRが0のとき使用できます。</p><p>アイテムは毎フェーズ2〜3個支給（初期設定）、持ち越し可能。行動前なら複数使用できます。</p><p>確率は現在までに分かっている情報から算出します。未来の攻撃順序は、あなたの選択によって変更されません。</p><button data-do="close" class="primary">確認しました</button>`:modal==='restart'?`<h2>新しい試行を開始しますか？</h2><p>進行中の記録はリセットされます。</p><button data-do="close" class="secondary">キャンセル</button><button data-do="restart-confirm" class="primary">新しい試行</button>`:`<small>X-RAY INSPECTION</small><h2>どのターンを調べますか？</h2><p>通常攻撃とゴールデン攻撃は区別しません。</p><div class="scan-targets">${Array.from({length:v.n},(_,i)=>i>=v.turn&&v.scans[i]===undefined?`<button class="secondary" data-do="scan" data-id="${i}">ターン ${i+1}</button>`:'').join('')||'<p>未検査のターンはありません。</p>'}</div><button data-do="close" class="ghost">キャンセル</button>`;app.append(dialog);dialog.showModal();dialog.addEventListener('cancel',e=>{e.preventDefault();modal=null;render();});}
  }
  app.addEventListener('click',e=>{const b=e.target.closest('[data-do]');if(!b||b.disabled)return;const cmd=b.dataset.do;try{
    if(cmd==='act')game.act(b.dataset.action);
    if(cmd==='next')game.next();
    if(cmd==='item'){if(b.dataset.item==='xray')modal='scan';else{game.item(b.dataset.item);notice=H.names[b.dataset.item]+'を使用しました。';}}
    if(cmd==='target'){if(game.view().inventory.xray&&game.view().stage==='action')modal='scan';else notice='レントゲンで未実行ターンを調べられます。';}
    if(cmd==='scan'){game.item('xray',Number(b.dataset.id));modal=null;}
    if(cmd==='help')modal='help';if(cmd==='close')modal=null;if(cmd==='restart')modal='restart';
    if(cmd==='restart-confirm'){game=H.create({config:game.debug().config,seed:crypto.randomUUID?.()||Date.now()});modal=null;notice='';}
    if(cmd==='debug')debug=!debug;if(cmd==='dismiss')notice='';
    if(cmd==='export'){const blob=new Blob([JSON.stringify(game.export(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='heartbox-v4-record.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    render();if(cmd==='debug'&&debug)document.querySelector('.debug').scrollIntoView();
  }catch(err){notice=err.message;render();}});
  app.addEventListener('submit',e=>{if(e.target.id!=='settings')return;e.preventDefault();try{const fd=new FormData(e.target),config={...game.debug().config};for(const k of ['minTurns','maxTurns','minAttacks','maxAttacks','cooldown','minItems','maxItems','capacity'])config[k]=Number(fd.get(k));config.goldenChance=Number(fd.get('goldenChance'))/100;config.personality=fd.get('personality');config.goldenShield=fd.has('goldenShield');config.weights=Object.fromEntries(['impatient','standard','patient'].map(k=>[k,String(fd.get(k)).split(',').map(Number)]));config.itemWeights=String(fd.get('itemWeights')).split(',').map(Number);game=H.create({config,seed:fd.get('seed')||Date.now()});notice='設定を適用しました。';render();}catch(err){notice=err.message;render();}});
  render();
})(globalThis.HB);
