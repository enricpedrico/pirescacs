/* GPL-3.0-or-later. The same native Pirescacs core validates and searches. */
let sf, pending, boot;
const ready = async (mode = 'single') => {
  if (boot) return boot;
  boot = (async () => {
    const base = '/engine/pirescacs-' + mode;
    importScripts(base + '.js');
    sf = await Stockfish({
      mainScriptUrlOrBlob: base + '.js',
      locateFile: (file) => '/engine/' + file,
    });
    sf.addMessageListener((line) => {
      if (!pending) return;
      if (line === 'readyok') {
        pending.resolve();
        pending = null;
      } else if (line.startsWith('snapshot ')) {
        pending.resolve(JSON.parse(line.slice(9)));
        pending = null;
      } else if (line.startsWith('info depth '))
        postMessage({ type: 'info', id: pending.id, line });
      else if (line.startsWith('bestmove ')) {
        pending.resolve(line.split(' ')[1]);
        pending = null;
      }
    });
    sf.postMessage('setoption name UCI_Variant value pirescacs');
    sf.postMessage('setoption name Use NNUE value false');
    sf.postMessage('setoption name Hash value 32');
    await new Promise((resolve, reject) => {
      pending = { resolve, reject };
      sf.postMessage('isready');
    });
  })();
  return boot;
};
let chain = Promise.resolve();
onmessage = ({ data }) => {
  if (data.type === 'stop') {
    if (sf) sf.postMessage('stop');
    return;
  }
  chain = chain.then(async () => {
    try {
      await ready(data.mode);
      sf.postMessage('setoption name UCI_Variant value ' + (['pirescacs-v1', 'pirescacs-v2', 'pirescacs-v3', 'pirescacs-v4', 'pirescacs-v5'].includes(data.rulesVersion) ? data.rulesVersion : 'pirescacs'));
      if (data.type === 'init') {
        postMessage({ type: 'ready', id: data.id });
        return;
      }
      sf.postMessage(
        'position ' +
          (data.fen ? 'fen ' + data.fen : 'startpos') +
          ' moves ' +
          (data.moves || []).join(' '),
      );
      if (data.type === 'snapshot') {
        if (data.validate) sf.postMessage('validate');
        const snapshot = await new Promise((resolve, reject) => {
          pending = { id: data.id, resolve, reject };
          sf.postMessage('snapshot');
        });
        postMessage({ type: 'snapshot', id: data.id, snapshot });
      } else if (data.type === 'search') {
        sf.postMessage('setoption name Hash value ' + data.hash);
        sf.postMessage(
          'setoption name Threads value ' +
            (data.mode === 'multi' ? data.threads : 1),
        );
        sf.postMessage('setoption name MultiPV value ' + data.multiPV);
        sf.postMessage('setoption name Skill Level value ' + data.skill);
        const best = await new Promise((resolve, reject) => {
          pending = { id: data.id, resolve, reject };
          sf.postMessage(
            data.time === 0 ? 'go infinite' : 'go movetime ' + data.time,
          );
        });
        postMessage({ type: 'best', id: data.id, best });
      }
    } catch (error) {
      postMessage({ type: 'error', id: data.id, error: String(error) });
    }
  });
};
