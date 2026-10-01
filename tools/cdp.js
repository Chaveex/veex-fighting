// Debug helper: launch Edge headless in real time, wait, then pause the JS thread and print the stack (finds hangs).
// usage: node tools/cdp.js "level=3&stop=3&bot=1&god=1" [waitSeconds]
const { spawn } = require('child_process');
const http = require('http');
const query = process.argv[2] || '';
const wait = parseInt(process.argv[3] || '12', 10) * 1000;
const shotPrefix = process.argv[4]; // optional: save screenshots to tools/<prefix>N.png
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const port = 9333 + Math.floor(Math.random() * 500);
const proc = spawn(edge, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TEMP}/edge_cdp_${port}`, '--window-size=1280,720', `file:///F:/Dev/Claude/VeexingForce/index.html?${query}`], { stdio: 'ignore' });
const get = (p) => new Promise((res, rej) => http.get({ host: '127.0.0.1', port, path: p }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d))); }).on('error', rej));
(async () => {
  await new Promise(r => setTimeout(r, 3000));
  let tabs; for (let i = 0; i < 10; i++) { try { tabs = await get('/json'); break; } catch (e) { await new Promise(r => setTimeout(r, 500)); } }
  const tab = tabs.find(t => t.type === 'page' && /index.html/.test(t.url)) || tabs.find(t => t.type === 'page'); console.log('tab', tab.url);
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let id = 0; const pend = {};
  const send = (method, params) => new Promise(res => { const i = ++id; pend[i] = res; ws.send(JSON.stringify({ id: i, method, params })); });
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pend[m.id]) { pend[m.id](m.result); delete pend[m.id]; }
    if (m.method === 'Runtime.exceptionThrown') console.log('EXCEPTION', JSON.stringify(m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text).slice(0, 400));
    if (m.method === 'Runtime.consoleAPICalled') console.log('console', m.params.type, m.params.args.map(a => a.value).join(' '));
    if (m.method === 'Debugger.paused') {
      console.log('PAUSED STACK:');
      m.params.callFrames.slice(0, 12).forEach(f => console.log('  ', f.functionName || '(anon)', f.url.split('/').pop() + ':' + (f.location.lineNumber + 1)));
      finish();
    }
  };
  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable'); await send('Debugger.enable'); await send('Page.enable');
  const t0 = Date.now();
  while (Date.now() - t0 < wait) {
    await new Promise(r => setTimeout(r, 4000));
    const probe = Promise.race([send('Runtime.evaluate', { expression: 'JSON.stringify({s:window.G.state,l:window.G.level,st:window.G.stopIdx,f:window.G.frame,hp:window.G.player&&window.G.player.hp,sc:window.G.score,en:window.G.enemies.map(e=>e.kind+":"+e.state)})', returnByValue: true }), new Promise(r => setTimeout(() => r('TIMEOUT'), 5000))]);
    const r = await probe;
    if (r === 'TIMEOUT') { console.log('page unresponsive -> pausing'); send('Debugger.pause'); setTimeout(finish, 5000); return; }
    console.log('t=' + Math.round((Date.now() - t0) / 1000) + 's', r.result && (r.result.value || JSON.stringify(r.exceptionDetails && r.exceptionDetails.exception && r.exceptionDetails.exception.description)));
  }
  if (process.env.CDP_EVAL) { const r = await send('Runtime.evaluate', { expression: process.env.CDP_EVAL, returnByValue: true }); await new Promise(r2 => setTimeout(r2, parseInt(process.env.CDP_WAIT || '900', 10))); }
  if (shotPrefix) {
    for (let i = 0; i < (parseInt(process.env.CDP_SHOTS || '4', 10)); i++) {
      const r = await send('Page.captureScreenshot', { format: 'png' });
      require('fs').writeFileSync(require('path').join(__dirname, shotPrefix + i + '.png'), Buffer.from(r.data, 'base64'));
      await new Promise(r2 => setTimeout(r2, parseInt(process.env.CDP_GAP || '700', 10)));
    }
  }
  finish();
  function finish() { try { ws.close(); } catch (e) { /* */ } proc.kill(); setTimeout(() => { try { require('child_process').execSync('taskkill /F /IM msedge.exe /T', { stdio: 'ignore' }); } catch (e) { /* */ } process.exit(0); }, 500); }
})();
