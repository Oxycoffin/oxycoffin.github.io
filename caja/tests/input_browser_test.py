"""Mobile/input/storage regression checks. Run: python caja/tests/input_browser_test.py.
Optional: CAJA_PREVIOUS_ROOT=/path/to/previous/repo also tests a live PWA upgrade.
Requires Playwright and Chromium (CHROMIUM_PATH or Playwright's installed browser).
"""
import functools
import json
import os
import re
from pathlib import Path
import shutil
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from contextlib import contextmanager
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
KEY = 'caja-clara.'

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

@contextmanager
def server(root):
    http = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(root)))
    thread = threading.Thread(target=http.serve_forever, daemon=True)
    thread.start()
    try:
        yield f'http://127.0.0.1:{http.server_port}/caja/'
    finally:
        http.shutdown()
        http.server_close()
        thread.join()

def snapshot(page):
    return page.evaluate('Object.fromEntries(Object.entries(localStorage))')

def seed(page, step=10, raw='', tare=0):
    page.evaluate('''([step,raw,tare])=>{
      const d={...CajaCore.newDraft(),step,started:true};
      d.taras['coins-200']=tare;
      if(step===1)d.pabloRaw=raw;
      else if(step===2)d.victorRaw=raw;
      else d.counts[CajaCore.DENOMS[step-3].key]=raw;
      localStorage.setItem('caja-clara.draft.v2',JSON.stringify(d));
    }''', [step,raw,tare])
    page.reload()
    expect(page.locator('#entry')).to_be_visible()

def get_draft(page):
    return page.evaluate("JSON.parse(localStorage.getItem('caja-clara.draft.v2'))")

def tap_keys(page, chars):
    for char in chars:
        page.locator(f'[data-key="{char}"]').tap()


class OfflinePage:
    """No network/navigation: real Chromium DOM/touch, explicitly simulated Storage.

    A fresh page for each reload avoids carrying over event listeners. This mode
    tests boot/recovery behavior but does NOT claim a real origin/PWA upgrade.
    """
    def __init__(self, context):
        self.context=context
        self.page=context.new_page()
        self.listeners=[]
    def on(self, event, callback):
        self.listeners.append((event,callback))
        self.page.on(event,callback)
    def goto(self, _url):
        self.load({})
    def load(self, saved):
        html=(ROOT/'caja/index.html').read_text()
        html=re.sub(r'<script[^>]+src="[^"]+"[^>]*></script>', '', html)
        html=re.sub(r'<link[^>]+(?:stylesheet|manifest)[^>]*>', '', html)
        styles=(ROOT/'caja/styles.css').read_text()+(ROOT/'caja/input.css').read_text()
        storage="""const initial=INITIAL;
          const store=Object.assign(Object.create({
            getItem(k){return Object.hasOwn(this,k)?this[k]:null},
            setItem(k,v){Object.defineProperty(this,k,{value:String(v),enumerable:true,writable:true,configurable:true})},
            removeItem(k){delete this[k]},clear(){Object.keys(this).forEach(k=>delete this[k])},
            key(i){return Object.keys(this)[i]??null},get length(){return Object.keys(this).length}
          }),initial);
          Object.defineProperty(window,'localStorage',{value:store,configurable:true});""".replace('INITIAL',json.dumps(saved))
        scripts=''.join('<script>'+text+'</script>' for text in [storage]+[(ROOT/'caja'/name).read_text() for name in ['core.js','illustrations.js','app.js']])
        html=html.replace('</head>','<style>'+styles+'</style></head>').replace('</body>',scripts+'</body>')
        self.page.set_content(html)
    def reload(self):
        saved=snapshot(self.page)
        size=self.page.viewport_size
        old=self.page
        self.page=self.context.new_page()
        self.page.set_viewport_size(size)
        for event,callback in self.listeners:
            self.page.on(event,callback)
        old.close()
        self.load(saved)
    def __getattr__(self,name):
        return getattr(self.page,name)

def run():
    results=[]
    with server(ROOT) as url, sync_playwright() as pw:
        executable=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
        browser=pw.chromium.launch(**({'executable_path':executable} if executable else {}), args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,locale='es-ES',reduced_motion='reduce',service_workers='block')
        offline=os.environ.get('CAJA_OFFLINE_HARNESS')=='1'
        page=OfflinePage(context) if offline else context.new_page()
        errors=[]
        page.on('pageerror',lambda error: errors.append(str(error)))
        page.goto(url)

        seed(page,1,'0')
        expect(page.locator('#entry')).to_have_value('')
        tap_keys(page,'08')
        expect(page.locator('#entry')).to_have_value('8')
        page.locator('[data-action="clear-entry"]').tap()
        tap_keys(page,',05,')
        expect(page.locator('#entry')).to_have_value('0,05')
        results.append('zero replacement; leading/duplicate decimal; touch keypad')

        page.locator('[data-action="clear-entry"]').tap()
        tap_keys(page,'120,5+80,25+49,25')
        expect(page.locator('#entryHelp')).to_contain_text('Σ 250')
        assert page.locator('#runningTotal').get_attribute('data-cents')=='-25000'
        page.locator('#nextButton').tap()
        assert get_draft(page)['pabloRaw']=='250'
        page.locator('[data-action="back"]').tap()
        tap_keys(page,'+5')
        expect(page.locator('#entry')).to_have_value('250+5')
        page.locator('#entry').press('Enter')
        assert get_draft(page)['pabloRaw']=='255'
        results.append('addition, live subtraction, Next/Enter normalization, extend selected result')

        seed(page,10,'100,125+50.375+19.5')
        assert page.locator('#runningTotal').get_attribute('data-cents')=='4000'
        page.locator('#nextButton').tap()
        assert get_draft(page)['counts']['coins-200']=='170'
        page.locator('[data-action="back"]').tap()
        expect(page.locator('#entry')).to_have_value('170')
        results.append('weighted addition rounds coins after summing; back restores result')

        seed(page,10,'30+75',20)
        assert page.locator('#runningTotal').get_attribute('data-cents')=='2000'
        expect(page.locator('#entryHelp')).to_contain_text('una sola vez')
        page.locator('#nextButton').tap()
        assert get_draft(page)['counts']['coins-200']=='105'
        seed(page,10,'',20)
        tap_keys(page,'5+15')
        expect(page.locator('#entry')).to_have_value('5+15')
        page.locator('#nextButton').tap()
        assert get_draft(page)['counts']['coins-200']=='20'
        results.append('existing single-tare semantics, visible explanation, below-tare partial sums can continue')

        seed(page,10,'100+')
        before=snapshot(page)
        expect(page.locator('#nextButton')).to_be_disabled()
        page.locator('#entry').press('Enter')
        assert get_draft(page)['step']==10
        page.reload()
        assert snapshot(page)==before
        expect(page.locator('#entry')).to_have_value('100+')
        page.locator('#entry').evaluate('(el)=>{el.focus();el.setSelectionRange(el.value.length,el.value.length)}')
        tap_keys(page,'5')
        page.locator('#nextButton').tap()
        assert get_draft(page)['counts']['coins-200']=='105'
        results.append('incomplete expression survives Enter/reload and can be completed')

        for raw in ['1++2','10-2','2*3','-5','1e3','5.0001']:
            seed(page,10,raw)
            expect(page.locator('#nextButton')).to_be_disabled()
            page.locator('#entry').press('Enter')
            assert get_draft(page)['counts']['coins-200']==raw
        results.append('invalid inputs blocked without discarding input')

        seed(page,3,'2+3')
        expect(page.locator('[data-key=","]')).to_have_count(0)
        page.locator('#nextButton').tap()
        assert get_draft(page)['counts']['bills-50000']=='5'
        results.append('unit sums and decimal-disabled keypad')

        page.evaluate('''()=>{
          const d={...CajaCore.newDraft(),step:10,started:true};
          d.counts['bills-5000']='7';d.counts['coins-200']='105';d.taras['coins-200']=20;
          const old=CajaCore.record({...d,id:'existing',date:'2026-09-12'},'2026-09-12T20:00:00Z');
          localStorage.setItem('caja-clara.history.v2',JSON.stringify([old]));
          localStorage.setItem('caja-clara.draft.v2',JSON.stringify(d));
          localStorage.setItem('caja-clara.settings.v2',JSON.stringify({expectedRaw:'350',coinMode:'weight',taras:{'coins-200':20}}));
          localStorage.setItem('caja-clara.language',JSON.stringify('es'));
          localStorage.setItem('caja-clara.draft.v1','corrupt old draft, never use over valid v2');
          localStorage.setItem('unrelated.app','keep me');
        }''')
        before=snapshot(page)
        page.reload()
        assert snapshot(page)==before
        assert get_draft(page)['counts']['coins-200']=='105'
        expect(page.locator('#storageWarning')).to_be_hidden()
        page.locator('#historyButton').tap()
        expect(page.locator('.history-item')).to_have_count(1)
        page.locator('#homeButton').tap()
        assert snapshot(page)==before
        results.append('v2 history, unfinished draft, tares, language and unrelated keys unchanged byte-for-byte; corrupt v1 ignored')

        page.locator('#settingsButton').tap()
        zero=page.locator('input[name="coins-100"]')
        expect(zero).to_have_value('')
        expect(zero).to_have_attribute('placeholder','0')
        nonzero=page.locator('input[name="coins-200"]')
        nonzero.tap()
        nonzero.press_sequentially('45')
        expect(nonzero).to_have_value('45')
        nonzero.press('Enter')
        expect(zero).to_be_focused()
        zero.press_sequentially('12,5')
        page.locator('[data-action="settings-save"]').click()
        now=snapshot(page)
        assert now[KEY+'history.v2']==before[KEY+'history.v2']
        assert get_draft(page)['taras']['coins-200']==20
        settings=json.loads(now[KEY+'settings.v2'])
        assert settings['taras']['coins-200']==45 and settings['taras']['coins-100']==12.5
        results.append('blank tare placeholders, one-tap replacement, keyboard Next, settings save preserves current/historical tares')

        seed(page,17,'11.5+11.5')
        page.locator('#nextButton').tap()
        page.locator('#saveButton').tap()
        rows=json.loads(snapshot(page)[KEY+'history.v2'])
        assert rows[0]==json.loads(before[KEY+'history.v2'])[0]
        assert rows[-1]['counts']['coins-1']=='23'
        assert len(rows)==2
        results.append('save appends normalized sum and preserves old record')

        # Long sums must not hide Next, even on narrow/small mobile viewports.
        for width,height in [(320,568),(360,640),(390,844),(430,932),(844,390),(1280,900)]:
            page.set_viewport_size({'width':width,'height':height})
            seed(page,10,'100,125+50.375+19.5',20)
            for language in ['es','en']:
                if page.locator('html').get_attribute('lang')!=language:
                    page.locator('#languageButton').tap()
                rect=page.locator('#nextButton').bounding_box()
                assert rect and rect['y']+rect['height']<=height+1,(width,height,language,rect)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,height)
            if width==390:
                page.screenshot(path=str(Path(tempfile.gettempdir())/'caja-input-mobile.png'))
        results.append('12 ES/EN layouts: 320px to desktop, portrait and landscape; Next stays visible')
        assert not errors, errors
        context.close()

        previous=os.environ.get('CAJA_PREVIOUS_ROOT')
        if previous and not offline:
            with tempfile.TemporaryDirectory() as folder:
                site=Path(folder)
                shutil.copytree(Path(previous)/'caja',site/'caja')
                with server(site) as old_url:
                    ctx=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,locale='es-ES',reduced_motion='reduce')
                    p=ctx.new_page();p.goto(old_url)
                    p.evaluate('navigator.serviceWorker.ready')
                    p.wait_for_function('navigator.serviceWorker.controller!==null')
                    seed(p,10,'105',20)
                    p.evaluate('''()=>{
                        const d=JSON.parse(localStorage.getItem('caja-clara.draft.v2'));
                        localStorage.setItem('caja-clara.history.v2',JSON.stringify([CajaCore.record(d)]));
                        localStorage.setItem('caja-clara.settings.v2',JSON.stringify({expectedRaw:'350',coinMode:'weight',taras:d.taras}));
                        localStorage.setItem('unrelated.app','keep');
                    }''')
                    original=snapshot(p)
                    shutil.copytree(ROOT/'caja',site/'caja',dirs_exist_ok=True)
                    p.evaluate('navigator.serviceWorker.getRegistration().then(r=>r.update())')
                    p.wait_for_function("caches.keys().then(k=>k.includes('caja-clara-v7')&&!k.includes('caja-clara-v6'))")
                    p.reload();expect(p.locator('[data-key="+"]')).to_be_visible()
                    assert snapshot(p)==original
                    ctx.set_offline(True)
                    p.reload();expect(p.locator('[data-key="+"]')).to_be_visible()
                    assert snapshot(p)==original
                    results.append('actual v6→v7 service-worker upgrade AND offline reload preserve all localStorage byte-for-byte')
                    ctx.close()
        browser.close()
    for result in results:
        print('PASS:',result)
    print(f'{len(results)} browser scenarios passed')
    if offline:
        print('Mode: offline DOM/touch harness with simulated Storage; real PWA upgrade not executed.')

if __name__=='__main__':
    run()
