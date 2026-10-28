class PirQueue {
  constructor() { this.list = []; this.waiter = null; }
  get() { if (this.list.length) return Promise.resolve(this.list.shift()); return new Promise(resolve => { this.waiter = resolve; }); }
  put(x) { if (this.waiter) { const w = this.waiter; this.waiter = null; w(x); } else this.list.push(x); }
}
Module['queue'] = new PirQueue();
Module['postMessage'] = data => Module['queue'].put(data);
const pirListeners = [];
Module['addMessageListener'] = cb => pirListeners.push(cb);
Module['print'] = data => pirListeners.forEach(cb => cb(data));
Module['printErr'] = data => pirListeners.forEach(cb => cb(data));
