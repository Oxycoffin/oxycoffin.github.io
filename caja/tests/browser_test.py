"""UI regression tests. Default: HTTP. CAJA_TEST_IN_MEMORY=1: injected DOM + fake Storage.
Requires Playwright and Chromium, not used by the application at runtime.
"""
from pathlib import Path
import os, re, json, unittest
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
MEMORY=os.environ.get('CAJA_TEST_IN_MEMORY')=='1'
URL=os.environ.get('CAJA_TEST_URL','http://127.0.0.1:8765/caja/')
OUT=Path(os.environ.get('CAJA_SCREENSHOT_DIR','/mnt/data/caja-release/screenshots'))
CSV='Fecha;Nombre;Billetes EUR;Monedas EUR;Total EUR;Esperado EUR;Diferencia EUR\n2026-09-12T20:00:00Z;Cierre anterior;300;33;333;350;-17'
class UI(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.pw=sync_playwright().start();cls.browser=cls.pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox']);OUT.mkdir(parents=True,exist_ok=True)
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.pw.stop()
 def setUp(self):
  self.context=self.browser.new_context(viewport={'width':390,'height':844},locale='es-ES',timezone_id='Europe/Madrid');self.page=None;self.errors=[];self.load()
 def tearDown(self):
  self.assertEqual(self.errors,[]);self.context.close()
 def load(self,data=None):
  if not MEMORY:
   if data is not None and self.page:self.page.evaluate('data=>{localStorage.clear();Object.entries(data).forEach(([k,v])=>localStorage.setItem(k,v))}',data)
   if self.page:self.page.reload()
   else:self.page=self.context.new_page();self.page.on('pageerror',lambda e:self.errors.append(str(e)));self.page.goto(URL)
   self.page.locator('#runningTotal').wait_for();return
  if data is None:data=self.page.evaluate('window.__data') if self.page else {}
  viewport=self.page.viewport_size if self.page else {'width':390,'height':844}
  if self.page:self.page.close()
  self.page=self.context.new_page();self.page.set_viewport_size(viewport);self.page.on('pageerror',lambda e:self.errors.append(str(e)))
  html=(ROOT/'index.html').read_text();html=re.sub(r'<script[^>]*>.*?</script>','',html,flags=re.S);html=re.sub(r'<link[^>]+>','',html)
  self.page.set_content(html);self.page.add_style_tag(content=(ROOT/'styles.css').read_text())
  self.page.evaluate('''data=>{window.__data=data;class MemoryStorage{getItem(k){return Object.hasOwn(data,k)?data[k]:null}setItem(k,v){data[k]=String(v)}removeItem(k){delete data[k]}clear(){Object.keys(data).forEach(k=>delete data[k])}}Object.defineProperty(window,'Storage',{value:MemoryStorage,configurable:true});Object.defineProperty(window,'localStorage',{value:new MemoryStorage(),configurable:true});}''',data)
  for f in ['core.js','illustrations.js','app.js']:self.page.add_script_tag(content=(ROOT/f).read_text())
 def click(self,a):self.page.locator(f'[data-action="{a}"]').first.click()
 def fill(self,v):self.page.locator('#entry').fill(v)
 def cents(self):return int(self.page.locator('#runningTotal').get_attribute('data-cents'))
 def records(self):return self.page.evaluate('JSON.parse(localStorage.getItem("caja-clara.history.v2"))')
 def finish(self):
  while self.page.locator('#entry').count():self.click('next')
 def at50(self):
  while self.page.locator('#pageHeading').inner_text()!='50 €':self.click('next')
 def test_01_direct_start_and_negative_live_balance(self):
  self.assertIn('1-Pablo',self.page.locator('#pageHeading').inner_text());self.assertEqual(self.page.locator('input[type=date],#countDate,#sessionName').count(),0)
  self.fill('100');self.assertEqual(self.cents(),-10000);self.click('next');self.fill('50');self.assertEqual(self.cents(),-15000)
  self.page.wait_for_timeout(600);self.page.screenshot(path=str(OUT/'envelopes-mobile.png'))
  self.at50();self.fill('1');self.assertEqual(self.cents(),-10000);self.fill('3');self.assertEqual(self.cents(),0);self.fill('10');self.assertEqual(self.cents(),35000)
  self.page.wait_for_timeout(600);self.page.screenshot(path=str(OUT/'notes-mobile.png'))
  self.finish();self.click('save');self.assertEqual(self.records()[0]['total'],35000);self.assertTrue(self.page.locator('#saveButton').is_disabled())
 def test_02_back_at_first_step_and_resume(self):
  self.assertTrue(self.page.locator('[data-action=back]').is_disabled());self.page.locator('#entry').press('Alt+ArrowLeft');self.assertIn('1-Pablo',self.page.locator('#pageHeading').inner_text())
  self.fill('100');self.click('next');self.fill('50');self.click('back');self.assertEqual(self.page.locator('#entry').input_value(),'100');self.load();self.assertEqual(self.page.locator('#entry').input_value(),'100');self.assertEqual(self.cents(),-15000)
 def test_03_local_save_date_not_stale_draft_date(self):
  self.fill('0');self.page.evaluate('let d=JSON.parse(localStorage.getItem("caja-clara.draft.v2"));d.date="2020-01-01";localStorage.setItem("caja-clara.draft.v2",JSON.stringify(d))');self.load();self.at50();self.fill('7');self.finish();self.click('save')
  r=self.records()[0];self.assertEqual(r['date'],self.page.evaluate('CajaCore.localDate()'));self.assertNotIn('name',r)
  self.click('edit-pablo');self.fill('10');self.click('next');self.page.evaluate('CajaCore.localDate=()=>"2030-01-01"');self.click('save');self.assertEqual(len(self.records()),1);self.assertEqual(self.records()[0]['date'],r['date'])
 def test_04_tare_and_mode_conversion_at_same_step(self):
  self.click('settings');self.page.locator('[name="coins-200"]').fill('20');self.click('settings-save')
  while self.page.locator('#pageHeading').inner_text()!='2 €':self.click('next')
  self.fill('105');self.assertEqual(self.cents(),2000);self.assertIn('10 monedas',self.page.locator('#entryHelp').inner_text());self.click('toggle-mode');self.assertEqual(self.page.locator('#entry').input_value(),'10');self.assertEqual(self.cents(),2000);self.click('toggle-mode');self.assertEqual(self.page.locator('#entry').input_value(),'105')
  self.page.wait_for_timeout(600);self.page.screenshot(path=str(OUT/'coins-mobile.png'))
 def test_05_settings_current_float_and_blank_reference(self):
  self.fill('100');self.click('settings');self.page.locator('[name=expected]').fill('400');self.click('settings-apply');self.page.locator('#dialogConfirm').click();self.page.wait_for_function('document.querySelector("#targetLabel").textContent.includes("400")');self.assertIn('400',self.page.locator('#targetLabel').inner_text());self.assertEqual(self.cents(),-10000)
  self.click('settings');self.page.locator('[name=expected]').fill('');self.click('settings-apply');self.page.locator('#dialogConfirm').click();self.page.wait_for_function('document.querySelector("#targetLabel").textContent.includes("Sin fondo")');self.assertIn('Sin fondo',self.page.locator('#targetLabel').inner_text())
 def test_06_validation_and_keypad(self):
  self.fill('12oops');self.assertTrue(self.page.locator('#nextButton').is_disabled());self.assertEqual(self.page.locator('#runningTotal').inner_text(),'—');self.click('clear-entry')
  for k in ['1','2',',','5']:self.page.locator(f'[data-key="{k}"]').click()
  self.assertEqual(self.page.locator('#entry').input_value(),'12,5');self.assertEqual(self.cents(),-1250);self.page.locator('#entry').press('Enter');self.assertIn('2-Victor',self.page.locator('#pageHeading').inner_text())
 def test_07_import_preview_and_duplicate_preservation(self):
  self.click('history');self.page.locator('#csvFile').set_input_files({'name':'history.csv','mimeType':'text/csv','buffer':CSV.encode()});self.page.locator('[data-action=import-confirm]').wait_for();self.assertIsNone(self.records());self.click('import-confirm');self.assertEqual(len(self.records()),1);self.assertNotIn('Cierre anterior',self.page.locator('#app').inner_text())
  self.page.locator('#csvFile').set_input_files({'name':'history.csv','mimeType':'text/csv','buffer':CSV.encode()});self.page.locator('[data-action=import-confirm]').wait_for();self.assertTrue(self.page.locator('[data-action=import-confirm]').is_disabled())
 def test_08_old_draft_zero_step_migration(self):
  old={'coinMode':'weight','counts':{'coins-200':'85'},'expectedRaw':'350'};self.load({'caja-clara.draft.v1':json.dumps(old)});self.assertEqual(self.cents(),2000)
  old2={'version':2,'id':'old','date':'2020-01-01','step':0,'coinMode':'quantity','counts':{'bills-5000':'7'},'taras':{},'expectedRaw':'350'};self.load({'caja-clara.draft.v2':json.dumps(old2)});self.assertIn('1-Pablo',self.page.locator('#pageHeading').inner_text());self.assertEqual(self.cents(),35000)
 def test_09_storage_failure_and_corrupt_history_not_overwritten(self):
  self.load({'caja-clara.history.v2':'not-json'});self.at50();self.fill('7');self.finish();self.click('save');self.assertEqual(self.page.evaluate('localStorage.getItem("caja-clara.history.v2")'),'not-json');self.assertFalse(self.page.locator('#saveButton').is_disabled())
  self.load({});self.at50();self.fill('7');self.finish();self.page.evaluate('const f=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==="caja-clara.history.v2")throw Error("quota");return f.call(this,k,v)}');self.click('save');self.assertFalse(self.page.locator('#saveButton').is_disabled());self.assertTrue(self.page.locator('#storageWarning').is_visible())
 def test_10_mobile_layout_no_scroll_no_overlap(self):
  for w,h in [(320,568),(360,640),(375,667),(390,664),(390,844),(430,932),(844,390),(667,375),(1280,800)]:
   self.page.set_viewport_size({'width':w,'height':h})
   for step in [1,3,10,17]:
    d=self.page.evaluate('CajaCore.newDraft()');d.update(step=step,pabloRaw='100',victorRaw='50');self.load({'caja-clara.draft.v2':json.dumps(d)})
    self.page.wait_for_timeout(50)
    rects=[self.page.locator(s).bounding_box() for s in ['#liveBoard','.step-heading','.entry-area','.keypad','.wizard-footer']]
    for r in rects:self.assertGreaterEqual(r['y'],0);self.assertLessEqual(r['y']+r['height'],h+1,(w,h,step,rects))
    self.assertLessEqual(rects[3]['y']+rects[3]['height'],rects[4]['y']+1,(w,h,step));self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    self.assertLessEqual(self.page.evaluate('document.querySelector("#app").scrollHeight-document.querySelector("#app").clientHeight'),1,(w,h,step))
   self.page.wait_for_timeout(600);self.page.screenshot(path=str(OUT/f'layout-{w}x{h}.png'))
 def test_11_board_visible_in_settings_history_and_review(self):
  self.fill('100');self.click('history');self.page.locator('#app').evaluate('e=>e.scrollTop=10000');self.assertTrue(self.page.locator('#runningTotal').is_visible());self.assertEqual(self.cents(),-10000)
  self.click('settings');self.page.locator('#app').evaluate('e=>e.scrollTop=10000');self.assertLess(self.page.locator('#runningTotal').bounding_box()['y'],200);self.click('wizard');self.assertEqual(self.page.locator('#entry').input_value(),'100')
 def test_12_reduced_motion_and_language(self):
  self.page.emulate_media(reduced_motion='reduce');self.click('next');self.assertEqual(self.page.locator('.envelope-body').evaluate('e=>getComputedStyle(e).animationName'),'none');self.fill('50');self.assertEqual(self.page.locator('#runningTotal').evaluate('e=>e.getAnimations().length'),0)
  self.click('language');self.assertEqual(self.page.locator('html').get_attribute('lang'),'en');self.assertIn('Till balance',self.page.locator('#liveBoard').inner_text());self.load();self.assertEqual(self.page.locator('html').get_attribute('lang'),'en')
 def test_13_new_count_resets_cash_not_tares(self):
  self.at50();self.fill('7');self.finish();self.click('save');self.click('new');self.assertEqual(self.cents(),0);self.assertEqual(self.page.locator('#entry').input_value(),'');self.assertTrue(self.page.locator('[data-action=back]').is_disabled())
 def test_14_switch_mode_and_tares_together_preserves_units(self):
  self.click('settings');self.page.locator('[name=mode]').select_option('quantity');self.click('settings-save')
  while self.page.locator('#pageHeading').inner_text()!='2 €':self.click('next')
  self.fill('10');self.click('settings');self.page.locator('[name=mode]').select_option('weight');self.page.locator('[name="coins-200"]').fill('20');self.click('settings-apply');self.page.locator('#dialogConfirm').click();self.assertEqual(self.page.locator('#entry').input_value(),'105');self.assertEqual(self.cents(),2000)
 @unittest.skipIf(MEMORY,'Real HTTP origin unavailable in injected DOM mode')
 def test_15_offline_reload(self):
  self.page.evaluate('navigator.serviceWorker.ready');self.fill('25');self.context.set_offline(True);self.page.reload();self.assertEqual(self.page.locator('#entry').input_value(),'25')
if __name__=='__main__':unittest.main(verbosity=2)
