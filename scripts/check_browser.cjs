const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.goto('file://'+path.resolve('web/index.html'));await page.waitForFunction(()=>globalThis.QUIET_DATA&&document.querySelectorAll('.signal').length===3);
 assert.equal(await page.locator('#results-body tr').count(),8);
 await page.screenshot({path:'results/desktop.png',fullPage:true});
 await page.locator('#run').click();assert(await page.locator('#outcome').isVisible());assert.equal(await page.locator('#timeline-body tr').count(),8);
 const same=await page.locator('#outcome').textContent();await page.locator('#run').click();assert.equal(await page.locator('#outcome').textContent(),same);
 assert.equal(await page.locator('#companion-select option').count(),10);
 for(const pet of ['piko','aster','nacre','bookworm','ajita','batrina','hel','jayke','ochre','buer']){
   await page.locator('#companion-select').selectOption(pet);
   assert.equal(await page.locator('#outcome').textContent(),same);
 }
 await page.locator('#theme').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 assert.equal(await page.locator('#outcome').textContent(),same);await page.locator('#theme').click();
 await page.locator('#companions summary').click();await page.locator('[data-pet="ochre"]').click();
 await page.locator('[data-pet="buer"]').focus();await page.keyboard.press('Enter');
 assert.match(await page.locator('#pet-name').textContent(),/Buer/);
 await page.screenshot({path:'results/companions.png',fullPage:true});
 await page.locator('#companions summary').click();

 await page.locator('#world').selectOption('complementarity');await page.locator('#policy').selectOption('myopic');await page.locator('#run').click();assert.match(await page.locator('#silence').textContent(),/silence/);
 await page.locator('#policy').selectOption('optimal');await page.locator('#run').click();assert.equal(await page.locator('.signal.read').count(),2);
 await page.screenshot({path:'results/complementarity-replay.png',fullPage:true});
 await page.locator('#world').selectOption('disconnected');await page.locator('#policy').selectOption('information');await page.locator('#run').click();assert.match(await page.locator('#outcome').textContent(),/Reserve → Reserve/);
 await page.locator('#world').selectOption('alignment');await page.locator('#policy').selectOption('optimal');await page.locator('#cost').selectOption('10');await page.locator('#run').click();assert.equal(await page.locator('.signal.read').count(),0);
 await page.locator('#cost').selectOption('0.2');await page.locator('#policy').selectOption('manual');await page.locator('.signal').nth(0).click();await page.locator('.signal').nth(1).click();assert.match(await page.locator('#selection-note').textContent(),/Budget full/);await page.locator('#run').click();assert.equal(await page.locator('.signal.read').count(),1);
 await page.locator('#budget').fill('0');await page.locator('#run').click();assert.equal(await page.locator('.signal.read').count(),0);
 await page.locator('#budget').fill('3');await page.locator('#policy').selectOption('random');await page.locator('#run').click();assert.equal(await page.locator('.signal.read').count(),3);
 await page.locator('#next').click();assert(!(await page.locator('#outcome').isVisible()));
 await page.locator('#world').selectOption('distraction');await page.locator('#policy').selectOption('myopic');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'results/mobile.png',fullPage:true});
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow at ${width}`);}
 assert.equal(await page.locator('#motion').getAttribute('aria-pressed'),'true');
 await page.locator('#world').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'budget');
 await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#budget').inputValue(),'2');
 await page.goto('file://'+path.resolve('web/research.html'));
 assert.equal(await page.locator('h1').count(),1);
 assert.deepEqual(errors,[]);assert(requests.every(u=>u.startsWith('file:')||u.startsWith('data:')));
 fs.writeFileSync('results/browser_checks.json',JSON.stringify({engine:'Chromium',checks:['initial render','8 policies','same-world deterministic replay','myopic complementarity silence','optimal paired signals','disconnected gate','expensive silence','manual budget','zero budget','random full budget','new-world reset','320/390/768/1440 no horizontal overflow','reduced motion','keyboard range','research note','no page errors','no external requests'],errors},null,2)+'\n');
 await browser.close();console.log('Browser checks passed. Desktop, mobile and replay screenshots saved.');
})().catch(e=>{console.error(e);process.exit(1)});
