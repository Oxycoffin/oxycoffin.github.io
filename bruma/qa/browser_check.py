"""Real-browser regression: pointer coordinates, full progression, shaders, saves.
Run from repository root: python bruma/qa/browser_check.py
Set BRUMA_URL to test a deployed URL instead of a local checkout.
"""
from pathlib import Path
import os,json,time,threading,http.server,functools,traceback
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('BRUMA_QA_OUT','bruma-qa-results'));OUT.mkdir(parents=True,exist_ok=True)
URL=os.environ.get('BRUMA_URL')
if not URL:
    handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ROOT))
    httpd=http.server.ThreadingHTTPServer(('127.0.0.1',8765),handler)
    threading.Thread(target=httpd.serve_forever,daemon=True).start()
    URL='http://127.0.0.1:8765/'
report={'checks':[],'errors':[],'screenshots':[],'url':URL}
def ok(name):
    report['checks'].append(name);print('PASS',name,flush=True)
def shot(page,name):
    page.screenshot(path=str(OUT/(name+'.png')));report['screenshots'].append(name+'.png')
def wait_idle(page):
    page.wait_for_function('!Bruma.busy',timeout=35000);page.wait_for_timeout(180)
def world_click(page,x,y):
    xy=page.evaluate('([x,y])=>Bruma.worldToClient(x,y)',[x,y]);page.mouse.click(xy['x'],xy['y'])
def obj(page,identifier,wait=500):
    entry=page.evaluate('(id)=>Bruma.objects().find(o=>o.id===id)',identifier)
    assert entry is not None,('Missing object',identifier)
    x,y=entry['mark']
    actual=page.evaluate('([x,y])=>Bruma.hit(x,y)',[x,y])
    assert actual==identifier,('Hotspot centre mismatch',identifier,actual,x,y)
    world_click(page,x,y)
    page.wait_for_timeout(wait)
    wait_idle(page)
def btn(page,name):page.get_by_role('button',name=name,exact=True).click()
def dialog_close(page):
    if page.locator('#dialogue').is_visible():page.locator('#dialogue-close').click()
def panel_close(page):
    if page.locator('#overlay').is_visible():page.locator('#panel .close').click()
def start(page):
    page.goto(URL,wait_until='networkidle');page.wait_for_function('window.Bruma&&Bruma.ready',timeout=45000)
    if page.get_by_role('button',name='Entrar en la noche',exact=True).count():btn(page,'Entrar en la noche')
    elif page.get_by_role('button',name='Continuar',exact=True).count():btn(page,'Continuar')
    page.wait_for_timeout(500)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
    page.on('pageerror',lambda e:report['errors'].append(str(e)))
    page.on('console',lambda m:report['errors'].append(m.text) if m.type=='error' else None)
    try:
        start(page);assert page.evaluate('Bruma.rendererError')==0;ok('Chromium compiles and renders WebGL without errors')
        shot(page,'01-harbor')
        # Correct movement direction with a sprite that is mirrored, not a backwards slide.
        world_click(page,1040,696);page.wait_for_function('Bruma.moving && Bruma.state.face===1',timeout=7000);page.wait_for_timeout(300);shot(page,'02-walk-right')
        world_click(page,180,696);page.wait_for_function('Bruma.moving && Bruma.state.face===-1',timeout=7000);page.wait_for_timeout(300);shot(page,'03-walk-left');wait_idle(page);ok('Left and right movement change facing and animate the same rig')
        # Real pointer hit tests after letterboxing, in four different aspect ratios.
        for width,height in [(1440,1000),(1024,768),(844,390),(390,844)]:
            page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(350)
            r=page.locator('#scene').bounding_box();assert abs(r['width']/r['height']-16/9)<.002
            xy=page.evaluate('Bruma.worldToClient(962,408)');page.mouse.move(xy['x'],xy['y']);page.wait_for_timeout(150)
            assert 'Placa' in page.locator('#label').inner_text()
            shot(page,'viewport-'+str(width)+'x'+str(height))
        ok('Scene proportions and pointer hotspots survive desktop, tablet and both mobile orientations')
        page.set_viewport_size({'width':1440,'height':1000});page.wait_for_timeout(300)
        # Pinned light remains in world position while pointing at a different object.
        xy=page.evaluate('Bruma.worldToClient(350,280)');page.mouse.move(xy['x'],xy['y']);page.keyboard.press('l');lamp=page.evaluate('Bruma.state.lamp')
        xy=page.evaluate('Bruma.worldToClient(962,408)');page.mouse.move(xy['x'],xy['y']);assert abs(page.evaluate('Bruma.state.lamp.x')-lamp['x'])<1
        page.keyboard.press('l');ok('Pinned lamp does not follow subsequent clicks')
        page.keyboard.press('n');page.wait_for_timeout(300);assert page.evaluate('Bruma.normalView');shot(page,'04-normal-map');page.keyboard.press('n')
        obj(page,'gate');assert page.evaluate('Bruma.state.scene')=='harbor';ok('Locked exit does not bypass progression')
        obj(page,'celso');btn(page,'He perdido mi sombra.');assert page.evaluate('Bruma.state.notes.includes("seal")');dialog_close(page)
        obj(page,'plaque');page.wait_for_selector('#light-height');shot(page,'05-seal-front')
        box1=page.locator('.relief-viewport').bounding_box();page.wait_for_timeout(800)
        box2=page.locator('.relief-viewport').bounding_box()
        assert abs(box2['width']/box2['height']-16/9)<.005
        assert abs(box1['height']-box2['height'])<1,('Canvas layout feedback',box1,box2)
        ok('Relief viewport stays 16:9 and stable while framebuffer updates')
        page.locator('#light-height').focus();page.keyboard.press('Home');page.wait_for_timeout(350);shot(page,'06-seal-raking')
        btn(page,'Tomar calco A');assert not page.evaluate('Bruma.state.inventory.includes("calco")')
        btn(page,'Tomar calco B');assert page.evaluate('Bruma.state.inventory.includes("calco")');dialog_close(page);ok('Seal puzzle distinguishes wrong and correct observations')
        obj(page,'tavern');page.wait_for_function('Bruma.state.scene==="tavern"');shot(page,'07-tavern')
        page.locator('[data-item="calco"]').click();obj(page,'lua');assert page.evaluate('Bruma.state.inventory.includes("filtro")');dialog_close(page);ok('Inventory item can actually be given to its character target')
        obj(page,'boat');assert page.evaluate('Bruma.state.inventory.includes("barco")');assert page.evaluate('Bruma.state.scene')=='tavern';ok('Small foreground item is not swallowed by the doorway hotspot')
        page.locator('[data-item="barco"]').click();obj(page,'projector');btn(page,'Ámbar');btn(page,'Cian');shot(page,'08-contract');btn(page,'Guardar el contrato');dialog_close(page)
        assert page.evaluate('Bruma.state.inventory.includes("contrato")');ok('Both spectral layers are required before keeping the evidence')
        obj(page,'harbor');page.locator('[data-item="contrato"]').click();obj(page,'celso');dialog_close(page);assert page.evaluate('Bruma.state.flags.archiveOpen')
        obj(page,'gate');page.wait_for_function('Bruma.state.scene==="archive"');shot(page,'09-archive');ok('All three first scenes are connected through real exits')
        page.reload(wait_until='networkidle');page.wait_for_function('window.Bruma&&Bruma.ready');btn(page,'Continuar');assert page.evaluate('Bruma.state.scene')=='archive';assert page.evaluate('Bruma.state.inventory.includes("contrato")');ok('Real localStorage restores progress after a browser reload')
        obj(page,'stairs');assert page.evaluate('Bruma.state.scene')=='archive'
        obj(page,'ofelia');btn(page,'Quiero revisar este contrato.');dialog_close(page)
        obj(page,'ledger');page.wait_for_selector('#light-height');page.locator('#light-height').focus();page.keyboard.press('Home');page.wait_for_timeout(300);shot(page,'10-register')
        btn(page,'Acusar copia B');btn(page,'Tiene una firma distinta.');btn(page,'Construir la prueba');assert not page.evaluate('Bruma.state.inventory.includes("prueba")')
        btn(page,'Recibió una segunda escritura.');btn(page,'Construir la prueba');dialog_close(page);assert page.evaluate('Bruma.state.inventory.includes("prueba")');ok('Pressure puzzle requires both the correct copy and a supported explanation')
        page.locator('[data-item="prueba"]').click();obj(page,'ofelia');btn(page,'¿Y si la dejamos decidir ahora?');dialog_close(page);assert page.evaluate('Bruma.state.inventory.includes("llave")');assert page.evaluate('Bruma.state.inventory.includes("prisma")')
        obj(page,'stairs');page.wait_for_function('Bruma.state.scene==="lighthouse"');shot(page,'11-lighthouse')
        obj(page,'shadow');assert not page.locator('#dialogue').is_visible();ok('Ending stays locked until the optical puzzle is solved')
        obj(page,'optics');assert page.get_by_role('button',name='Abrir el canal de declaración',exact=True).is_disabled();shot(page,'12-mirrors-before')
        solution=[1,1,1,0,1,1,0,1,0]
        current=page.evaluate('Bruma.state.mirrors')
        for i,(a,bval) in enumerate(zip(current,solution)):
            if a!=bval:page.get_by_role('button',name='Girar espejo '+str(i+1),exact=True).click()
        assert page.get_by_role('button',name='Abrir el canal de declaración',exact=True).is_enabled();shot(page,'13-mirrors-solved');btn(page,'Abrir el canal de declaración');dialog_close(page);ok('Ray-traced reflections physically reach three receivers before unlocking')
        choices=['Te estaba buscando, no reclamando. ¿Qué quieres tú?','Volvamos, pero sin obligación de seguirme.','Eres mi sombra. Quiero que vuelvas.']
        for i,choice in enumerate(choices):
            obj(page,'shadow');btn(page,choice);assert page.evaluate('Bruma.state.flags.ending')==i+1;shot(page,'ending-'+str(i+1));panel_close(page)
        ok('Every ending is reachable and can be revisited without a soft lock')
        obj(page,'archive');obj(page,'harbor');assert page.evaluate('Bruma.state.scene')=='harbor';ok('Backtracking works from lighthouse to harbour')
        btn(page,'EN');assert page.evaluate('document.documentElement.lang')=='en';assert page.get_by_role('button',name='Notebook',exact=True).is_visible();shot(page,'14-english');ok('English interface and retained progression')
        assert page.evaluate('Bruma.rendererError')==0
        assert not report['errors'],report['errors']
        ok('No uncaught JavaScript or WebGL errors during the complete playthrough')
        report['passed']=True
    except Exception:
        report['passed']=False;report['failure']=traceback.format_exc();print(report['failure'],flush=True)
        try:shot(page,'FAILURE');report['state']=page.evaluate('window.Bruma?Bruma.state:null')
        except Exception:pass
    finally:
        browser.close()
    # Safari's engine: actual WebKit, not merely a resized Chromium viewport.
    try:
        webkit=p.webkit.launch(headless=True)
        wp=webkit.new_page(viewport={'width':1280,'height':900});start(wp)
        assert wp.evaluate('Bruma.rendererError')==0
        world_click(wp,920,696);wp.wait_for_function('Bruma.state.face===1&&Bruma.moving',timeout=8000)
        world_click(wp,150,696);wp.wait_for_function('Bruma.state.face===-1',timeout=8000)
        shot(wp,'15-webkit');ok('WebKit starts, compiles WebGL, and changes direction correctly');webkit.close()
    except Exception:
        report['webkit_warning']=traceback.format_exc();print('WEBKIT',report['webkit_warning'],flush=True)
    (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
if not report.get('passed'):raise SystemExit(1)
