import {test,expect} from '@playwright/test';import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';
const url=pathToFileURL(resolve(import.meta.dirname,'../index.html')).href;
test('direct-file game, victory, defeat, restart and debug isolation',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await expect(page.locator('.turn')).toHaveCount(await page.locator('.turn').count());await expect(page.locator('.debug')).toHaveCount(0);await page.screenshot({path:'ver4.0/test-results/desktop.png',fullPage:true});
 await page.locator('[data-do=debug]').click();for(const [k,v] of Object.entries({minTurns:'3',maxTurns:'3',minAttacks:'3',maxAttacks:'3',goldenChance:'0',minItems:'3',maxItems:'3',itemWeights:'0,0,1'}))await page.locator(`[name=${k}]`).fill(v);await page.locator('#settings .primary').click();await page.locator('[data-do=debug]').click();
 for(let i=0;i<3;i++){if(i){await page.locator('[data-do=next]').click();await page.locator('[data-item=recharge]').click();}await page.locator('[data-action=counter]').click();}
 await expect(page.locator('.end.won')).toBeVisible();await page.screenshot({path:'ver4.0/test-results/victory.png',fullPage:true});await page.locator('.end [data-do=restart]').click();await page.locator('[data-do=restart-confirm]').click();
 for(let i=0;i<3;i++){await page.locator('[data-action=none]').click();if(i<2)await page.locator('[data-do=next]').click();}await expect(page.locator('.end.lost')).toBeVisible();expect(errors).toEqual([]);
});
test('mobile, future xray and masked golden attack',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(url);await page.locator('[data-do=debug]').click();await page.locator('[name=itemWeights]').fill('1,0,0');await page.locator('[name=goldenChance]').fill('100');await page.locator('#settings .primary').click();await page.locator('[data-do=debug]').click();await page.locator('[data-item=xray]').click();await page.locator('[data-do=scan]').last().click();await expect(page.locator('.scanned')).toHaveCount(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'ver4.0/test-results/mobile.png',fullPage:true});
});
