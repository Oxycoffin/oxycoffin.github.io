"""Run with a local server: python -m http.server 8765 (repository root).
Requires Python playwright and Chromium. No browser packages are needed by the app.
"""
import json
import re
import os
import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright

MEMORY = os.environ.get('CAJA_TEST_IN_MEMORY') == '1'
ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('CAJA_TEST_URL', 'http://127.0.0.1:8765/caja/')
OUT = Path(os.environ.get('CAJA_SCREENSHOT_DIR','/mnt/data/cajaclara-work/screenshots'))
OLD_CSV = 'Fecha;Nombre;Billetes EUR;Monedas EUR;Total EUR;Esperado EUR;Diferencia EUR\n2026-09-12T20:00:00.000Z;Cierre anterior;300;33;333;350;-17'

class WizardTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        OUT.mkdir(parents=True, exist_ok=True)
    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.pw.stop()
    def setUp(self):
        self.context = self.browser.new_context(viewport={'width':390,'height':844}, locale='es-ES', timezone_id='Europe/Madrid')
        self.errors=[]; self.page=None
        self.load()
        self.page.locator('[data-action=start]').wait_for()
    def load(self):
        if not MEMORY:
            if self.page: self.page.reload()
            else:
                self.page=self.context.new_page()
                self.page.on('pageerror',lambda e:self.errors.append(str(e)))
                self.page.goto(BASE)
            return
        data=self.page.evaluate('window.__localData') if self.page else {}
        viewport=self.page.viewport_size if self.page else {'width':390,'height':844}
        if self.page:self.page.close()
        self.page=self.context.new_page(); self.page.set_viewport_size(viewport)
        self.page.on('pageerror',lambda e:self.errors.append(str(e)))
        html=(ROOT/'index.html').read_text()
        html=re.sub(r'<script[^>]*>.*?</script>', '',html,flags=re.S)
        html=re.sub(r'<link[^>]+>', '',html)
        html=html.replace('</head>','<style>'+(ROOT/'styles.css').read_text()+'</style></head>')
        self.page.set_content(html)
        self.page.evaluate('''data=>{window.__localData=data;class MemoryStorage{getItem(k){return Object.hasOwn(data,k)?data[k]:null}setItem(k,v){data[k]=String(v)}removeItem(k){delete data[k]}clear(){Object.keys(data).forEach(k=>delete data[k])}}Object.defineProperty(window,'Storage',{value:MemoryStorage,configurable:true});Object.defineProperty(window,'localStorage',{value:new MemoryStorage(),configurable:true});}''',data)
        self.page.add_script_tag(content=(ROOT/'core.js').read_text())
        self.page.add_script_tag(content=(ROOT/'app.js').read_text())
    def tearDown(self):
        self.assertEqual(self.errors,[])
        self.context.close()
    def click(self,action): self.page.locator(f'[data-action="{action}"]').click()
    def fill(self,value): self.page.locator('#entry').fill(value)
    def finish(self):
        while self.page.locator('#entry').count(): self.click('next')
    def cash350(self):
        self.click('start'); self.click('next'); self.click('next')
        # 500, 200, 100 -> 50
        for _ in range(3):self.click('next')
        self.fill('7'); self.click('next'); self.finish()
    def test_01_end_to_end_tare_envelopes_save_resume(self):
        self.page.screenshot(path=str(OUT/'01-setup.png'),full_page=True)
        self.click('settings')
        self.page.locator('[name="coins-200"]').fill('20')
        self.click('settings-save');self.click('start')
        self.fill('100'); self.click('next'); self.fill('50'); self.click('next')
        for _ in range(3):self.click('next')
        self.fill('10');self.click('next');self.click('back');self.assertEqual(self.page.locator('#entry').input_value(),'10')
        self.click('next')
        for _ in range(3):self.click('next')
        self.fill('105')
        self.assertIn('10 monedas',self.page.locator('#entryHelp').inner_text())
        self.assertIn('Tara 20',self.page.locator('#entryHelp').inner_text())
        self.page.screenshot(path=str(OUT/'02-count.png'))
        self.load();self.assertEqual(self.page.locator('#entry').input_value(),'105')
        self.finish()
        self.assertIn('370,00',self.page.locator('#remainingTotal').inner_text())
        self.assertIn('Sobran',self.page.locator('#difference').inner_text())
        self.click('save');self.assertTrue(self.page.locator('#saveButton').is_disabled())
        records=self.page.evaluate('JSON.parse(localStorage.getItem("caja-clara.history.v2"))')
        self.assertEqual(len(records),1);self.assertEqual(records[0]['total'],37000);self.assertNotIn('name',records[0])
        self.assertEqual(records[0]['taras']['coins-200'],20)
        self.page.screenshot(path=str(OUT/'03-result.png'),full_page=True)
        self.click('new');self.assertEqual(self.page.locator('#expected').input_value(),'350')
        self.click('start');self.assertEqual(self.page.locator('#entry').input_value(),'')
        d=self.page.evaluate('JSON.parse(localStorage.getItem("caja-clara.draft.v2"))');self.assertEqual(d['taras']['coins-200'],20)
    def test_02_no_scroll_or_offscreen_controls(self):
        self.click('start')
        for width,height in [(390,844),(375,667),(320,568),(844,390),(1280,800)]:
            self.page.set_viewport_size({'width':width,'height':height})
            for step in [1,10,17]:
                self.page.evaluate('(step)=>{let d=JSON.parse(localStorage.getItem("caja-clara.draft.v2"));d.step=step;localStorage.setItem("caja-clara.draft.v2",JSON.stringify(d))}',step)
                self.load()
                next_rect=self.page.locator('#nextButton').bounding_box();entry_rect=self.page.locator('#entry').bounding_box()
                self.assertLessEqual(next_rect['y']+next_rect['height'],height+1,(width,height,step,next_rect))
                self.assertGreaterEqual(entry_rect['y'],0)
                self.assertEqual(self.page.evaluate('document.documentElement.scrollWidth<=innerWidth'),True)
                self.assertEqual(self.page.locator('#entry').get_attribute('inputmode'),'none')
            self.page.screenshot(path=str(OUT/f'layout-{width}x{height}.png'))
    def test_03_import_preview_duplicate_and_no_names(self):
        self.click('history')
        self.page.locator('#csvFile').set_input_files({'name':'historial.csv','mimeType':'text/csv','buffer':OLD_CSV.encode()})
        self.page.locator('[data-action=import-confirm]').wait_for()
        self.assertEqual(self.page.evaluate('localStorage.getItem("caja-clara.history.v2")'),None)
        self.click('import-confirm')
        self.assertEqual(self.page.locator('.history-item').count(),1)
        self.assertNotIn('Cierre anterior',self.page.locator('#app').inner_text())
        self.page.locator('#csvFile').set_input_files({'name':'historial.csv','mimeType':'text/csv','buffer':OLD_CSV.encode()})
        self.page.locator('[data-action=import-confirm]').wait_for()
        self.assertTrue(self.page.locator('[data-action=import-confirm]').is_disabled())
        self.assertIn('duplicados',self.page.locator('#importPreview').inner_text())
        self.page.screenshot(path=str(OUT/'04-history-import.png'),full_page=True)
    def test_04_old_local_storage_migration_preserves_original(self):
        old={'id':'old','createdAt':'2026-09-12T20:00:00Z','name':'Ignore me','bills':30000,'coins':3300,'total':33300,'expected':35000,'difference':-1700,'coinMode':'quantity','counts':{}}
        self.page.evaluate('(old)=>{localStorage.clear();localStorage.setItem("caja-clara.history.v1",JSON.stringify([old]));localStorage.setItem("caja-clara.draft.v1",JSON.stringify({coinMode:"weight",counts:{"coins-200":"85"},expectedRaw:"350"}));}',old)
        self.load()
        self.assertIsNotNone(self.page.evaluate('localStorage.getItem("caja-clara.history.v1")'))
        self.assertEqual(self.page.evaluate('JSON.parse(localStorage.getItem("caja-clara.history.v2"))[0].total'),33300)
        self.click('history');self.assertEqual(self.page.locator('.history-item').count(),1)
    def test_05_invalid_numbers_block_navigation(self):
        self.click('start');self.fill('-1');self.assertTrue(self.page.locator('#nextButton').is_disabled())
        self.fill('12abc');self.assertTrue(self.page.locator('#nextButton').is_disabled())
        self.fill('12,50');self.assertFalse(self.page.locator('#nextButton').is_disabled())
    def test_06_keypad_and_enter_and_back(self):
        self.click('start')
        for key in ['1','2',',','5']:self.page.locator(f'[data-key="{key}"]').click()
        self.assertEqual(self.page.locator('#entry').input_value(),'12,5')
        self.page.locator('[data-key="⌫"]').click();self.assertEqual(self.page.locator('#entry').input_value(),'12,')
        self.page.locator('#entry').press('Enter');self.assertIn('2-Victor',self.page.locator('#pageHeading').inner_text())
        self.click('back');self.assertEqual(self.page.locator('#entry').input_value(),'12,')
        self.click('clear-entry');self.assertEqual(self.page.locator('#entry').input_value(),'')
    def test_07_confirm_dialog_and_single_record_update(self):
        self.cash350();self.click('save');self.click('edit-pablo');self.fill('10');self.click('next');self.click('save')
        records=self.page.evaluate('JSON.parse(localStorage.getItem("caja-clara.history.v2"))');self.assertEqual(len(records),1);self.assertEqual(records[0]['total'],34000)
        self.click('history');self.page.locator('.history-item summary').first.click();self.click('delete')
        self.page.locator('#dialogCancel').click();self.assertEqual(self.page.locator('.history-item').count(),1)
        self.click('delete');self.page.locator('#dialogConfirm').click();self.page.locator('.history-item').wait_for(state='detached');self.assertEqual(self.page.locator('.history-item').count(),0)
    def test_08_storage_failure_does_not_claim_saved(self):
        self.cash350()
        self.page.evaluate('const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==="caja-clara.history.v2")throw new DOMException("quota","QuotaExceededError");return original.call(this,k,v);}');self.click('save')
        self.assertFalse(self.page.locator('#saveButton').is_disabled());self.assertTrue(self.page.locator('#storageWarning').is_visible())
    def test_09_language_and_local_day(self):
        self.click('language');self.assertEqual(self.page.locator('html').get_attribute('lang'),'en');self.assertIn('Start counting',self.page.locator('[data-action=start]').inner_text())
        self.load();self.assertEqual(self.page.locator('html').get_attribute('lang'),'en')
        self.page.locator('#countDate').fill('2026-09-11');self.cash350();self.click('save')
        self.assertEqual(self.page.evaluate('JSON.parse(localStorage.getItem("caja-clara.history.v2"))[0].date'),'2026-09-11')
    @unittest.skipIf(MEMORY, "Service worker needs a real HTTP origin; run separately without CAJA_TEST_IN_MEMORY")
    def test_10_offline_reload_and_unrelated_cache(self):
        self.page.evaluate('caches.open("other-tool-cache").then(c=>c.put("/other",new Response("keep")))')
        self.page.evaluate('navigator.serviceWorker.ready')
        self.click('start');self.fill('25');self.context.set_offline(True);self.page.reload()
        self.assertEqual(self.page.locator('#entry').input_value(),'25')
        self.assertIn('other-tool-cache',self.page.evaluate('caches.keys()'))
    def test_11_corrupt_history_is_not_overwritten(self):
        self.page.evaluate('localStorage.setItem("caja-clara.history.v2","not-json")');self.load();self.cash350();self.click('save')
        self.assertEqual(self.page.evaluate('localStorage.getItem("caja-clara.history.v2")'),'not-json')
        self.click('history');self.assertTrue(self.page.locator('[data-action=recover]').is_visible())

if __name__=='__main__': unittest.main(verbosity=2)
