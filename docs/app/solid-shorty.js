// node_modules/solid-js/dist/solid.js
var taskIdCounter = 1, isCallbackScheduled = false, isPerformingWork = false, taskQueue = [], currentTask = null, shouldYieldToHost = null, yieldInterval = 5, deadline = 0, maxYieldInterval = 300, scheduleCallback = null, scheduledCallback = null;
var maxSigned31BitInt = 1073741823;
function setupScheduler() {
  const channel = new MessageChannel(), port = channel.port2;
  scheduleCallback = () => port.postMessage(null);
  channel.port1.onmessage = () => {
    if (scheduledCallback !== null) {
      const currentTime = performance.now();
      deadline = currentTime + yieldInterval;
      const hasTimeRemaining = true;
      try {
        const hasMoreWork = scheduledCallback(hasTimeRemaining, currentTime);
        if (!hasMoreWork) {
          scheduledCallback = null;
        } else
          port.postMessage(null);
      } catch (error) {
        port.postMessage(null);
        throw error;
      }
    }
  };
  if (navigator && navigator.scheduling && navigator.scheduling.isInputPending) {
    const scheduling = navigator.scheduling;
    shouldYieldToHost = () => {
      const currentTime = performance.now();
      if (currentTime >= deadline) {
        if (scheduling.isInputPending()) {
          return true;
        }
        return currentTime >= maxYieldInterval;
      } else {
        return false;
      }
    };
  } else {
    shouldYieldToHost = () => performance.now() >= deadline;
  }
}
function enqueue(taskQueue2, task) {
  function findIndex() {
    let m2 = 0;
    let n = taskQueue2.length - 1;
    while (m2 <= n) {
      const k = n + m2 >> 1;
      const cmp = task.expirationTime - taskQueue2[k].expirationTime;
      if (cmp > 0)
        m2 = k + 1;
      else if (cmp < 0)
        n = k - 1;
      else
        return k;
    }
    return m2;
  }
  taskQueue2.splice(findIndex(), 0, task);
}
function requestCallback(fn, options) {
  if (!scheduleCallback)
    setupScheduler();
  let startTime = performance.now(), timeout = maxSigned31BitInt;
  if (options && options.timeout)
    timeout = options.timeout;
  const newTask = {
    id: taskIdCounter++,
    fn,
    startTime,
    expirationTime: startTime + timeout
  };
  enqueue(taskQueue, newTask);
  if (!isCallbackScheduled && !isPerformingWork) {
    isCallbackScheduled = true;
    scheduledCallback = flushWork;
    scheduleCallback();
  }
  return newTask;
}
function cancelCallback(task) {
  task.fn = null;
}
function flushWork(hasTimeRemaining, initialTime) {
  isCallbackScheduled = false;
  isPerformingWork = true;
  try {
    return workLoop(hasTimeRemaining, initialTime);
  } finally {
    currentTask = null;
    isPerformingWork = false;
  }
}
function workLoop(hasTimeRemaining, initialTime) {
  let currentTime = initialTime;
  currentTask = taskQueue[0] || null;
  while (currentTask !== null) {
    if (currentTask.expirationTime > currentTime && (!hasTimeRemaining || shouldYieldToHost())) {
      break;
    }
    const callback = currentTask.fn;
    if (callback !== null) {
      currentTask.fn = null;
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
      callback(didUserCallbackTimeout);
      currentTime = performance.now();
      if (currentTask === taskQueue[0]) {
        taskQueue.shift();
      }
    } else
      taskQueue.shift();
    currentTask = taskQueue[0] || null;
  }
  return currentTask !== null;
}
var sharedConfig = {};
function setHydrateContext(context) {
  sharedConfig.context = context;
}
function nextHydrateContext() {
  return {
    ...sharedConfig.context,
    id: `${sharedConfig.context.id}${sharedConfig.context.count++}-`,
    count: 0
  };
}
var equalFn = (a, b) => a === b;
var $PROXY = Symbol("solid-proxy");
var $TRACK = Symbol("solid-track");
var $DEVCOMP = Symbol("solid-dev-component");
var signalOptions = {
  equals: equalFn
};
var ERROR = null;
var runEffects = runQueue;
var STALE = 1;
var PENDING = 2;
var UNOWNED = {
  owned: null,
  cleanups: null,
  context: null,
  owner: null
};
var NO_INIT = {};
var Owner = null;
var Transition = null;
var Scheduler = null;
var ExternalSourceFactory = null;
var Listener = null;
var Updates = null;
var Effects = null;
var ExecCount = 0;
var [transPending, setTransPending] = /* @__PURE__ */ createSignal(false);
function createRoot(fn, detachedOwner) {
  const listener = Listener, owner = Owner, unowned = fn.length === 0, root = unowned ? UNOWNED : {
    owned: null,
    cleanups: null,
    context: null,
    owner: detachedOwner || owner
  }, updateFn = unowned ? fn : () => fn(() => untrack(() => cleanNode(root)));
  Owner = root;
  Listener = null;
  try {
    return runUpdates(updateFn, true);
  } finally {
    Listener = listener;
    Owner = owner;
  }
}
function createSignal(value, options) {
  options = options ? Object.assign({}, signalOptions, options) : signalOptions;
  const s = {
    value,
    observers: null,
    observerSlots: null,
    comparator: options.equals || void 0
  };
  const setter = (value2) => {
    if (typeof value2 === "function") {
      if (Transition && Transition.running && Transition.sources.has(s))
        value2 = value2(s.tValue);
      else
        value2 = value2(s.value);
    }
    return writeSignal(s, value2);
  };
  return [readSignal.bind(s), setter];
}
function createComputed(fn, value, options) {
  const c = createComputation(fn, value, true, STALE);
  if (Scheduler && Transition && Transition.running)
    Updates.push(c);
  else
    updateComputation(c);
}
function createRenderEffect(fn, value, options) {
  const c = createComputation(fn, value, false, STALE);
  if (Scheduler && Transition && Transition.running)
    Updates.push(c);
  else
    updateComputation(c);
}
function createEffect(fn, value, options) {
  runEffects = runUserEffects;
  const c = createComputation(fn, value, false, STALE), s = SuspenseContext && lookup(Owner, SuspenseContext.id);
  if (s)
    c.suspense = s;
  c.user = true;
  Effects ? Effects.push(c) : updateComputation(c);
}
function createReaction(onInvalidate, options) {
  let fn;
  const c = createComputation(() => {
    fn ? fn() : untrack(onInvalidate);
    fn = void 0;
  }, void 0, false, 0), s = SuspenseContext && lookup(Owner, SuspenseContext.id);
  if (s)
    c.suspense = s;
  c.user = true;
  return (tracking) => {
    fn = tracking;
    updateComputation(c);
  };
}
function createMemo(fn, value, options) {
  options = options ? Object.assign({}, signalOptions, options) : signalOptions;
  const c = createComputation(fn, value, true, 0);
  c.observers = null;
  c.observerSlots = null;
  c.comparator = options.equals || void 0;
  if (Scheduler && Transition && Transition.running) {
    c.tState = STALE;
    Updates.push(c);
  } else
    updateComputation(c);
  return readSignal.bind(c);
}
function createResource(pSource, pFetcher, pOptions) {
  let source;
  let fetcher;
  let options;
  if (arguments.length === 2 && typeof pFetcher === "object" || arguments.length === 1) {
    source = true;
    fetcher = pSource;
    options = pFetcher || {};
  } else {
    source = pSource;
    fetcher = pFetcher;
    options = pOptions || {};
  }
  let pr = null, initP = NO_INIT, id = null, loadedUnderTransition = false, scheduled = false, resolved = "initialValue" in options, dynamic = typeof source === "function" && createMemo(source);
  const contexts = /* @__PURE__ */ new Set(), [value, setValue] = (options.storage || createSignal)(options.initialValue), [error, setError] = createSignal(void 0), [track, trigger] = createSignal(void 0, {
    equals: false
  }), [state, setState] = createSignal(resolved ? "ready" : "unresolved");
  if (sharedConfig.context) {
    id = `${sharedConfig.context.id}${sharedConfig.context.count++}`;
    let v2;
    if (options.ssrLoadFrom === "initial")
      initP = options.initialValue;
    else if (sharedConfig.load && (v2 = sharedConfig.load(id)))
      initP = v2[0];
  }
  function loadEnd(p2, v2, error2, key) {
    if (pr === p2) {
      pr = null;
      resolved = true;
      if ((p2 === initP || v2 === initP) && options.onHydrated)
        queueMicrotask(() => options.onHydrated(key, {
          value: v2
        }));
      initP = NO_INIT;
      if (Transition && p2 && loadedUnderTransition) {
        Transition.promises.delete(p2);
        loadedUnderTransition = false;
        runUpdates(() => {
          Transition.running = true;
          completeLoad(v2, error2);
        }, false);
      } else
        completeLoad(v2, error2);
    }
    return v2;
  }
  function completeLoad(v2, err) {
    runUpdates(() => {
      if (!err)
        setValue(() => v2);
      setState(err ? "errored" : "ready");
      setError(err);
      for (const c of contexts.keys())
        c.decrement();
      contexts.clear();
    }, false);
  }
  function read() {
    const c = SuspenseContext && lookup(Owner, SuspenseContext.id), v2 = value(), err = error();
    if (err && !pr)
      throw err;
    if (Listener && !Listener.user && c) {
      createComputed(() => {
        track();
        if (pr) {
          if (c.resolved && Transition && loadedUnderTransition)
            Transition.promises.add(pr);
          else if (!contexts.has(c)) {
            c.increment();
            contexts.add(c);
          }
        }
      });
    }
    return v2;
  }
  function load(refetching = true) {
    if (refetching !== false && scheduled)
      return;
    scheduled = false;
    const lookup2 = dynamic ? dynamic() : source;
    loadedUnderTransition = Transition && Transition.running;
    if (lookup2 == null || lookup2 === false) {
      loadEnd(pr, untrack(value));
      return;
    }
    if (Transition && pr)
      Transition.promises.delete(pr);
    const p2 = initP !== NO_INIT ? initP : untrack(() => fetcher(lookup2, {
      value: value(),
      refetching
    }));
    if (typeof p2 !== "object" || !(p2 && "then" in p2)) {
      loadEnd(pr, p2, void 0, lookup2);
      return p2;
    }
    pr = p2;
    scheduled = true;
    queueMicrotask(() => scheduled = false);
    runUpdates(() => {
      setState(resolved ? "refreshing" : "pending");
      trigger();
    }, false);
    return p2.then((v2) => loadEnd(p2, v2, void 0, lookup2), (e) => loadEnd(p2, void 0, castError(e), lookup2));
  }
  Object.defineProperties(read, {
    state: {
      get: () => state()
    },
    error: {
      get: () => error()
    },
    loading: {
      get() {
        const s = state();
        return s === "pending" || s === "refreshing";
      }
    },
    latest: {
      get() {
        if (!resolved)
          return read();
        const err = error();
        if (err && !pr)
          throw err;
        return value();
      }
    }
  });
  if (dynamic)
    createComputed(() => load(false));
  else
    load(false);
  return [read, {
    refetch: load,
    mutate: setValue
  }];
}
function createDeferred(source, options) {
  let t, timeout = options ? options.timeoutMs : void 0;
  const node = createComputation(() => {
    if (!t || !t.fn)
      t = requestCallback(() => setDeferred(() => node.value), timeout !== void 0 ? {
        timeout
      } : void 0);
    return source();
  }, void 0, true);
  const [deferred, setDeferred] = createSignal(node.value, options);
  updateComputation(node);
  setDeferred(() => node.value);
  return deferred;
}
function createSelector(source, fn = equalFn, options) {
  const subs = /* @__PURE__ */ new Map();
  const node = createComputation((p2) => {
    const v2 = source();
    for (const [key, val] of subs.entries())
      if (fn(key, v2) !== fn(key, p2)) {
        for (const c of val.values()) {
          c.state = STALE;
          if (c.pure)
            Updates.push(c);
          else
            Effects.push(c);
        }
      }
    return v2;
  }, void 0, true, STALE);
  updateComputation(node);
  return (key) => {
    const listener = Listener;
    if (listener) {
      let l;
      if (l = subs.get(key))
        l.add(listener);
      else
        subs.set(key, l = /* @__PURE__ */ new Set([listener]));
      onCleanup(() => {
        l.delete(listener);
        !l.size && subs.delete(key);
      });
    }
    return fn(key, Transition && Transition.running && Transition.sources.has(node) ? node.tValue : node.value);
  };
}
function batch(fn) {
  return runUpdates(fn, false);
}
function untrack(fn) {
  const listener = Listener;
  Listener = null;
  try {
    return fn();
  } finally {
    Listener = listener;
  }
}
function on(deps, fn, options) {
  const isArray = Array.isArray(deps);
  let prevInput;
  let defer = options && options.defer;
  return (prevValue) => {
    let input;
    if (isArray) {
      input = Array(deps.length);
      for (let i = 0; i < deps.length; i++)
        input[i] = deps[i]();
    } else
      input = deps();
    if (defer) {
      defer = false;
      return void 0;
    }
    const result = untrack(() => fn(input, prevInput, prevValue));
    prevInput = input;
    return result;
  };
}
function onMount(fn) {
  createEffect(() => untrack(fn));
}
function onCleanup(fn) {
  if (Owner === null)
    ;
  else if (Owner.cleanups === null)
    Owner.cleanups = [fn];
  else
    Owner.cleanups.push(fn);
  return fn;
}
function onError(fn) {
  ERROR || (ERROR = Symbol("error"));
  if (Owner === null)
    ;
  else if (Owner.context === null)
    Owner.context = {
      [ERROR]: [fn]
    };
  else if (!Owner.context[ERROR])
    Owner.context[ERROR] = [fn];
  else
    Owner.context[ERROR].push(fn);
}
function getListener() {
  return Listener;
}
function getOwner() {
  return Owner;
}
function runWithOwner(o, fn) {
  const prev = Owner;
  Owner = o;
  try {
    return runUpdates(fn, true);
  } catch (err) {
    handleError(err);
  } finally {
    Owner = prev;
  }
}
function enableScheduling(scheduler = requestCallback) {
  Scheduler = scheduler;
}
function startTransition(fn) {
  if (Transition && Transition.running) {
    fn();
    return Transition.done;
  }
  const l = Listener;
  const o = Owner;
  return Promise.resolve().then(() => {
    Listener = l;
    Owner = o;
    let t;
    if (Scheduler || SuspenseContext) {
      t = Transition || (Transition = {
        sources: /* @__PURE__ */ new Set(),
        effects: [],
        promises: /* @__PURE__ */ new Set(),
        disposed: /* @__PURE__ */ new Set(),
        queue: /* @__PURE__ */ new Set(),
        running: true
      });
      t.done || (t.done = new Promise((res) => t.resolve = res));
      t.running = true;
    }
    runUpdates(fn, false);
    Listener = Owner = null;
    return t ? t.done : void 0;
  });
}
function useTransition() {
  return [transPending, startTransition];
}
function resumeEffects(e) {
  Effects.push.apply(Effects, e);
  e.length = 0;
}
function createContext(defaultValue, options) {
  const id = Symbol("context");
  return {
    id,
    Provider: createProvider(id),
    defaultValue
  };
}
function useContext(context) {
  let ctx;
  return (ctx = lookup(Owner, context.id)) !== void 0 ? ctx : context.defaultValue;
}
function children(fn) {
  const children2 = createMemo(fn);
  const memo = createMemo(() => resolveChildren(children2()));
  memo.toArray = () => {
    const c = memo();
    return Array.isArray(c) ? c : c != null ? [c] : [];
  };
  return memo;
}
var SuspenseContext;
function getSuspenseContext() {
  return SuspenseContext || (SuspenseContext = createContext({}));
}
function enableExternalSource(factory) {
  if (ExternalSourceFactory) {
    const oldFactory = ExternalSourceFactory;
    ExternalSourceFactory = (fn, trigger) => {
      const oldSource = oldFactory(fn, trigger);
      const source = factory((x2) => oldSource.track(x2), trigger);
      return {
        track: (x2) => source.track(x2),
        dispose() {
          source.dispose();
          oldSource.dispose();
        }
      };
    };
  } else {
    ExternalSourceFactory = factory;
  }
}
function readSignal() {
  const runningTransition = Transition && Transition.running;
  if (this.sources && (!runningTransition && this.state || runningTransition && this.tState)) {
    if (!runningTransition && this.state === STALE || runningTransition && this.tState === STALE)
      updateComputation(this);
    else {
      const updates = Updates;
      Updates = null;
      runUpdates(() => lookUpstream(this), false);
      Updates = updates;
    }
  }
  if (Listener) {
    const sSlot = this.observers ? this.observers.length : 0;
    if (!Listener.sources) {
      Listener.sources = [this];
      Listener.sourceSlots = [sSlot];
    } else {
      Listener.sources.push(this);
      Listener.sourceSlots.push(sSlot);
    }
    if (!this.observers) {
      this.observers = [Listener];
      this.observerSlots = [Listener.sources.length - 1];
    } else {
      this.observers.push(Listener);
      this.observerSlots.push(Listener.sources.length - 1);
    }
  }
  if (runningTransition && Transition.sources.has(this))
    return this.tValue;
  return this.value;
}
function writeSignal(node, value, isComp) {
  let current = Transition && Transition.running && Transition.sources.has(node) ? node.tValue : node.value;
  if (!node.comparator || !node.comparator(current, value)) {
    if (Transition) {
      const TransitionRunning = Transition.running;
      if (TransitionRunning || !isComp && Transition.sources.has(node)) {
        Transition.sources.add(node);
        node.tValue = value;
      }
      if (!TransitionRunning)
        node.value = value;
    } else
      node.value = value;
    if (node.observers && node.observers.length) {
      runUpdates(() => {
        for (let i = 0; i < node.observers.length; i += 1) {
          const o = node.observers[i];
          const TransitionRunning = Transition && Transition.running;
          if (TransitionRunning && Transition.disposed.has(o))
            continue;
          if (TransitionRunning && !o.tState || !TransitionRunning && !o.state) {
            if (o.pure)
              Updates.push(o);
            else
              Effects.push(o);
            if (o.observers)
              markDownstream(o);
          }
          if (TransitionRunning)
            o.tState = STALE;
          else
            o.state = STALE;
        }
        if (Updates.length > 1e6) {
          Updates = [];
          if (false)
            ;
          throw new Error();
        }
      }, false);
    }
  }
  return value;
}
function updateComputation(node) {
  if (!node.fn)
    return;
  cleanNode(node);
  const owner = Owner, listener = Listener, time = ExecCount;
  Listener = Owner = node;
  runComputation(node, Transition && Transition.running && Transition.sources.has(node) ? node.tValue : node.value, time);
  if (Transition && !Transition.running && Transition.sources.has(node)) {
    queueMicrotask(() => {
      runUpdates(() => {
        Transition && (Transition.running = true);
        Listener = Owner = node;
        runComputation(node, node.tValue, time);
        Listener = Owner = null;
      }, false);
    });
  }
  Listener = listener;
  Owner = owner;
}
function runComputation(node, value, time) {
  let nextValue;
  try {
    nextValue = node.fn(value);
  } catch (err) {
    if (node.pure) {
      if (Transition && Transition.running) {
        node.tState = STALE;
        node.tOwned && node.tOwned.forEach(cleanNode);
        node.tOwned = void 0;
      } else {
        node.state = STALE;
        node.owned && node.owned.forEach(cleanNode);
        node.owned = null;
      }
    }
    handleError(err);
  }
  if (!node.updatedAt || node.updatedAt <= time) {
    if (node.updatedAt != null && "observers" in node) {
      writeSignal(node, nextValue, true);
    } else if (Transition && Transition.running && node.pure) {
      Transition.sources.add(node);
      node.tValue = nextValue;
    } else
      node.value = nextValue;
    node.updatedAt = time;
  }
}
function createComputation(fn, init, pure, state = STALE, options) {
  const c = {
    fn,
    state,
    updatedAt: null,
    owned: null,
    sources: null,
    sourceSlots: null,
    cleanups: null,
    value: init,
    owner: Owner,
    context: null,
    pure
  };
  if (Transition && Transition.running) {
    c.state = 0;
    c.tState = state;
  }
  if (Owner === null)
    ;
  else if (Owner !== UNOWNED) {
    if (Transition && Transition.running && Owner.pure) {
      if (!Owner.tOwned)
        Owner.tOwned = [c];
      else
        Owner.tOwned.push(c);
    } else {
      if (!Owner.owned)
        Owner.owned = [c];
      else
        Owner.owned.push(c);
    }
  }
  if (ExternalSourceFactory) {
    const [track, trigger] = createSignal(void 0, {
      equals: false
    });
    const ordinary = ExternalSourceFactory(c.fn, trigger);
    onCleanup(() => ordinary.dispose());
    const triggerInTransition = () => startTransition(trigger).then(() => inTransition.dispose());
    const inTransition = ExternalSourceFactory(c.fn, triggerInTransition);
    c.fn = (x2) => {
      track();
      return Transition && Transition.running ? inTransition.track(x2) : ordinary.track(x2);
    };
  }
  return c;
}
function runTop(node) {
  const runningTransition = Transition && Transition.running;
  if (!runningTransition && node.state === 0 || runningTransition && node.tState === 0)
    return;
  if (!runningTransition && node.state === PENDING || runningTransition && node.tState === PENDING)
    return lookUpstream(node);
  if (node.suspense && untrack(node.suspense.inFallback))
    return node.suspense.effects.push(node);
  const ancestors = [node];
  while ((node = node.owner) && (!node.updatedAt || node.updatedAt < ExecCount)) {
    if (runningTransition && Transition.disposed.has(node))
      return;
    if (!runningTransition && node.state || runningTransition && node.tState)
      ancestors.push(node);
  }
  for (let i = ancestors.length - 1; i >= 0; i--) {
    node = ancestors[i];
    if (runningTransition) {
      let top = node, prev = ancestors[i + 1];
      while ((top = top.owner) && top !== prev) {
        if (Transition.disposed.has(top))
          return;
      }
    }
    if (!runningTransition && node.state === STALE || runningTransition && node.tState === STALE) {
      updateComputation(node);
    } else if (!runningTransition && node.state === PENDING || runningTransition && node.tState === PENDING) {
      const updates = Updates;
      Updates = null;
      runUpdates(() => lookUpstream(node, ancestors[0]), false);
      Updates = updates;
    }
  }
}
function runUpdates(fn, init) {
  if (Updates)
    return fn();
  let wait = false;
  if (!init)
    Updates = [];
  if (Effects)
    wait = true;
  else
    Effects = [];
  ExecCount++;
  try {
    const res = fn();
    completeUpdates(wait);
    return res;
  } catch (err) {
    if (!Updates)
      Effects = null;
    handleError(err);
  }
}
function completeUpdates(wait) {
  if (Updates) {
    if (Scheduler && Transition && Transition.running)
      scheduleQueue(Updates);
    else
      runQueue(Updates);
    Updates = null;
  }
  if (wait)
    return;
  let res;
  if (Transition) {
    if (!Transition.promises.size && !Transition.queue.size) {
      const sources = Transition.sources;
      const disposed = Transition.disposed;
      Effects.push.apply(Effects, Transition.effects);
      res = Transition.resolve;
      for (const e2 of Effects) {
        "tState" in e2 && (e2.state = e2.tState);
        delete e2.tState;
      }
      Transition = null;
      runUpdates(() => {
        for (const d2 of disposed)
          cleanNode(d2);
        for (const v2 of sources) {
          v2.value = v2.tValue;
          if (v2.owned) {
            for (let i = 0, len = v2.owned.length; i < len; i++)
              cleanNode(v2.owned[i]);
          }
          if (v2.tOwned)
            v2.owned = v2.tOwned;
          delete v2.tValue;
          delete v2.tOwned;
          v2.tState = 0;
        }
        setTransPending(false);
      }, false);
    } else if (Transition.running) {
      Transition.running = false;
      Transition.effects.push.apply(Transition.effects, Effects);
      Effects = null;
      setTransPending(true);
      return;
    }
  }
  const e = Effects;
  Effects = null;
  if (e.length)
    runUpdates(() => runEffects(e), false);
  if (res)
    res();
}
function runQueue(queue) {
  for (let i = 0; i < queue.length; i++)
    runTop(queue[i]);
}
function scheduleQueue(queue) {
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const tasks = Transition.queue;
    if (!tasks.has(item)) {
      tasks.add(item);
      Scheduler(() => {
        tasks.delete(item);
        runUpdates(() => {
          Transition.running = true;
          runTop(item);
        }, false);
        Transition && (Transition.running = false);
      });
    }
  }
}
function runUserEffects(queue) {
  let i, userLength = 0;
  for (i = 0; i < queue.length; i++) {
    const e = queue[i];
    if (!e.user)
      runTop(e);
    else
      queue[userLength++] = e;
  }
  if (sharedConfig.context)
    setHydrateContext();
  for (i = 0; i < userLength; i++)
    runTop(queue[i]);
}
function lookUpstream(node, ignore) {
  const runningTransition = Transition && Transition.running;
  if (runningTransition)
    node.tState = 0;
  else
    node.state = 0;
  for (let i = 0; i < node.sources.length; i += 1) {
    const source = node.sources[i];
    if (source.sources) {
      if (!runningTransition && source.state === STALE || runningTransition && source.tState === STALE) {
        if (source !== ignore)
          runTop(source);
      } else if (!runningTransition && source.state === PENDING || runningTransition && source.tState === PENDING)
        lookUpstream(source, ignore);
    }
  }
}
function markDownstream(node) {
  const runningTransition = Transition && Transition.running;
  for (let i = 0; i < node.observers.length; i += 1) {
    const o = node.observers[i];
    if (!runningTransition && !o.state || runningTransition && !o.tState) {
      if (runningTransition)
        o.tState = PENDING;
      else
        o.state = PENDING;
      if (o.pure)
        Updates.push(o);
      else
        Effects.push(o);
      o.observers && markDownstream(o);
    }
  }
}
function cleanNode(node) {
  let i;
  if (node.sources) {
    while (node.sources.length) {
      const source = node.sources.pop(), index = node.sourceSlots.pop(), obs = source.observers;
      if (obs && obs.length) {
        const n = obs.pop(), s = source.observerSlots.pop();
        if (index < obs.length) {
          n.sourceSlots[s] = index;
          obs[index] = n;
          source.observerSlots[index] = s;
        }
      }
    }
  }
  if (Transition && Transition.running && node.pure) {
    if (node.tOwned) {
      for (i = 0; i < node.tOwned.length; i++)
        cleanNode(node.tOwned[i]);
      delete node.tOwned;
    }
    reset(node, true);
  } else if (node.owned) {
    for (i = 0; i < node.owned.length; i++)
      cleanNode(node.owned[i]);
    node.owned = null;
  }
  if (node.cleanups) {
    for (i = 0; i < node.cleanups.length; i++)
      node.cleanups[i]();
    node.cleanups = null;
  }
  if (Transition && Transition.running)
    node.tState = 0;
  else
    node.state = 0;
  node.context = null;
}
function reset(node, top) {
  if (!top) {
    node.tState = 0;
    Transition.disposed.add(node);
  }
  if (node.owned) {
    for (let i = 0; i < node.owned.length; i++)
      reset(node.owned[i]);
  }
}
function castError(err) {
  if (err instanceof Error || typeof err === "string")
    return err;
  return new Error("Unknown error");
}
function handleError(err) {
  err = castError(err);
  const fns = ERROR && lookup(Owner, ERROR);
  if (!fns)
    throw err;
  for (const f of fns)
    f(err);
}
function lookup(owner, key) {
  return owner ? owner.context && owner.context[key] !== void 0 ? owner.context[key] : lookup(owner.owner, key) : void 0;
}
function resolveChildren(children2) {
  if (typeof children2 === "function" && !children2.length)
    return resolveChildren(children2());
  if (Array.isArray(children2)) {
    const results = [];
    for (let i = 0; i < children2.length; i++) {
      const result = resolveChildren(children2[i]);
      Array.isArray(result) ? results.push.apply(results, result) : results.push(result);
    }
    return results;
  }
  return children2;
}
function createProvider(id, options) {
  return function provider(props) {
    let res;
    createRenderEffect(() => res = untrack(() => {
      Owner.context = {
        [id]: props.value
      };
      return children(() => props.children);
    }), void 0);
    return res;
  };
}
function observable(input) {
  return {
    subscribe(observer) {
      if (!(observer instanceof Object) || observer == null) {
        throw new TypeError("Expected the observer to be an object.");
      }
      const handler = typeof observer === "function" ? observer : observer.next && observer.next.bind(observer);
      if (!handler) {
        return {
          unsubscribe() {
          }
        };
      }
      const dispose2 = createRoot((disposer) => {
        createEffect(() => {
          const v2 = input();
          untrack(() => handler(v2));
        });
        return disposer;
      });
      if (getOwner())
        onCleanup(dispose2);
      return {
        unsubscribe() {
          dispose2();
        }
      };
    },
    [Symbol.observable || "@@observable"]() {
      return this;
    }
  };
}
function from(producer) {
  const [s, set] = createSignal(void 0, {
    equals: false
  });
  if ("subscribe" in producer) {
    const unsub = producer.subscribe((v2) => set(() => v2));
    onCleanup(() => "unsubscribe" in unsub ? unsub.unsubscribe() : unsub());
  } else {
    const clean = producer(set);
    onCleanup(clean);
  }
  return s;
}
var FALLBACK = Symbol("fallback");
function dispose(d2) {
  for (let i = 0; i < d2.length; i++)
    d2[i]();
}
function mapArray(list, mapFn, options = {}) {
  let items = [], mapped = [], disposers = [], len = 0, indexes = mapFn.length > 1 ? [] : null;
  onCleanup(() => dispose(disposers));
  return () => {
    let newItems = list() || [], i, j;
    newItems[$TRACK];
    return untrack(() => {
      let newLen = newItems.length, newIndices, newIndicesNext, temp, tempdisposers, tempIndexes, start, end, newEnd, item;
      if (newLen === 0) {
        if (len !== 0) {
          dispose(disposers);
          disposers = [];
          items = [];
          mapped = [];
          len = 0;
          indexes && (indexes = []);
        }
        if (options.fallback) {
          items = [FALLBACK];
          mapped[0] = createRoot((disposer) => {
            disposers[0] = disposer;
            return options.fallback();
          });
          len = 1;
        }
      } else if (len === 0) {
        mapped = new Array(newLen);
        for (j = 0; j < newLen; j++) {
          items[j] = newItems[j];
          mapped[j] = createRoot(mapper);
        }
        len = newLen;
      } else {
        temp = new Array(newLen);
        tempdisposers = new Array(newLen);
        indexes && (tempIndexes = new Array(newLen));
        for (start = 0, end = Math.min(len, newLen); start < end && items[start] === newItems[start]; start++)
          ;
        for (end = len - 1, newEnd = newLen - 1; end >= start && newEnd >= start && items[end] === newItems[newEnd]; end--, newEnd--) {
          temp[newEnd] = mapped[end];
          tempdisposers[newEnd] = disposers[end];
          indexes && (tempIndexes[newEnd] = indexes[end]);
        }
        newIndices = /* @__PURE__ */ new Map();
        newIndicesNext = new Array(newEnd + 1);
        for (j = newEnd; j >= start; j--) {
          item = newItems[j];
          i = newIndices.get(item);
          newIndicesNext[j] = i === void 0 ? -1 : i;
          newIndices.set(item, j);
        }
        for (i = start; i <= end; i++) {
          item = items[i];
          j = newIndices.get(item);
          if (j !== void 0 && j !== -1) {
            temp[j] = mapped[i];
            tempdisposers[j] = disposers[i];
            indexes && (tempIndexes[j] = indexes[i]);
            j = newIndicesNext[j];
            newIndices.set(item, j);
          } else
            disposers[i]();
        }
        for (j = start; j < newLen; j++) {
          if (j in temp) {
            mapped[j] = temp[j];
            disposers[j] = tempdisposers[j];
            if (indexes) {
              indexes[j] = tempIndexes[j];
              indexes[j](j);
            }
          } else
            mapped[j] = createRoot(mapper);
        }
        mapped = mapped.slice(0, len = newLen);
        items = newItems.slice(0);
      }
      return mapped;
    });
    function mapper(disposer) {
      disposers[j] = disposer;
      if (indexes) {
        const [s, set] = createSignal(j);
        indexes[j] = set;
        return mapFn(newItems[j], s);
      }
      return mapFn(newItems[j]);
    }
  };
}
function indexArray(list, mapFn, options = {}) {
  let items = [], mapped = [], disposers = [], signals = [], len = 0, i;
  onCleanup(() => dispose(disposers));
  return () => {
    const newItems = list() || [];
    newItems[$TRACK];
    return untrack(() => {
      if (newItems.length === 0) {
        if (len !== 0) {
          dispose(disposers);
          disposers = [];
          items = [];
          mapped = [];
          len = 0;
          signals = [];
        }
        if (options.fallback) {
          items = [FALLBACK];
          mapped[0] = createRoot((disposer) => {
            disposers[0] = disposer;
            return options.fallback();
          });
          len = 1;
        }
        return mapped;
      }
      if (items[0] === FALLBACK) {
        disposers[0]();
        disposers = [];
        items = [];
        mapped = [];
        len = 0;
      }
      for (i = 0; i < newItems.length; i++) {
        if (i < items.length && items[i] !== newItems[i]) {
          signals[i](() => newItems[i]);
        } else if (i >= items.length) {
          mapped[i] = createRoot(mapper);
        }
      }
      for (; i < items.length; i++) {
        disposers[i]();
      }
      len = signals.length = disposers.length = newItems.length;
      items = newItems.slice(0);
      return mapped = mapped.slice(0, len);
    });
    function mapper(disposer) {
      disposers[i] = disposer;
      const [s, set] = createSignal(newItems[i]);
      signals[i] = set;
      return mapFn(s, i);
    }
  };
}
var hydrationEnabled = false;
function enableHydration() {
  hydrationEnabled = true;
}
function createComponent(Comp, props) {
  if (hydrationEnabled) {
    if (sharedConfig.context) {
      const c = sharedConfig.context;
      setHydrateContext(nextHydrateContext());
      const r = untrack(() => Comp(props || {}));
      setHydrateContext(c);
      return r;
    }
  }
  return untrack(() => Comp(props || {}));
}
function trueFn() {
  return true;
}
var propTraps = {
  get(_3, property, receiver) {
    if (property === $PROXY)
      return receiver;
    return _3.get(property);
  },
  has(_3, property) {
    if (property === $PROXY)
      return true;
    return _3.has(property);
  },
  set: trueFn,
  deleteProperty: trueFn,
  getOwnPropertyDescriptor(_3, property) {
    return {
      configurable: true,
      enumerable: true,
      get() {
        return _3.get(property);
      },
      set: trueFn,
      deleteProperty: trueFn
    };
  },
  ownKeys(_3) {
    return _3.keys();
  }
};
function resolveSource(s) {
  return !(s = typeof s === "function" ? s() : s) ? {} : s;
}
function mergeProps(...sources) {
  let proxy = false;
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    proxy = proxy || !!s && $PROXY in s;
    sources[i] = typeof s === "function" ? (proxy = true, createMemo(s)) : s;
  }
  if (proxy) {
    return new Proxy({
      get(property) {
        for (let i = sources.length - 1; i >= 0; i--) {
          const v2 = resolveSource(sources[i])[property];
          if (v2 !== void 0)
            return v2;
        }
      },
      has(property) {
        for (let i = sources.length - 1; i >= 0; i--) {
          if (property in resolveSource(sources[i]))
            return true;
        }
        return false;
      },
      keys() {
        const keys = [];
        for (let i = 0; i < sources.length; i++)
          keys.push(...Object.keys(resolveSource(sources[i])));
        return [...new Set(keys)];
      }
    }, propTraps);
  }
  const target = {};
  for (let i = sources.length - 1; i >= 0; i--) {
    if (sources[i]) {
      const descriptors = Object.getOwnPropertyDescriptors(sources[i]);
      for (const key in descriptors) {
        if (key in target)
          continue;
        Object.defineProperty(target, key, {
          enumerable: true,
          get() {
            for (let i2 = sources.length - 1; i2 >= 0; i2--) {
              const v2 = (sources[i2] || {})[key];
              if (v2 !== void 0)
                return v2;
            }
          }
        });
      }
    }
  }
  return target;
}
function splitProps(props, ...keys) {
  const blocked = new Set(keys.flat());
  if ($PROXY in props) {
    const res = keys.map((k) => {
      return new Proxy({
        get(property) {
          return k.includes(property) ? props[property] : void 0;
        },
        has(property) {
          return k.includes(property) && property in props;
        },
        keys() {
          return k.filter((property) => property in props);
        }
      }, propTraps);
    });
    res.push(new Proxy({
      get(property) {
        return blocked.has(property) ? void 0 : props[property];
      },
      has(property) {
        return blocked.has(property) ? false : property in props;
      },
      keys() {
        return Object.keys(props).filter((k) => !blocked.has(k));
      }
    }, propTraps));
    return res;
  }
  const descriptors = Object.getOwnPropertyDescriptors(props);
  keys.push(Object.keys(descriptors).filter((k) => !blocked.has(k)));
  return keys.map((k) => {
    const clone = {};
    for (let i = 0; i < k.length; i++) {
      const key = k[i];
      if (!(key in props))
        continue;
      Object.defineProperty(clone, key, descriptors[key] ? descriptors[key] : {
        get() {
          return props[key];
        },
        set() {
          return true;
        },
        enumerable: true
      });
    }
    return clone;
  });
}
function lazy(fn) {
  let comp;
  let p2;
  const wrap = (props) => {
    const ctx = sharedConfig.context;
    if (ctx) {
      const [s, set] = createSignal();
      (p2 || (p2 = fn())).then((mod) => {
        setHydrateContext(ctx);
        set(() => mod.default);
        setHydrateContext();
      });
      comp = s;
    } else if (!comp) {
      const [s] = createResource(() => (p2 || (p2 = fn())).then((mod) => mod.default));
      comp = s;
    }
    let Comp;
    return createMemo(() => (Comp = comp()) && untrack(() => {
      if (false)
        ;
      if (!ctx)
        return Comp(props);
      const c = sharedConfig.context;
      setHydrateContext(ctx);
      const r = Comp(props);
      setHydrateContext(c);
      return r;
    }));
  };
  wrap.preload = () => p2 || ((p2 = fn()).then((mod) => comp = () => mod.default), p2);
  return wrap;
}
var counter = 0;
function createUniqueId() {
  const ctx = sharedConfig.context;
  return ctx ? `${ctx.id}${ctx.count++}` : `cl-${counter++}`;
}
function For(props) {
  const fallback = "fallback" in props && {
    fallback: () => props.fallback
  };
  return createMemo(mapArray(() => props.each, props.children, fallback || void 0));
}
function Index(props) {
  const fallback = "fallback" in props && {
    fallback: () => props.fallback
  };
  return createMemo(indexArray(() => props.each, props.children, fallback || void 0));
}
function Show(props) {
  let strictEqual = false;
  const keyed = props.keyed;
  const condition = createMemo(() => props.when, void 0, {
    equals: (a, b) => strictEqual ? a === b : !a === !b
  });
  return createMemo(() => {
    const c = condition();
    if (c) {
      const child = props.children;
      const fn = typeof child === "function" && child.length > 0;
      strictEqual = keyed || fn;
      return fn ? untrack(() => child(c)) : child;
    }
    return props.fallback;
  }, void 0, void 0);
}
function Switch(props) {
  let strictEqual = false;
  let keyed = false;
  const equals = (a, b) => a[0] === b[0] && (strictEqual ? a[1] === b[1] : !a[1] === !b[1]) && a[2] === b[2];
  const conditions = children(() => props.children), evalConditions = createMemo(() => {
    let conds = conditions();
    if (!Array.isArray(conds))
      conds = [conds];
    for (let i = 0; i < conds.length; i++) {
      const c = conds[i].when;
      if (c) {
        keyed = !!conds[i].keyed;
        return [i, c, conds[i]];
      }
    }
    return [-1];
  }, void 0, {
    equals
  });
  return createMemo(() => {
    const [index, when, cond] = evalConditions();
    if (index < 0)
      return props.fallback;
    const c = cond.children;
    const fn = typeof c === "function" && c.length > 0;
    strictEqual = keyed || fn;
    return fn ? untrack(() => c(when)) : c;
  }, void 0, void 0);
}
function Match(props) {
  return props;
}
var Errors;
function resetErrorBoundaries() {
  Errors && [...Errors].forEach((fn) => fn());
}
function ErrorBoundary(props) {
  let err;
  let v2;
  if (sharedConfig.context && sharedConfig.load && (v2 = sharedConfig.load(sharedConfig.context.id + sharedConfig.context.count)))
    err = v2[0];
  const [errored, setErrored] = createSignal(err, void 0);
  Errors || (Errors = /* @__PURE__ */ new Set());
  Errors.add(setErrored);
  onCleanup(() => Errors.delete(setErrored));
  return createMemo(() => {
    let e;
    if (e = errored()) {
      const f = props.fallback;
      const res = typeof f === "function" && f.length ? untrack(() => f(e, () => setErrored())) : f;
      onError(setErrored);
      return res;
    }
    onError(setErrored);
    return props.children;
  }, void 0, void 0);
}
var suspenseListEquals = (a, b) => a.showContent === b.showContent && a.showFallback === b.showFallback;
var SuspenseListContext = createContext();
function SuspenseList(props) {
  let [wrapper, setWrapper] = createSignal(() => ({
    inFallback: false
  })), show;
  const listContext = useContext(SuspenseListContext);
  const [registry, setRegistry] = createSignal([]);
  if (listContext) {
    show = listContext.register(createMemo(() => wrapper()().inFallback));
  }
  const resolved = createMemo((prev) => {
    const reveal = props.revealOrder, tail = props.tail, {
      showContent = true,
      showFallback = true
    } = show ? show() : {}, reg = registry(), reverse = reveal === "backwards";
    if (reveal === "together") {
      const all = reg.every((inFallback2) => !inFallback2());
      const res2 = reg.map(() => ({
        showContent: all && showContent,
        showFallback
      }));
      res2.inFallback = !all;
      return res2;
    }
    let stop = false;
    let inFallback = prev.inFallback;
    const res = [];
    for (let i = 0, len = reg.length; i < len; i++) {
      const n = reverse ? len - i - 1 : i, s = reg[n]();
      if (!stop && !s) {
        res[n] = {
          showContent,
          showFallback
        };
      } else {
        const next = !stop;
        if (next)
          inFallback = true;
        res[n] = {
          showContent: next,
          showFallback: !tail || next && tail === "collapsed" ? showFallback : false
        };
        stop = true;
      }
    }
    if (!stop)
      inFallback = false;
    res.inFallback = inFallback;
    return res;
  }, {
    inFallback: false
  });
  setWrapper(() => resolved);
  return createComponent(SuspenseListContext.Provider, {
    value: {
      register: (inFallback) => {
        let index;
        setRegistry((registry2) => {
          index = registry2.length;
          return [...registry2, inFallback];
        });
        return createMemo(() => resolved()[index], void 0, {
          equals: suspenseListEquals
        });
      }
    },
    get children() {
      return props.children;
    }
  });
}
function Suspense(props) {
  let counter2 = 0, show, ctx, p2, flicker, error;
  const [inFallback, setFallback] = createSignal(false), SuspenseContext2 = getSuspenseContext(), store = {
    increment: () => {
      if (++counter2 === 1)
        setFallback(true);
    },
    decrement: () => {
      if (--counter2 === 0)
        setFallback(false);
    },
    inFallback,
    effects: [],
    resolved: false
  }, owner = getOwner();
  if (sharedConfig.context && sharedConfig.load) {
    const key = sharedConfig.context.id + sharedConfig.context.count;
    let ref = sharedConfig.load(key);
    if (ref && (p2 = ref[0]) && p2 !== "$$f") {
      if (typeof p2 !== "object" || !("then" in p2))
        p2 = Promise.resolve(p2);
      const [s, set] = createSignal(void 0, {
        equals: false
      });
      flicker = s;
      p2.then((err) => {
        if (err || sharedConfig.done) {
          err && (error = err);
          return set();
        }
        sharedConfig.gather(key);
        setHydrateContext(ctx);
        set();
        setHydrateContext();
      });
    }
  }
  const listContext = useContext(SuspenseListContext);
  if (listContext)
    show = listContext.register(store.inFallback);
  let dispose2;
  onCleanup(() => dispose2 && dispose2());
  return createComponent(SuspenseContext2.Provider, {
    value: store,
    get children() {
      return createMemo(() => {
        if (error)
          throw error;
        ctx = sharedConfig.context;
        if (flicker) {
          flicker();
          return flicker = void 0;
        }
        if (ctx && p2 === "$$f")
          setHydrateContext();
        const rendered = createMemo(() => props.children);
        return createMemo((prev) => {
          const inFallback2 = store.inFallback(), {
            showContent = true,
            showFallback = true
          } = show ? show() : {};
          if ((!inFallback2 || p2 && p2 !== "$$f") && showContent) {
            store.resolved = true;
            dispose2 && dispose2();
            dispose2 = ctx = p2 = void 0;
            resumeEffects(store.effects);
            return rendered();
          }
          if (!showFallback)
            return;
          if (dispose2)
            return prev;
          return createRoot((disposer) => {
            dispose2 = disposer;
            if (ctx) {
              setHydrateContext({
                id: ctx.id + "f",
                count: 0
              });
              ctx = void 0;
            }
            return props.fallback;
          }, owner);
        });
      });
    }
  });
}
var DEV;

// node_modules/solid-js/web/dist/web.js
var booleans = ["allowfullscreen", "async", "autofocus", "autoplay", "checked", "controls", "default", "disabled", "formnovalidate", "hidden", "indeterminate", "ismap", "loop", "multiple", "muted", "nomodule", "novalidate", "open", "playsinline", "readonly", "required", "reversed", "seamless", "selected"];
var Properties = /* @__PURE__ */ new Set(["className", "value", "readOnly", "formNoValidate", "isMap", "noModule", "playsInline", ...booleans]);
var ChildProperties = /* @__PURE__ */ new Set(["innerHTML", "textContent", "innerText", "children"]);
var Aliases = /* @__PURE__ */ Object.assign(/* @__PURE__ */ Object.create(null), {
  className: "class",
  htmlFor: "for"
});
var PropAliases = /* @__PURE__ */ Object.assign(/* @__PURE__ */ Object.create(null), {
  class: "className",
  formnovalidate: "formNoValidate",
  ismap: "isMap",
  nomodule: "noModule",
  playsinline: "playsInline",
  readonly: "readOnly"
});
var DelegatedEvents = /* @__PURE__ */ new Set(["beforeinput", "click", "dblclick", "contextmenu", "focusin", "focusout", "input", "keydown", "keyup", "mousedown", "mousemove", "mouseout", "mouseover", "mouseup", "pointerdown", "pointermove", "pointerout", "pointerover", "pointerup", "touchend", "touchmove", "touchstart"]);
var SVGElements = /* @__PURE__ */ new Set([
  "altGlyph",
  "altGlyphDef",
  "altGlyphItem",
  "animate",
  "animateColor",
  "animateMotion",
  "animateTransform",
  "circle",
  "clipPath",
  "color-profile",
  "cursor",
  "defs",
  "desc",
  "ellipse",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
  "filter",
  "font",
  "font-face",
  "font-face-format",
  "font-face-name",
  "font-face-src",
  "font-face-uri",
  "foreignObject",
  "g",
  "glyph",
  "glyphRef",
  "hkern",
  "image",
  "line",
  "linearGradient",
  "marker",
  "mask",
  "metadata",
  "missing-glyph",
  "mpath",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialGradient",
  "rect",
  "set",
  "stop",
  "svg",
  "switch",
  "symbol",
  "text",
  "textPath",
  "tref",
  "tspan",
  "use",
  "view",
  "vkern"
]);
var SVGNamespace = {
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace"
};
var DOMElements = /* @__PURE__ */ new Set(["html", "base", "head", "link", "meta", "style", "title", "body", "address", "article", "aside", "footer", "header", "main", "nav", "section", "body", "blockquote", "dd", "div", "dl", "dt", "figcaption", "figure", "hr", "li", "ol", "p", "pre", "ul", "a", "abbr", "b", "bdi", "bdo", "br", "cite", "code", "data", "dfn", "em", "i", "kbd", "mark", "q", "rp", "rt", "ruby", "s", "samp", "small", "span", "strong", "sub", "sup", "time", "u", "var", "wbr", "area", "audio", "img", "map", "track", "video", "embed", "iframe", "object", "param", "picture", "portal", "source", "svg", "math", "canvas", "noscript", "script", "del", "ins", "caption", "col", "colgroup", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "button", "datalist", "fieldset", "form", "input", "label", "legend", "meter", "optgroup", "option", "output", "progress", "select", "textarea", "details", "dialog", "menu", "summary", "details", "slot", "template", "acronym", "applet", "basefont", "bgsound", "big", "blink", "center", "content", "dir", "font", "frame", "frameset", "hgroup", "image", "keygen", "marquee", "menuitem", "nobr", "noembed", "noframes", "plaintext", "rb", "rtc", "shadow", "spacer", "strike", "tt", "xmp", "a", "abbr", "acronym", "address", "applet", "area", "article", "aside", "audio", "b", "base", "basefont", "bdi", "bdo", "bgsound", "big", "blink", "blockquote", "body", "br", "button", "canvas", "caption", "center", "cite", "code", "col", "colgroup", "content", "data", "datalist", "dd", "del", "details", "dfn", "dialog", "dir", "div", "dl", "dt", "em", "embed", "fieldset", "figcaption", "figure", "font", "footer", "form", "frame", "frameset", "head", "header", "hgroup", "hr", "html", "i", "iframe", "image", "img", "input", "ins", "kbd", "keygen", "label", "legend", "li", "link", "main", "map", "mark", "marquee", "menu", "menuitem", "meta", "meter", "nav", "nobr", "noembed", "noframes", "noscript", "object", "ol", "optgroup", "option", "output", "p", "param", "picture", "plaintext", "portal", "pre", "progress", "q", "rb", "rp", "rt", "rtc", "ruby", "s", "samp", "script", "section", "select", "shadow", "slot", "small", "source", "spacer", "span", "strike", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "title", "tr", "track", "tt", "u", "ul", "var", "video", "wbr", "xmp", "input"]);
function reconcileArrays(parentNode, a, b) {
  let bLength = b.length, aEnd = a.length, bEnd = bLength, aStart = 0, bStart = 0, after = a[aEnd - 1].nextSibling, map = null;
  while (aStart < aEnd || bStart < bEnd) {
    if (a[aStart] === b[bStart]) {
      aStart++;
      bStart++;
      continue;
    }
    while (a[aEnd - 1] === b[bEnd - 1]) {
      aEnd--;
      bEnd--;
    }
    if (aEnd === aStart) {
      const node = bEnd < bLength ? bStart ? b[bStart - 1].nextSibling : b[bEnd - bStart] : after;
      while (bStart < bEnd)
        parentNode.insertBefore(b[bStart++], node);
    } else if (bEnd === bStart) {
      while (aStart < aEnd) {
        if (!map || !map.has(a[aStart]))
          a[aStart].remove();
        aStart++;
      }
    } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
      const node = a[--aEnd].nextSibling;
      parentNode.insertBefore(b[bStart++], a[aStart++].nextSibling);
      parentNode.insertBefore(b[--bEnd], node);
      a[aEnd] = b[bEnd];
    } else {
      if (!map) {
        map = /* @__PURE__ */ new Map();
        let i = bStart;
        while (i < bEnd)
          map.set(b[i], i++);
      }
      const index = map.get(a[aStart]);
      if (index != null) {
        if (bStart < index && index < bEnd) {
          let i = aStart, sequence = 1, t;
          while (++i < aEnd && i < bEnd) {
            if ((t = map.get(a[i])) == null || t !== index + sequence)
              break;
            sequence++;
          }
          if (sequence > index - bStart) {
            const node = a[aStart];
            while (bStart < index)
              parentNode.insertBefore(b[bStart++], node);
          } else
            parentNode.replaceChild(b[bStart++], a[aStart++]);
        } else
          aStart++;
      } else
        a[aStart++].remove();
    }
  }
}
var $$EVENTS = "_$DX_DELEGATE";
function render(code, element, init, options = {}) {
  let disposer;
  createRoot((dispose2) => {
    disposer = dispose2;
    element === document ? code() : insert(element, code(), element.firstChild ? null : void 0, init);
  }, options.owner);
  return () => {
    disposer();
    element.textContent = "";
  };
}
function template(html, check, isSVG) {
  const t = document.createElement("template");
  t.innerHTML = html;
  let node = t.content.firstChild;
  if (isSVG)
    node = node.firstChild;
  return node;
}
function delegateEvents(eventNames, document2 = window.document) {
  const e = document2[$$EVENTS] || (document2[$$EVENTS] = /* @__PURE__ */ new Set());
  for (let i = 0, l = eventNames.length; i < l; i++) {
    const name = eventNames[i];
    if (!e.has(name)) {
      e.add(name);
      document2.addEventListener(name, eventHandler);
    }
  }
}
function clearDelegatedEvents(document2 = window.document) {
  if (document2[$$EVENTS]) {
    for (let name of document2[$$EVENTS].keys())
      document2.removeEventListener(name, eventHandler);
    delete document2[$$EVENTS];
  }
}
function setAttribute(node, name, value) {
  if (value == null)
    node.removeAttribute(name);
  else
    node.setAttribute(name, value);
}
function setAttributeNS(node, namespace, name, value) {
  if (value == null)
    node.removeAttributeNS(namespace, name);
  else
    node.setAttributeNS(namespace, name, value);
}
function className(node, value) {
  if (value == null)
    node.removeAttribute("class");
  else
    node.className = value;
}
function addEventListener(node, name, handler, delegate) {
  if (delegate) {
    if (Array.isArray(handler)) {
      node[`$$${name}`] = handler[0];
      node[`$$${name}Data`] = handler[1];
    } else
      node[`$$${name}`] = handler;
  } else if (Array.isArray(handler)) {
    const handlerFn = handler[0];
    node.addEventListener(name, handler[0] = (e) => handlerFn.call(node, handler[1], e));
  } else
    node.addEventListener(name, handler);
}
function classList(node, value, prev = {}) {
  const classKeys = Object.keys(value || {}), prevKeys = Object.keys(prev);
  let i, len;
  for (i = 0, len = prevKeys.length; i < len; i++) {
    const key = prevKeys[i];
    if (!key || key === "undefined" || value[key])
      continue;
    toggleClassKey(node, key, false);
    delete prev[key];
  }
  for (i = 0, len = classKeys.length; i < len; i++) {
    const key = classKeys[i], classValue = !!value[key];
    if (!key || key === "undefined" || prev[key] === classValue || !classValue)
      continue;
    toggleClassKey(node, key, true);
    prev[key] = classValue;
  }
  return prev;
}
function style(node, value, prev) {
  if (!value)
    return prev ? setAttribute(node, "style") : value;
  const nodeStyle = node.style;
  if (typeof value === "string")
    return nodeStyle.cssText = value;
  typeof prev === "string" && (nodeStyle.cssText = prev = void 0);
  prev || (prev = {});
  value || (value = {});
  let v2, s;
  for (s in prev) {
    value[s] == null && nodeStyle.removeProperty(s);
    delete prev[s];
  }
  for (s in value) {
    v2 = value[s];
    if (v2 !== prev[s]) {
      nodeStyle.setProperty(s, v2);
      prev[s] = v2;
    }
  }
  return prev;
}
function spread(node, props = {}, isSVG, skipChildren) {
  const prevProps = {};
  if (!skipChildren) {
    createRenderEffect(() => prevProps.children = insertExpression(node, props.children, prevProps.children));
  }
  createRenderEffect(() => props.ref && props.ref(node));
  createRenderEffect(() => assign(node, props, isSVG, true, prevProps, true));
  return prevProps;
}
function dynamicProperty(props, key) {
  const src = props[key];
  Object.defineProperty(props, key, {
    get() {
      return src();
    },
    enumerable: true
  });
  return props;
}
function innerHTML(parent, content) {
  !sharedConfig.context && (parent.innerHTML = content);
}
function use(fn, element, arg) {
  return untrack(() => fn(element, arg));
}
function insert(parent, accessor, marker, initial) {
  if (marker !== void 0 && !initial)
    initial = [];
  if (typeof accessor !== "function")
    return insertExpression(parent, accessor, initial, marker);
  createRenderEffect((current) => insertExpression(parent, accessor(), current, marker), initial);
}
function assign(node, props, isSVG, skipChildren, prevProps = {}, skipRef = false) {
  props || (props = {});
  for (const prop in prevProps) {
    if (!(prop in props)) {
      if (prop === "children")
        continue;
      prevProps[prop] = assignProp(node, prop, null, prevProps[prop], isSVG, skipRef);
    }
  }
  for (const prop in props) {
    if (prop === "children") {
      if (!skipChildren)
        insertExpression(node, props.children);
      continue;
    }
    const value = props[prop];
    prevProps[prop] = assignProp(node, prop, value, prevProps[prop], isSVG, skipRef);
  }
}
function hydrate$1(code, element, options = {}) {
  sharedConfig.completed = globalThis._$HY.completed;
  sharedConfig.events = globalThis._$HY.events;
  sharedConfig.load = globalThis._$HY.load;
  sharedConfig.gather = (root) => gatherHydratable(element, root);
  sharedConfig.registry = /* @__PURE__ */ new Map();
  sharedConfig.context = {
    id: options.renderId || "",
    count: 0
  };
  gatherHydratable(element, options.renderId);
  const dispose2 = render(code, element, [...element.childNodes], options);
  sharedConfig.context = null;
  return dispose2;
}
function getNextElement(template2) {
  let node, key;
  if (!sharedConfig.context || !(node = sharedConfig.registry.get(key = getHydrationKey()))) {
    return template2.cloneNode(true);
  }
  if (sharedConfig.completed)
    sharedConfig.completed.add(node);
  sharedConfig.registry.delete(key);
  return node;
}
function getNextMatch(el, nodeName) {
  while (el && el.localName !== nodeName)
    el = el.nextSibling;
  return el;
}
function getNextMarker(start) {
  let end = start, count = 0, current = [];
  if (sharedConfig.context) {
    while (end) {
      if (end.nodeType === 8) {
        const v2 = end.nodeValue;
        if (v2 === "#")
          count++;
        else if (v2 === "/") {
          if (count === 0)
            return [end, current];
          count--;
        }
      }
      current.push(end);
      end = end.nextSibling;
    }
  }
  return [end, current];
}
function runHydrationEvents() {
  if (sharedConfig.events && !sharedConfig.events.queued) {
    queueMicrotask(() => {
      const {
        completed,
        events
      } = sharedConfig;
      events.queued = false;
      while (events.length) {
        const [el, e] = events[0];
        if (!completed.has(el))
          return;
        eventHandler(e);
        events.shift();
      }
    });
    sharedConfig.events.queued = true;
  }
}
function toPropertyName(name) {
  return name.toLowerCase().replace(/-([a-z])/g, (_3, w2) => w2.toUpperCase());
}
function toggleClassKey(node, key, value) {
  const classNames = key.trim().split(/\s+/);
  for (let i = 0, nameLen = classNames.length; i < nameLen; i++)
    node.classList.toggle(classNames[i], value);
}
function assignProp(node, prop, value, prev, isSVG, skipRef) {
  let isCE, isProp, isChildProp;
  if (prop === "style")
    return style(node, value, prev);
  if (prop === "classList")
    return classList(node, value, prev);
  if (value === prev)
    return prev;
  if (prop === "ref") {
    if (!skipRef)
      value(node);
  } else if (prop.slice(0, 3) === "on:") {
    const e = prop.slice(3);
    prev && node.removeEventListener(e, prev);
    value && node.addEventListener(e, value);
  } else if (prop.slice(0, 10) === "oncapture:") {
    const e = prop.slice(10);
    prev && node.removeEventListener(e, prev, true);
    value && node.addEventListener(e, value, true);
  } else if (prop.slice(0, 2) === "on") {
    const name = prop.slice(2).toLowerCase();
    const delegate = DelegatedEvents.has(name);
    if (!delegate && prev) {
      const h2 = Array.isArray(prev) ? prev[0] : prev;
      node.removeEventListener(name, h2);
    }
    if (delegate || value) {
      addEventListener(node, name, value, delegate);
      delegate && delegateEvents([name]);
    }
  } else if ((isChildProp = ChildProperties.has(prop)) || !isSVG && (PropAliases[prop] || (isProp = Properties.has(prop))) || (isCE = node.nodeName.includes("-"))) {
    if (prop === "class" || prop === "className")
      className(node, value);
    else if (isCE && !isProp && !isChildProp)
      node[toPropertyName(prop)] = value;
    else
      node[PropAliases[prop] || prop] = value;
  } else {
    const ns = isSVG && prop.indexOf(":") > -1 && SVGNamespace[prop.split(":")[0]];
    if (ns)
      setAttributeNS(node, ns, prop, value);
    else
      setAttribute(node, Aliases[prop] || prop, value);
  }
  return value;
}
function eventHandler(e) {
  const key = `$$${e.type}`;
  let node = e.composedPath && e.composedPath()[0] || e.target;
  if (e.target !== node) {
    Object.defineProperty(e, "target", {
      configurable: true,
      value: node
    });
  }
  Object.defineProperty(e, "currentTarget", {
    configurable: true,
    get() {
      return node || document;
    }
  });
  if (sharedConfig.registry && !sharedConfig.done) {
    sharedConfig.done = true;
    document.querySelectorAll("[id^=pl-]").forEach((elem) => {
      while (elem && elem.nodeType !== 8 && elem.nodeValue !== "pl-" + e) {
        let x2 = elem.nextSibling;
        elem.remove();
        elem = x2;
      }
      elem && elem.remove();
    });
  }
  while (node) {
    const handler = node[key];
    if (handler && !node.disabled) {
      const data = node[`${key}Data`];
      data !== void 0 ? handler.call(node, data, e) : handler.call(node, e);
      if (e.cancelBubble)
        return;
    }
    node = node._$host || node.parentNode || node.host;
  }
}
function insertExpression(parent, value, current, marker, unwrapArray) {
  if (sharedConfig.context && !current)
    current = [...parent.childNodes];
  while (typeof current === "function")
    current = current();
  if (value === current)
    return current;
  const t = typeof value, multi = marker !== void 0;
  parent = multi && current[0] && current[0].parentNode || parent;
  if (t === "string" || t === "number") {
    if (sharedConfig.context)
      return current;
    if (t === "number")
      value = value.toString();
    if (multi) {
      let node = current[0];
      if (node && node.nodeType === 3) {
        node.data = value;
      } else
        node = document.createTextNode(value);
      current = cleanChildren(parent, current, marker, node);
    } else {
      if (current !== "" && typeof current === "string") {
        current = parent.firstChild.data = value;
      } else
        current = parent.textContent = value;
    }
  } else if (value == null || t === "boolean") {
    if (sharedConfig.context)
      return current;
    current = cleanChildren(parent, current, marker);
  } else if (t === "function") {
    createRenderEffect(() => {
      let v2 = value();
      while (typeof v2 === "function")
        v2 = v2();
      current = insertExpression(parent, v2, current, marker);
    });
    return () => current;
  } else if (Array.isArray(value)) {
    const array = [];
    const currentArray = current && Array.isArray(current);
    if (normalizeIncomingArray(array, value, current, unwrapArray)) {
      createRenderEffect(() => current = insertExpression(parent, array, current, marker, true));
      return () => current;
    }
    if (sharedConfig.context) {
      if (!array.length)
        return current;
      for (let i = 0; i < array.length; i++) {
        if (array[i].parentNode)
          return current = array;
      }
    }
    if (array.length === 0) {
      current = cleanChildren(parent, current, marker);
      if (multi)
        return current;
    } else if (currentArray) {
      if (current.length === 0) {
        appendNodes(parent, array, marker);
      } else
        reconcileArrays(parent, current, array);
    } else {
      current && cleanChildren(parent);
      appendNodes(parent, array);
    }
    current = array;
  } else if (value instanceof Node) {
    if (sharedConfig.context && value.parentNode)
      return current = multi ? [value] : value;
    if (Array.isArray(current)) {
      if (multi)
        return current = cleanChildren(parent, current, marker, value);
      cleanChildren(parent, current, null, value);
    } else if (current == null || current === "" || !parent.firstChild) {
      parent.appendChild(value);
    } else
      parent.replaceChild(value, parent.firstChild);
    current = value;
  } else
    ;
  return current;
}
function normalizeIncomingArray(normalized, array, current, unwrap) {
  let dynamic = false;
  for (let i = 0, len = array.length; i < len; i++) {
    let item = array[i], prev = current && current[i];
    if (item instanceof Node) {
      normalized.push(item);
    } else if (item == null || item === true || item === false)
      ;
    else if (Array.isArray(item)) {
      dynamic = normalizeIncomingArray(normalized, item, prev) || dynamic;
    } else if (typeof item === "function") {
      if (unwrap) {
        while (typeof item === "function")
          item = item();
        dynamic = normalizeIncomingArray(normalized, Array.isArray(item) ? item : [item], Array.isArray(prev) ? prev : [prev]) || dynamic;
      } else {
        normalized.push(item);
        dynamic = true;
      }
    } else {
      const value = String(item);
      if (prev && prev.nodeType === 3 && prev.data === value) {
        normalized.push(prev);
      } else
        normalized.push(document.createTextNode(value));
    }
  }
  return dynamic;
}
function appendNodes(parent, array, marker = null) {
  for (let i = 0, len = array.length; i < len; i++)
    parent.insertBefore(array[i], marker);
}
function cleanChildren(parent, current, marker, replacement) {
  if (marker === void 0)
    return parent.textContent = "";
  const node = replacement || document.createTextNode("");
  if (current.length) {
    let inserted = false;
    for (let i = current.length - 1; i >= 0; i--) {
      const el = current[i];
      if (node !== el) {
        const isParent = el.parentNode === parent;
        if (!inserted && !i)
          isParent ? parent.replaceChild(node, el) : parent.insertBefore(node, marker);
        else
          isParent && el.remove();
      } else
        inserted = true;
    }
  } else
    parent.insertBefore(node, marker);
  return [node];
}
function gatherHydratable(element, root) {
  const templates = element.querySelectorAll(`*[data-hk]`);
  for (let i = 0; i < templates.length; i++) {
    const node = templates[i];
    const key = node.getAttribute("data-hk");
    if ((!root || key.startsWith(root)) && !sharedConfig.registry.has(key))
      sharedConfig.registry.set(key, node);
  }
}
function getHydrationKey() {
  const hydrate2 = sharedConfig.context;
  return `${hydrate2.id}${hydrate2.count++}`;
}
function NoHydration(props) {
  return sharedConfig.context ? void 0 : props.children;
}
function Hydration(props) {
  return props.children;
}
function voidFn() {
}
function throwInBrowser(func) {
  const err = new Error(`${func.name} is not supported in the browser, returning undefined`);
  console.error(err);
}
function renderToString(fn, options) {
  throwInBrowser(renderToString);
}
function renderToStringAsync(fn, options) {
  throwInBrowser(renderToStringAsync);
}
function renderToStream(fn, options) {
  throwInBrowser(renderToStream);
}
function ssr(template2, ...nodes) {
}
function ssrElement(name, props, children2, needsId) {
}
function ssrClassList(value) {
}
function ssrStyle(value) {
}
function ssrAttribute(key, value) {
}
function ssrHydrationKey() {
}
function resolveSSRNode(node) {
}
function escape(html) {
}
function ssrSpread(props, isSVG, skipChildren) {
}
var isServer = false;
var SVG_NAMESPACE = "http://www.w3.org/2000/svg";
function createElement(tagName, isSVG = false) {
  return isSVG ? document.createElementNS(SVG_NAMESPACE, tagName) : document.createElement(tagName);
}
var hydrate = (...args) => {
  enableHydration();
  return hydrate$1(...args);
};
function Portal(props) {
  const {
    useShadow
  } = props, marker = document.createTextNode(""), mount = props.mount || document.body;
  function renderPortal() {
    if (sharedConfig.context) {
      const [s, set] = createSignal(false);
      queueMicrotask(() => set(true));
      return () => s() && props.children;
    } else
      return () => props.children;
  }
  if (mount instanceof HTMLHeadElement) {
    const [clean, setClean] = createSignal(false);
    const cleanup = () => setClean(true);
    createRoot((dispose2) => insert(mount, () => !clean() ? renderPortal()() : dispose2(), null));
    onCleanup(() => {
      if (sharedConfig.context)
        queueMicrotask(cleanup);
      else
        cleanup();
    });
  } else {
    const container = createElement(props.isSVG ? "g" : "div", props.isSVG), renderRoot = useShadow && container.attachShadow ? container.attachShadow({
      mode: "open"
    }) : container;
    Object.defineProperty(container, "_$host", {
      get() {
        return marker.parentNode;
      },
      configurable: true
    });
    insert(renderRoot, renderPortal());
    mount.appendChild(container);
    props.ref && props.ref(container);
    onCleanup(() => mount.removeChild(container));
  }
  return marker;
}
function Dynamic(props) {
  const [p2, others] = splitProps(props, ["component"]);
  const cached = createMemo(() => p2.component);
  return createMemo(() => {
    const component = cached();
    switch (typeof component) {
      case "function":
        return untrack(() => component(others));
      case "string":
        const isSvg = SVGElements.has(component);
        const el = sharedConfig.context ? getNextElement() : createElement(component, isSvg);
        spread(el, others, isSvg);
        return el;
    }
  });
}

// http-url:https://esm.sh/v103/solid-js@1.6.9/esnext/solid-js.js
var Be = 1, ae = false, de = false, Q = [], R = null, he = null, Ke = 5, oe = 0, Ye = 300, ge = null, te = null, Ge = 1073741823;
function Qe() {
  let e = new MessageChannel(), t = e.port2;
  if (ge = () => t.postMessage(null), e.port1.onmessage = () => {
    if (te !== null) {
      let s = performance.now();
      oe = s + Ke;
      let n = true;
      try {
        te(n, s) ? t.postMessage(null) : te = null;
      } catch (r) {
        throw t.postMessage(null), r;
      }
    }
  }, navigator && navigator.scheduling && navigator.scheduling.isInputPending) {
    let s = navigator.scheduling;
    he = () => {
      let n = performance.now();
      return n >= oe ? s.isInputPending() ? true : n >= Ye : false;
    };
  } else
    he = () => performance.now() >= oe;
}
function Xe(e, t) {
  function s() {
    let n = 0, r = e.length - 1;
    for (; n <= r; ) {
      let i = r + n >> 1, l = t.expirationTime - e[i].expirationTime;
      if (l > 0)
        n = i + 1;
      else if (l < 0)
        r = i - 1;
      else
        return i;
    }
    return n;
  }
  e.splice(s(), 0, t);
}
function Oe(e, t) {
  ge || Qe();
  let s = performance.now(), n = Ge;
  t && t.timeout && (n = t.timeout);
  let r = { id: Be++, fn: e, startTime: s, expirationTime: s + n };
  return Xe(Q, r), !ae && !de && (ae = true, te = _e, ge()), r;
}
function ht(e) {
  e.fn = null;
}
function _e(e, t) {
  ae = false, de = true;
  try {
    return Je(e, t);
  } finally {
    R = null, de = false;
  }
}
function Je(e, t) {
  let s = t;
  for (R = Q[0] || null; R !== null && !(R.expirationTime > s && (!e || he())); ) {
    let n = R.fn;
    if (n !== null) {
      R.fn = null;
      let r = R.expirationTime <= s;
      n(r), s = performance.now(), R === Q[0] && Q.shift();
    } else
      Q.shift();
    R = Q[0] || null;
  }
  return R !== null;
}
var g = {};
function $(e) {
  g.context = e;
}
function Ze() {
  return { ...g.context, id: `${g.context.id}${g.context.count++}-`, count: 0 };
}
var Te = (e, t) => e === t, ne = Symbol("solid-proxy"), Ae = Symbol("solid-track"), gt = Symbol("solid-dev-component"), re = { equals: Te }, W = null, Pe = De, P = 1, H = 2, Fe = { owned: null, cleanups: null, context: null, owner: null }, ce = {}, d = null, u = null, Y = null, B = null, h = null, y = null, A = null, ye = 0, [et, Se] = V(false);
function K(e, t) {
  let s = h, n = d, r = e.length === 0, i = r ? Fe : { owned: null, cleanups: null, context: null, owner: t || n }, l = r ? e : () => e(() => F(() => z(i)));
  d = i, h = null;
  try {
    return M(l, true);
  } finally {
    h = s, d = n;
  }
}
function V(e, t) {
  t = t ? Object.assign({}, re, t) : re;
  let s = { value: e, observers: null, observerSlots: null, comparator: t.equals || void 0 }, n = (r) => (typeof r == "function" && (u && u.running && u.sources.has(s) ? r = r(s.tValue) : r = r(s.value)), Re(s, r));
  return [Le.bind(s), n];
}
function ve(e, t, s) {
  let n = G(e, t, true, P);
  Y && u && u.running ? y.push(n) : N(n);
}
function tt(e, t, s) {
  let n = G(e, t, false, P);
  Y && u && u.running ? y.push(n) : N(n);
}
function Ie(e, t, s) {
  Pe = ut;
  let n = G(e, t, false, P), r = U && _(d, U.id);
  r && (n.suspense = r), n.user = true, A ? A.push(n) : N(n);
}
function pt(e, t) {
  let s, n = G(() => {
    s ? s() : F(e), s = void 0;
  }, void 0, false, 0), r = U && _(d, U.id);
  return r && (n.suspense = r), n.user = true, (i) => {
    s = i, N(n);
  };
}
function E(e, t, s) {
  s = s ? Object.assign({}, re, s) : re;
  let n = G(e, t, true, 0);
  return n.observers = null, n.observerSlots = null, n.comparator = s.equals || void 0, Y && u && u.running ? (n.tState = P, y.push(n)) : N(n), Le.bind(n);
}
function nt(e, t, s) {
  let n, r, i;
  arguments.length === 2 && typeof t == "object" || arguments.length === 1 ? (n = true, r = e, i = t || {}) : (n = e, r = t, i = s || {});
  let l = null, o = ce, f = null, a = false, c = false, k = "initialValue" in i, w2 = typeof n == "function" && E(n), p2 = /* @__PURE__ */ new Set(), [O2, S2] = (i.storage || V)(i.initialValue), [I2, q2] = V(void 0), [b, x2] = V(void 0, { equals: false }), [v2, j] = V(k ? "ready" : "unresolved");
  if (g.context) {
    f = `${g.context.id}${g.context.count++}`;
    let m2;
    i.ssrLoadFrom === "initial" ? o = i.initialValue : g.load && (m2 = g.load(f)) && (o = m2[0]);
  }
  function L2(m2, C, T2, J2) {
    return l === m2 && (l = null, k = true, (m2 === o || C === o) && i.onHydrated && queueMicrotask(() => i.onHydrated(J2, { value: C })), o = ce, u && m2 && a ? (u.promises.delete(m2), a = false, M(() => {
      u.running = true, ke2(C, T2);
    }, false)) : ke2(C, T2)), C;
  }
  function ke2(m2, C) {
    M(() => {
      C || S2(() => m2), j(C ? "errored" : "ready"), q2(C);
      for (let T2 of p2.keys())
        T2.decrement();
      p2.clear();
    }, false);
  }
  function le2() {
    let m2 = U && _(d, U.id), C = O2(), T2 = I2();
    if (T2 && !l)
      throw T2;
    return h && !h.user && m2 && ve(() => {
      b(), l && (m2.resolved && u && a ? u.promises.add(l) : p2.has(m2) || (m2.increment(), p2.add(m2)));
    }), C;
  }
  function ue2(m2 = true) {
    if (m2 !== false && c)
      return;
    c = false;
    let C = w2 ? w2() : n;
    if (a = u && u.running, C == null || C === false) {
      L2(l, F(O2));
      return;
    }
    u && l && u.promises.delete(l);
    let T2 = o !== ce ? o : F(() => r(C, { value: O2(), refetching: m2 }));
    return typeof T2 != "object" || !(T2 && "then" in T2) ? (L2(l, T2, void 0, C), T2) : (l = T2, c = true, queueMicrotask(() => c = false), M(() => {
      j(k ? "refreshing" : "pending"), x2();
    }, false), T2.then((J2) => L2(T2, J2, void 0, C), (J2) => L2(T2, void 0, We(J2), C)));
  }
  return Object.defineProperties(le2, { state: { get: () => v2() }, error: { get: () => I2() }, loading: { get() {
    let m2 = v2();
    return m2 === "pending" || m2 === "refreshing";
  } }, latest: { get() {
    if (!k)
      return le2();
    let m2 = I2();
    if (m2 && !l)
      throw m2;
    return O2();
  } } }), w2 ? ve(() => ue2(false)) : ue2(false), [le2, { refetch: ue2, mutate: S2 }];
}
function wt(e, t) {
  let s, n = t ? t.timeoutMs : void 0, r = G(() => ((!s || !s.fn) && (s = Oe(() => l(() => r.value), n !== void 0 ? { timeout: n } : void 0)), e()), void 0, true), [i, l] = V(r.value, t);
  return N(r), l(() => r.value), i;
}
function bt(e, t = Te, s) {
  let n = /* @__PURE__ */ new Map(), r = G((i) => {
    let l = e();
    for (let [o, f] of n.entries())
      if (t(o, l) !== t(o, i))
        for (let a of f.values())
          a.state = P, a.pure ? y.push(a) : A.push(a);
    return l;
  }, void 0, true, P);
  return N(r), (i) => {
    let l = h;
    if (l) {
      let o;
      (o = n.get(i)) ? o.add(l) : n.set(i, o = /* @__PURE__ */ new Set([l])), D(() => {
        o.delete(l), !o.size && n.delete(i);
      });
    }
    return t(i, u && u.running && u.sources.has(r) ? r.tValue : r.value);
  };
}
function mt(e) {
  return M(e, false);
}
function F(e) {
  let t = h;
  h = null;
  try {
    return e();
  } finally {
    h = t;
  }
}
function yt(e, t, s) {
  let n = Array.isArray(e), r, i = s && s.defer;
  return (l) => {
    let o;
    if (n) {
      o = Array(e.length);
      for (let a = 0; a < e.length; a++)
        o[a] = e[a]();
    } else
      o = e();
    if (i) {
      i = false;
      return;
    }
    let f = F(() => t(o, r, l));
    return r = o, f;
  };
}
function xt(e) {
  Ie(() => F(e));
}
function D(e) {
  return d === null || (d.cleanups === null ? d.cleanups = [e] : d.cleanups.push(e)), e;
}
function Ce(e) {
  W || (W = Symbol("error")), d === null || (d.context === null ? d.context = { [W]: [e] } : d.context[W] ? d.context[W].push(e) : d.context[W] = [e]);
}
function kt() {
  return h;
}
function qe() {
  return d;
}
function St(e, t) {
  let s = d;
  d = e;
  try {
    return M(t, true);
  } catch (n) {
    xe(n);
  } finally {
    d = s;
  }
}
function vt(e = Oe) {
  Y = e;
}
function Ve(e) {
  if (u && u.running)
    return e(), u.done;
  let t = h, s = d;
  return Promise.resolve().then(() => {
    h = t, d = s;
    let n;
    return (Y || U) && (n = u || (u = { sources: /* @__PURE__ */ new Set(), effects: [], promises: /* @__PURE__ */ new Set(), disposed: /* @__PURE__ */ new Set(), queue: /* @__PURE__ */ new Set(), running: true }), n.done || (n.done = new Promise((r) => n.resolve = r)), n.running = true), M(e, false), h = d = null, n ? n.done : void 0;
  });
}
function Ct() {
  return [et, Ve];
}
function rt(e) {
  A.push.apply(A, e), e.length = 0;
}
function Me(e, t) {
  let s = Symbol("context");
  return { id: s, Provider: ot(s), defaultValue: e };
}
function je(e) {
  let t;
  return (t = _(d, e.id)) !== void 0 ? t : e.defaultValue;
}
function $e(e) {
  let t = E(e), s = E(() => pe(t()));
  return s.toArray = () => {
    let n = s();
    return Array.isArray(n) ? n : n != null ? [n] : [];
  }, s;
}
var U;
function st() {
  return U || (U = Me({}));
}
function Et(e) {
  if (B) {
    let t = B;
    B = (s, n) => {
      let r = t(s, n), i = e((l) => r.track(l), n);
      return { track: (l) => i.track(l), dispose() {
        i.dispose(), r.dispose();
      } };
    };
  } else
    B = e;
}
function Le() {
  let e = u && u.running;
  if (this.sources && (!e && this.state || e && this.tState))
    if (!e && this.state === P || e && this.tState === P)
      N(this);
    else {
      let t = y;
      y = null, M(() => se(this), false), y = t;
    }
  if (h) {
    let t = this.observers ? this.observers.length : 0;
    h.sources ? (h.sources.push(this), h.sourceSlots.push(t)) : (h.sources = [this], h.sourceSlots = [t]), this.observers ? (this.observers.push(h), this.observerSlots.push(h.sources.length - 1)) : (this.observers = [h], this.observerSlots = [h.sources.length - 1]);
  }
  return e && u.sources.has(this) ? this.tValue : this.value;
}
function Re(e, t, s) {
  let n = u && u.running && u.sources.has(e) ? e.tValue : e.value;
  if (!e.comparator || !e.comparator(n, t)) {
    if (u) {
      let r = u.running;
      (r || !s && u.sources.has(e)) && (u.sources.add(e), e.tValue = t), r || (e.value = t);
    } else
      e.value = t;
    e.observers && e.observers.length && M(() => {
      for (let r = 0; r < e.observers.length; r += 1) {
        let i = e.observers[r], l = u && u.running;
        l && u.disposed.has(i) || ((l && !i.tState || !l && !i.state) && (i.pure ? y.push(i) : A.push(i), i.observers && Ue(i)), l ? i.tState = P : i.state = P);
      }
      if (y.length > 1e6)
        throw y = [], new Error();
    }, false);
  }
  return t;
}
function N(e) {
  if (!e.fn)
    return;
  z(e);
  let t = d, s = h, n = ye;
  h = d = e, Ee(e, u && u.running && u.sources.has(e) ? e.tValue : e.value, n), u && !u.running && u.sources.has(e) && queueMicrotask(() => {
    M(() => {
      u && (u.running = true), h = d = e, Ee(e, e.tValue, n), h = d = null;
    }, false);
  }), h = s, d = t;
}
function Ee(e, t, s) {
  let n;
  try {
    n = e.fn(t);
  } catch (r) {
    e.pure && (u && u.running ? (e.tState = P, e.tOwned && e.tOwned.forEach(z), e.tOwned = void 0) : (e.state = P, e.owned && e.owned.forEach(z), e.owned = null)), xe(r);
  }
  (!e.updatedAt || e.updatedAt <= s) && (e.updatedAt != null && "observers" in e ? Re(e, n, true) : u && u.running && e.pure ? (u.sources.add(e), e.tValue = n) : e.value = n, e.updatedAt = s);
}
function G(e, t, s, n = P, r) {
  let i = { fn: e, state: n, updatedAt: null, owned: null, sources: null, sourceSlots: null, cleanups: null, value: t, owner: d, context: null, pure: s };
  if (u && u.running && (i.state = 0, i.tState = n), d === null || d !== Fe && (u && u.running && d.pure ? d.tOwned ? d.tOwned.push(i) : d.tOwned = [i] : d.owned ? d.owned.push(i) : d.owned = [i]), B) {
    let [l, o] = V(void 0, { equals: false }), f = B(i.fn, o);
    D(() => f.dispose());
    let a = () => Ve(o).then(() => c.dispose()), c = B(i.fn, a);
    i.fn = (k) => (l(), u && u.running ? c.track(k) : f.track(k));
  }
  return i;
}
function Z(e) {
  let t = u && u.running;
  if (!t && e.state === 0 || t && e.tState === 0)
    return;
  if (!t && e.state === H || t && e.tState === H)
    return se(e);
  if (e.suspense && F(e.suspense.inFallback))
    return e.suspense.effects.push(e);
  let s = [e];
  for (; (e = e.owner) && (!e.updatedAt || e.updatedAt < ye); ) {
    if (t && u.disposed.has(e))
      return;
    (!t && e.state || t && e.tState) && s.push(e);
  }
  for (let n = s.length - 1; n >= 0; n--) {
    if (e = s[n], t) {
      let r = e, i = s[n + 1];
      for (; (r = r.owner) && r !== i; )
        if (u.disposed.has(r))
          return;
    }
    if (!t && e.state === P || t && e.tState === P)
      N(e);
    else if (!t && e.state === H || t && e.tState === H) {
      let r = y;
      y = null, M(() => se(e, s[0]), false), y = r;
    }
  }
}
function M(e, t) {
  if (y)
    return e();
  let s = false;
  t || (y = []), A ? s = true : A = [], ye++;
  try {
    let n = e();
    return it(s), n;
  } catch (n) {
    y || (A = null), xe(n);
  }
}
function it(e) {
  if (y && (Y && u && u.running ? lt(y) : De(y), y = null), e)
    return;
  let t;
  if (u) {
    if (!u.promises.size && !u.queue.size) {
      let n = u.sources, r = u.disposed;
      A.push.apply(A, u.effects), t = u.resolve;
      for (let i of A)
        "tState" in i && (i.state = i.tState), delete i.tState;
      u = null, M(() => {
        for (let i of r)
          z(i);
        for (let i of n) {
          if (i.value = i.tValue, i.owned)
            for (let l = 0, o = i.owned.length; l < o; l++)
              z(i.owned[l]);
          i.tOwned && (i.owned = i.tOwned), delete i.tValue, delete i.tOwned, i.tState = 0;
        }
        Se(false);
      }, false);
    } else if (u.running) {
      u.running = false, u.effects.push.apply(u.effects, A), A = null, Se(true);
      return;
    }
  }
  let s = A;
  A = null, s.length && M(() => Pe(s), false), t && t();
}
function De(e) {
  for (let t = 0; t < e.length; t++)
    Z(e[t]);
}
function lt(e) {
  for (let t = 0; t < e.length; t++) {
    let s = e[t], n = u.queue;
    n.has(s) || (n.add(s), Y(() => {
      n.delete(s), M(() => {
        u.running = true, Z(s);
      }, false), u && (u.running = false);
    }));
  }
}
function ut(e) {
  let t, s = 0;
  for (t = 0; t < e.length; t++) {
    let n = e[t];
    n.user ? e[s++] = n : Z(n);
  }
  for (g.context && $(), t = 0; t < s; t++)
    Z(e[t]);
}
function se(e, t) {
  let s = u && u.running;
  s ? e.tState = 0 : e.state = 0;
  for (let n = 0; n < e.sources.length; n += 1) {
    let r = e.sources[n];
    r.sources && (!s && r.state === P || s && r.tState === P ? r !== t && Z(r) : (!s && r.state === H || s && r.tState === H) && se(r, t));
  }
}
function Ue(e) {
  let t = u && u.running;
  for (let s = 0; s < e.observers.length; s += 1) {
    let n = e.observers[s];
    (!t && !n.state || t && !n.tState) && (t ? n.tState = H : n.state = H, n.pure ? y.push(n) : A.push(n), n.observers && Ue(n));
  }
}
function z(e) {
  let t;
  if (e.sources)
    for (; e.sources.length; ) {
      let s = e.sources.pop(), n = e.sourceSlots.pop(), r = s.observers;
      if (r && r.length) {
        let i = r.pop(), l = s.observerSlots.pop();
        n < r.length && (i.sourceSlots[l] = n, r[n] = i, s.observerSlots[n] = l);
      }
    }
  if (u && u.running && e.pure) {
    if (e.tOwned) {
      for (t = 0; t < e.tOwned.length; t++)
        z(e.tOwned[t]);
      delete e.tOwned;
    }
    Ne(e, true);
  } else if (e.owned) {
    for (t = 0; t < e.owned.length; t++)
      z(e.owned[t]);
    e.owned = null;
  }
  if (e.cleanups) {
    for (t = 0; t < e.cleanups.length; t++)
      e.cleanups[t]();
    e.cleanups = null;
  }
  u && u.running ? e.tState = 0 : e.state = 0, e.context = null;
}
function Ne(e, t) {
  if (t || (e.tState = 0, u.disposed.add(e)), e.owned)
    for (let s = 0; s < e.owned.length; s++)
      Ne(e.owned[s]);
}
function We(e) {
  return e instanceof Error || typeof e == "string" ? e : new Error("Unknown error");
}
function xe(e) {
  e = We(e);
  let t = W && _(d, W);
  if (!t)
    throw e;
  for (let s of t)
    s(e);
}
function _(e, t) {
  return e ? e.context && e.context[t] !== void 0 ? e.context[t] : _(e.owner, t) : void 0;
}
function pe(e) {
  if (typeof e == "function" && !e.length)
    return pe(e());
  if (Array.isArray(e)) {
    let t = [];
    for (let s = 0; s < e.length; s++) {
      let n = pe(e[s]);
      Array.isArray(n) ? t.push.apply(t, n) : t.push(n);
    }
    return t;
  }
  return e;
}
function ot(e, t) {
  return function(n) {
    let r;
    return tt(() => r = F(() => (d.context = { [e]: n.value }, $e(() => n.children))), void 0), r;
  };
}
function Ot(e) {
  return { subscribe(t) {
    if (!(t instanceof Object) || t == null)
      throw new TypeError("Expected the observer to be an object.");
    let s = typeof t == "function" ? t : t.next && t.next.bind(t);
    if (!s)
      return { unsubscribe() {
      } };
    let n = K((r) => (Ie(() => {
      let i = e();
      F(() => s(i));
    }), r));
    return qe() && D(n), { unsubscribe() {
      n();
    } };
  }, [Symbol.observable || "@@observable"]() {
    return this;
  } };
}
function Tt(e) {
  let [t, s] = V(void 0, { equals: false });
  if ("subscribe" in e) {
    let n = e.subscribe((r) => s(() => r));
    D(() => "unsubscribe" in n ? n.unsubscribe() : n());
  } else {
    let n = e(s);
    D(n);
  }
  return t;
}
var we = Symbol("fallback");
function ie(e) {
  for (let t = 0; t < e.length; t++)
    e[t]();
}
function ct(e, t, s = {}) {
  let n = [], r = [], i = [], l = 0, o = t.length > 1 ? [] : null;
  return D(() => ie(i)), () => {
    let f = e() || [], a, c;
    return f[Ae], F(() => {
      let w2 = f.length, p2, O2, S2, I2, q2, b, x2, v2, j;
      if (w2 === 0)
        l !== 0 && (ie(i), i = [], n = [], r = [], l = 0, o && (o = [])), s.fallback && (n = [we], r[0] = K((L2) => (i[0] = L2, s.fallback())), l = 1);
      else if (l === 0) {
        for (r = new Array(w2), c = 0; c < w2; c++)
          n[c] = f[c], r[c] = K(k);
        l = w2;
      } else {
        for (S2 = new Array(w2), I2 = new Array(w2), o && (q2 = new Array(w2)), b = 0, x2 = Math.min(l, w2); b < x2 && n[b] === f[b]; b++)
          ;
        for (x2 = l - 1, v2 = w2 - 1; x2 >= b && v2 >= b && n[x2] === f[v2]; x2--, v2--)
          S2[v2] = r[x2], I2[v2] = i[x2], o && (q2[v2] = o[x2]);
        for (p2 = /* @__PURE__ */ new Map(), O2 = new Array(v2 + 1), c = v2; c >= b; c--)
          j = f[c], a = p2.get(j), O2[c] = a === void 0 ? -1 : a, p2.set(j, c);
        for (a = b; a <= x2; a++)
          j = n[a], c = p2.get(j), c !== void 0 && c !== -1 ? (S2[c] = r[a], I2[c] = i[a], o && (q2[c] = o[a]), c = O2[c], p2.set(j, c)) : i[a]();
        for (c = b; c < w2; c++)
          c in S2 ? (r[c] = S2[c], i[c] = I2[c], o && (o[c] = q2[c], o[c](c))) : r[c] = K(k);
        r = r.slice(0, l = w2), n = f.slice(0);
      }
      return r;
    });
    function k(w2) {
      if (i[c] = w2, o) {
        let [p2, O2] = V(c);
        return o[c] = O2, t(f[c], p2);
      }
      return t(f[c]);
    }
  };
}
function ft(e, t, s = {}) {
  let n = [], r = [], i = [], l = [], o = 0, f;
  return D(() => ie(i)), () => {
    let a = e() || [];
    return a[Ae], F(() => {
      if (a.length === 0)
        return o !== 0 && (ie(i), i = [], n = [], r = [], o = 0, l = []), s.fallback && (n = [we], r[0] = K((k) => (i[0] = k, s.fallback())), o = 1), r;
      for (n[0] === we && (i[0](), i = [], n = [], r = [], o = 0), f = 0; f < a.length; f++)
        f < n.length && n[f] !== a[f] ? l[f](() => a[f]) : f >= n.length && (r[f] = K(c));
      for (; f < n.length; f++)
        i[f]();
      return o = l.length = i.length = a.length, n = a.slice(0), r = r.slice(0, o);
    });
    function c(k) {
      i[f] = k;
      let [w2, p2] = V(a[f]);
      return l[f] = p2, t(w2, f);
    }
  };
}
var He = false;
function At() {
  He = true;
}
function ze(e, t) {
  if (He && g.context) {
    let s = g.context;
    $(Ze());
    let n = F(() => e(t || {}));
    return $(s), n;
  }
  return F(() => e(t || {}));
}
function ee() {
  return true;
}
var be = { get(e, t, s) {
  return t === ne ? s : e.get(t);
}, has(e, t) {
  return t === ne ? true : e.has(t);
}, set: ee, deleteProperty: ee, getOwnPropertyDescriptor(e, t) {
  return { configurable: true, enumerable: true, get() {
    return e.get(t);
  }, set: ee, deleteProperty: ee };
}, ownKeys(e) {
  return e.keys();
} };
function fe(e) {
  return (e = typeof e == "function" ? e() : e) ? e : {};
}
function Pt(...e) {
  let t = false;
  for (let n = 0; n < e.length; n++) {
    let r = e[n];
    t = t || !!r && ne in r, e[n] = typeof r == "function" ? (t = true, E(r)) : r;
  }
  if (t)
    return new Proxy({ get(n) {
      for (let r = e.length - 1; r >= 0; r--) {
        let i = fe(e[r])[n];
        if (i !== void 0)
          return i;
      }
    }, has(n) {
      for (let r = e.length - 1; r >= 0; r--)
        if (n in fe(e[r]))
          return true;
      return false;
    }, keys() {
      let n = [];
      for (let r = 0; r < e.length; r++)
        n.push(...Object.keys(fe(e[r])));
      return [...new Set(n)];
    } }, be);
  let s = {};
  for (let n = e.length - 1; n >= 0; n--)
    if (e[n]) {
      let r = Object.getOwnPropertyDescriptors(e[n]);
      for (let i in r)
        i in s || Object.defineProperty(s, i, { enumerable: true, get() {
          for (let l = e.length - 1; l >= 0; l--) {
            let o = (e[l] || {})[i];
            if (o !== void 0)
              return o;
          }
        } });
    }
  return s;
}
function Ft(e, ...t) {
  let s = new Set(t.flat());
  if (ne in e) {
    let r = t.map((i) => new Proxy({ get(l) {
      return i.includes(l) ? e[l] : void 0;
    }, has(l) {
      return i.includes(l) && l in e;
    }, keys() {
      return i.filter((l) => l in e);
    } }, be));
    return r.push(new Proxy({ get(i) {
      return s.has(i) ? void 0 : e[i];
    }, has(i) {
      return s.has(i) ? false : i in e;
    }, keys() {
      return Object.keys(e).filter((i) => !s.has(i));
    } }, be)), r;
  }
  let n = Object.getOwnPropertyDescriptors(e);
  return t.push(Object.keys(n).filter((r) => !s.has(r))), t.map((r) => {
    let i = {};
    for (let l = 0; l < r.length; l++) {
      let o = r[l];
      o in e && Object.defineProperty(i, o, n[o] ? n[o] : { get() {
        return e[o];
      }, set() {
        return true;
      }, enumerable: true });
    }
    return i;
  });
}
function It(e) {
  let t, s, n = (r) => {
    let i = g.context;
    if (i) {
      let [o, f] = V();
      (s || (s = e())).then((a) => {
        $(i), f(() => a.default), $();
      }), t = o;
    } else if (!t) {
      let [o] = nt(() => (s || (s = e())).then((f) => f.default));
      t = o;
    }
    let l;
    return E(() => (l = t()) && F(() => {
      if (!i)
        return l(r);
      let o = g.context;
      $(i);
      let f = l(r);
      return $(o), f;
    }));
  };
  return n.preload = () => s || ((s = e()).then((r) => t = () => r.default), s), n;
}
var at = 0;
function qt() {
  let e = g.context;
  return e ? `${e.id}${e.count++}` : `cl-${at++}`;
}
function Vt(e) {
  let t = "fallback" in e && { fallback: () => e.fallback };
  return E(ct(() => e.each, e.children, t || void 0));
}
function Mt(e) {
  let t = "fallback" in e && { fallback: () => e.fallback };
  return E(ft(() => e.each, e.children, t || void 0));
}
function jt(e) {
  let t = false, s = e.keyed, n = E(() => e.when, void 0, { equals: (r, i) => t ? r === i : !r == !i });
  return E(() => {
    let r = n();
    if (r) {
      let i = e.children, l = typeof i == "function" && i.length > 0;
      return t = s || l, l ? F(() => i(r)) : i;
    }
    return e.fallback;
  }, void 0, void 0);
}
function $t(e) {
  let t = false, s = false, n = (l, o) => l[0] === o[0] && (t ? l[1] === o[1] : !l[1] == !o[1]) && l[2] === o[2], r = $e(() => e.children), i = E(() => {
    let l = r();
    Array.isArray(l) || (l = [l]);
    for (let o = 0; o < l.length; o++) {
      let f = l[o].when;
      if (f)
        return s = !!l[o].keyed, [o, f, l[o]];
    }
    return [-1];
  }, void 0, { equals: n });
  return E(() => {
    let [l, o, f] = i();
    if (l < 0)
      return e.fallback;
    let a = f.children, c = typeof a == "function" && a.length > 0;
    return t = s || c, c ? F(() => a(o)) : a;
  }, void 0, void 0);
}
function Lt(e) {
  return e;
}
var X;
function Rt() {
  X && [...X].forEach((e) => e());
}
function Dt(e) {
  let t, s;
  g.context && g.load && (s = g.load(g.context.id + g.context.count)) && (t = s[0]);
  let [n, r] = V(t, void 0);
  return X || (X = /* @__PURE__ */ new Set()), X.add(r), D(() => X.delete(r)), E(() => {
    let i;
    if (i = n()) {
      let l = e.fallback, o = typeof l == "function" && l.length ? F(() => l(i, () => r())) : l;
      return Ce(r), o;
    }
    return Ce(r), e.children;
  }, void 0, void 0);
}
var dt = (e, t) => e.showContent === t.showContent && e.showFallback === t.showFallback, me = Me();
function Ut(e) {
  let [t, s] = V(() => ({ inFallback: false })), n, r = je(me), [i, l] = V([]);
  r && (n = r.register(E(() => t()().inFallback)));
  let o = E((f) => {
    let a = e.revealOrder, c = e.tail, { showContent: k = true, showFallback: w2 = true } = n ? n() : {}, p2 = i(), O2 = a === "backwards";
    if (a === "together") {
      let b = p2.every((v2) => !v2()), x2 = p2.map(() => ({ showContent: b && k, showFallback: w2 }));
      return x2.inFallback = !b, x2;
    }
    let S2 = false, I2 = f.inFallback, q2 = [];
    for (let b = 0, x2 = p2.length; b < x2; b++) {
      let v2 = O2 ? x2 - b - 1 : b, j = p2[v2]();
      if (!S2 && !j)
        q2[v2] = { showContent: k, showFallback: w2 };
      else {
        let L2 = !S2;
        L2 && (I2 = true), q2[v2] = { showContent: L2, showFallback: !c || L2 && c === "collapsed" ? w2 : false }, S2 = true;
      }
    }
    return S2 || (I2 = false), q2.inFallback = I2, q2;
  }, { inFallback: false });
  return s(() => o), ze(me.Provider, { value: { register: (f) => {
    let a;
    return l((c) => (a = c.length, [...c, f])), E(() => o()[a], void 0, { equals: dt });
  } }, get children() {
    return e.children;
  } });
}
function Nt(e) {
  let t = 0, s, n, r, i, l, [o, f] = V(false), a = st(), c = { increment: () => {
    ++t === 1 && f(true);
  }, decrement: () => {
    --t === 0 && f(false);
  }, inFallback: o, effects: [], resolved: false }, k = qe();
  if (g.context && g.load) {
    let O2 = g.context.id + g.context.count, S2 = g.load(O2);
    if (S2 && (r = S2[0]) && r !== "$$f") {
      (typeof r != "object" || !("then" in r)) && (r = Promise.resolve(r));
      let [I2, q2] = V(void 0, { equals: false });
      i = I2, r.then((b) => {
        if (b || g.done)
          return b && (l = b), q2();
        g.gather(O2), $(n), q2(), $();
      });
    }
  }
  let w2 = je(me);
  w2 && (s = w2.register(c.inFallback));
  let p2;
  return D(() => p2 && p2()), ze(a.Provider, { value: c, get children() {
    return E(() => {
      if (l)
        throw l;
      if (n = g.context, i)
        return i(), i = void 0;
      n && r === "$$f" && $();
      let O2 = E(() => e.children);
      return E((S2) => {
        let I2 = c.inFallback(), { showContent: q2 = true, showFallback: b = true } = s ? s() : {};
        if ((!I2 || r && r !== "$$f") && q2)
          return c.resolved = true, p2 && p2(), p2 = n = r = void 0, rt(c.effects), O2();
        if (b)
          return p2 ? S2 : K((x2) => (p2 = x2, n && ($({ id: n.id + "f", count: 0 }), n = void 0), e.fallback), k);
      });
    });
  } });
}
var Wt;

// http-url:https://esm.sh/v103/solid-js@1.6.9/esnext/web.js
var G2 = ["allowfullscreen", "async", "autofocus", "autoplay", "checked", "controls", "default", "disabled", "formnovalidate", "hidden", "indeterminate", "ismap", "loop", "multiple", "muted", "nomodule", "novalidate", "open", "playsinline", "readonly", "required", "reversed", "seamless", "selected"], I = /* @__PURE__ */ new Set(["className", "value", "readOnly", "formNoValidate", "isMap", "noModule", "playsInline", ...G2]), V2 = /* @__PURE__ */ new Set(["innerHTML", "textContent", "innerText", "children"]), F2 = Object.assign(/* @__PURE__ */ Object.create(null), { className: "class", htmlFor: "for" }), N2 = Object.assign(/* @__PURE__ */ Object.create(null), { class: "className", formnovalidate: "formNoValidate", ismap: "isMap", nomodule: "noModule", playsinline: "playsInline", readonly: "readOnly" }), _2 = /* @__PURE__ */ new Set(["beforeinput", "click", "dblclick", "contextmenu", "focusin", "focusout", "input", "keydown", "keyup", "mousedown", "mousemove", "mouseout", "mouseover", "mouseup", "pointerdown", "pointermove", "pointerout", "pointerover", "pointerup", "touchend", "touchmove", "touchstart"]), R2 = /* @__PURE__ */ new Set(["altGlyph", "altGlyphDef", "altGlyphItem", "animate", "animateColor", "animateMotion", "animateTransform", "circle", "clipPath", "color-profile", "cursor", "defs", "desc", "ellipse", "feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence", "filter", "font", "font-face", "font-face-format", "font-face-name", "font-face-src", "font-face-uri", "foreignObject", "g", "glyph", "glyphRef", "hkern", "image", "line", "linearGradient", "marker", "mask", "metadata", "missing-glyph", "mpath", "path", "pattern", "polygon", "polyline", "radialGradient", "rect", "set", "stop", "svg", "switch", "symbol", "text", "textPath", "tref", "tspan", "use", "view", "vkern"]), K2 = { xlink: "http://www.w3.org/1999/xlink", xml: "http://www.w3.org/XML/1998/namespace" }, ae2 = /* @__PURE__ */ new Set(["html", "base", "head", "link", "meta", "style", "title", "body", "address", "article", "aside", "footer", "header", "main", "nav", "section", "body", "blockquote", "dd", "div", "dl", "dt", "figcaption", "figure", "hr", "li", "ol", "p", "pre", "ul", "a", "abbr", "b", "bdi", "bdo", "br", "cite", "code", "data", "dfn", "em", "i", "kbd", "mark", "q", "rp", "rt", "ruby", "s", "samp", "small", "span", "strong", "sub", "sup", "time", "u", "var", "wbr", "area", "audio", "img", "map", "track", "video", "embed", "iframe", "object", "param", "picture", "portal", "source", "svg", "math", "canvas", "noscript", "script", "del", "ins", "caption", "col", "colgroup", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "button", "datalist", "fieldset", "form", "input", "label", "legend", "meter", "optgroup", "option", "output", "progress", "select", "textarea", "details", "dialog", "menu", "summary", "details", "slot", "template", "acronym", "applet", "basefont", "bgsound", "big", "blink", "center", "content", "dir", "font", "frame", "frameset", "hgroup", "image", "keygen", "marquee", "menuitem", "nobr", "noembed", "noframes", "plaintext", "rb", "rtc", "shadow", "spacer", "strike", "tt", "xmp", "a", "abbr", "acronym", "address", "applet", "area", "article", "aside", "audio", "b", "base", "basefont", "bdi", "bdo", "bgsound", "big", "blink", "blockquote", "body", "br", "button", "canvas", "caption", "center", "cite", "code", "col", "colgroup", "content", "data", "datalist", "dd", "del", "details", "dfn", "dialog", "dir", "div", "dl", "dt", "em", "embed", "fieldset", "figcaption", "figure", "font", "footer", "form", "frame", "frameset", "head", "header", "hgroup", "hr", "html", "i", "iframe", "image", "img", "input", "ins", "kbd", "keygen", "label", "legend", "li", "link", "main", "map", "mark", "marquee", "menu", "menuitem", "meta", "meter", "nav", "nobr", "noembed", "noframes", "noscript", "object", "ol", "optgroup", "option", "output", "p", "param", "picture", "plaintext", "portal", "pre", "progress", "q", "rb", "rp", "rt", "rtc", "ruby", "s", "samp", "script", "section", "select", "shadow", "slot", "small", "source", "spacer", "span", "strike", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "title", "tr", "track", "tt", "u", "ul", "var", "video", "wbr", "xmp", "input"]);
function Y2(n, e, t) {
  let i = t.length, o = e.length, r = i, l = 0, s = 0, a = e[o - 1].nextSibling, c = null;
  for (; l < o || s < r; ) {
    if (e[l] === t[s]) {
      l++, s++;
      continue;
    }
    for (; e[o - 1] === t[r - 1]; )
      o--, r--;
    if (o === l) {
      let d2 = r < i ? s ? t[s - 1].nextSibling : t[r - s] : a;
      for (; s < r; )
        n.insertBefore(t[s++], d2);
    } else if (r === s)
      for (; l < o; )
        (!c || !c.has(e[l])) && e[l].remove(), l++;
    else if (e[l] === t[r - 1] && t[s] === e[o - 1]) {
      let d2 = e[--o].nextSibling;
      n.insertBefore(t[s++], e[l++].nextSibling), n.insertBefore(t[--r], d2), e[o] = t[r];
    } else {
      if (!c) {
        c = /* @__PURE__ */ new Map();
        let u2 = s;
        for (; u2 < r; )
          c.set(t[u2], u2++);
      }
      let d2 = c.get(e[l]);
      if (d2 != null)
        if (s < d2 && d2 < r) {
          let u2 = l, b = 1, A2;
          for (; ++u2 < o && u2 < r && !((A2 = c.get(e[u2])) == null || A2 !== d2 + b); )
            b++;
          if (b > d2 - s) {
            let j = e[l];
            for (; s < d2; )
              n.insertBefore(t[s++], j);
          } else
            n.replaceChild(t[s++], e[l++]);
        } else
          l++;
      else
        e[l++].remove();
    }
  }
}
var y2 = "_$DX_DELEGATE";
function v(n, e, t, i = {}) {
  let o;
  return K((r) => {
    o = r, e === document ? n() : p(e, n(), e.firstChild ? null : void 0, t);
  }, i.owner), () => {
    o(), e.textContent = "";
  };
}
function de2(n, e, t) {
  let i = document.createElement("template");
  i.innerHTML = n;
  let o = i.content.firstChild;
  return t && (o = o.firstChild), o;
}
function X2(n, e = window.document) {
  let t = e[y2] || (e[y2] = /* @__PURE__ */ new Set());
  for (let i = 0, o = n.length; i < o; i++) {
    let r = n[i];
    t.has(r) || (t.add(r), e.addEventListener(r, x));
  }
}
function ue(n = window.document) {
  if (n[y2]) {
    for (let e of n[y2].keys())
      n.removeEventListener(e, x);
    delete n[y2];
  }
}
function O(n, e, t) {
  t == null ? n.removeAttribute(e) : n.setAttribute(e, t);
}
function U2(n, e, t, i) {
  i == null ? n.removeAttributeNS(e, t) : n.setAttributeNS(e, t, i);
}
function W2(n, e) {
  e == null ? n.removeAttribute("class") : n.className = e;
}
function J(n, e, t, i) {
  if (i)
    Array.isArray(t) ? (n[`$$${e}`] = t[0], n[`$$${e}Data`] = t[1]) : n[`$$${e}`] = t;
  else if (Array.isArray(t)) {
    let o = t[0];
    n.addEventListener(e, t[0] = (r) => o.call(n, t[1], r));
  } else
    n.addEventListener(e, t);
}
function Q2(n, e, t = {}) {
  let i = Object.keys(e || {}), o = Object.keys(t), r, l;
  for (r = 0, l = o.length; r < l; r++) {
    let s = o[r];
    !s || s === "undefined" || e[s] || (L(n, s, false), delete t[s]);
  }
  for (r = 0, l = i.length; r < l; r++) {
    let s = i[r], a = !!e[s];
    !s || s === "undefined" || t[s] === a || !a || (L(n, s, true), t[s] = a);
  }
  return t;
}
function Z2(n, e, t) {
  if (!e)
    return t ? O(n, "style") : e;
  let i = n.style;
  if (typeof e == "string")
    return i.cssText = e;
  typeof t == "string" && (i.cssText = t = void 0), t || (t = {}), e || (e = {});
  let o, r;
  for (r in t)
    e[r] == null && i.removeProperty(r), delete t[r];
  for (r in e)
    o = e[r], o !== t[r] && (i.setProperty(r, o), t[r] = o);
  return t;
}
function z2(n, e = {}, t, i) {
  let o = {};
  return i || tt(() => o.children = g2(n, e.children, o.children)), tt(() => e.ref && e.ref(n)), tt(() => ee2(n, e, t, true, o, true)), o;
}
function me2(n, e) {
  let t = n[e];
  return Object.defineProperty(n, e, { get() {
    return t();
  }, enumerable: true }), n;
}
function he2(n, e) {
  !g.context && (n.innerHTML = e);
}
function ge2(n, e, t) {
  return F(() => n(e, t));
}
function p(n, e, t, i) {
  if (t !== void 0 && !i && (i = []), typeof e != "function")
    return g2(n, e, i, t);
  tt((o) => g2(n, e(), o, t), i);
}
function ee2(n, e, t, i, o = {}, r = false) {
  e || (e = {});
  for (let l in o)
    if (!(l in e)) {
      if (l === "children")
        continue;
      o[l] = M2(n, l, null, o[l], t, r);
    }
  for (let l in e) {
    if (l === "children") {
      i || g2(n, e.children);
      continue;
    }
    let s = e[l];
    o[l] = M2(n, l, s, o[l], t, r);
  }
}
function te2(n, e, t = {}) {
  g.completed = globalThis._$HY.completed, g.events = globalThis._$HY.events, g.load = globalThis._$HY.load, g.gather = (o) => $2(e, o), g.registry = /* @__PURE__ */ new Map(), g.context = { id: t.renderId || "", count: 0 }, $2(e, t.renderId);
  let i = v(n, e, [...e.childNodes], t);
  return g.context = null, i;
}
function ne2(n) {
  let e, t;
  return !g.context || !(e = g.registry.get(t = oe2())) ? n.cloneNode(true) : (g.completed && g.completed.add(e), g.registry.delete(t), e);
}
function ye2(n, e) {
  for (; n && n.localName !== e; )
    n = n.nextSibling;
  return n;
}
function be2(n) {
  let e = n, t = 0, i = [];
  if (g.context)
    for (; e; ) {
      if (e.nodeType === 8) {
        let o = e.nodeValue;
        if (o === "#")
          t++;
        else if (o === "/") {
          if (t === 0)
            return [e, i];
          t--;
        }
      }
      i.push(e), e = e.nextSibling;
    }
  return [e, i];
}
function pe2() {
  g.events && !g.events.queued && (queueMicrotask(() => {
    let { completed: n, events: e } = g;
    for (e.queued = false; e.length; ) {
      let [t, i] = e[0];
      if (!n.has(t))
        return;
      x(i), e.shift();
    }
  }), g.events.queued = true);
}
function ie2(n) {
  return n.toLowerCase().replace(/-([a-z])/g, (e, t) => t.toUpperCase());
}
function L(n, e, t) {
  let i = e.trim().split(/\s+/);
  for (let o = 0, r = i.length; o < r; o++)
    n.classList.toggle(i[o], t);
}
function M2(n, e, t, i, o, r) {
  let l, s, a;
  if (e === "style")
    return Z2(n, t, i);
  if (e === "classList")
    return Q2(n, t, i);
  if (t === i)
    return i;
  if (e === "ref")
    r || t(n);
  else if (e.slice(0, 3) === "on:") {
    let c = e.slice(3);
    i && n.removeEventListener(c, i), t && n.addEventListener(c, t);
  } else if (e.slice(0, 10) === "oncapture:") {
    let c = e.slice(10);
    i && n.removeEventListener(c, i, true), t && n.addEventListener(c, t, true);
  } else if (e.slice(0, 2) === "on") {
    let c = e.slice(2).toLowerCase(), d2 = _2.has(c);
    if (!d2 && i) {
      let u2 = Array.isArray(i) ? i[0] : i;
      n.removeEventListener(c, u2);
    }
    (d2 || t) && (J(n, c, t, d2), d2 && X2([c]));
  } else if ((a = V2.has(e)) || !o && (N2[e] || (s = I.has(e))) || (l = n.nodeName.includes("-")))
    e === "class" || e === "className" ? W2(n, t) : l && !s && !a ? n[ie2(e)] = t : n[N2[e] || e] = t;
  else {
    let c = o && e.indexOf(":") > -1 && K2[e.split(":")[0]];
    c ? U2(n, c, e, t) : O(n, F2[e] || e, t);
  }
  return t;
}
function x(n) {
  let e = `$$${n.type}`, t = n.composedPath && n.composedPath()[0] || n.target;
  for (n.target !== t && Object.defineProperty(n, "target", { configurable: true, value: t }), Object.defineProperty(n, "currentTarget", { configurable: true, get() {
    return t || document;
  } }), g.registry && !g.done && (g.done = true, document.querySelectorAll("[id^=pl-]").forEach((i) => {
    for (; i && i.nodeType !== 8 && i.nodeValue !== "pl-" + n; ) {
      let o = i.nextSibling;
      i.remove(), i = o;
    }
    i && i.remove();
  })); t; ) {
    let i = t[e];
    if (i && !t.disabled) {
      let o = t[`${e}Data`];
      if (o !== void 0 ? i.call(t, o, n) : i.call(t, n), n.cancelBubble)
        return;
    }
    t = t._$host || t.parentNode || t.host;
  }
}
function g2(n, e, t, i, o) {
  for (g.context && !t && (t = [...n.childNodes]); typeof t == "function"; )
    t = t();
  if (e === t)
    return t;
  let r = typeof e, l = i !== void 0;
  if (n = l && t[0] && t[0].parentNode || n, r === "string" || r === "number") {
    if (g.context)
      return t;
    if (r === "number" && (e = e.toString()), l) {
      let s = t[0];
      s && s.nodeType === 3 ? s.data = e : s = document.createTextNode(e), t = m(n, t, i, s);
    } else
      t !== "" && typeof t == "string" ? t = n.firstChild.data = e : t = n.textContent = e;
  } else if (e == null || r === "boolean") {
    if (g.context)
      return t;
    t = m(n, t, i);
  } else {
    if (r === "function")
      return tt(() => {
        let s = e();
        for (; typeof s == "function"; )
          s = s();
        t = g2(n, s, t, i);
      }), () => t;
    if (Array.isArray(e)) {
      let s = [], a = t && Array.isArray(t);
      if (w(s, e, t, o))
        return tt(() => t = g2(n, s, t, i, true)), () => t;
      if (g.context) {
        if (!s.length)
          return t;
        for (let c = 0; c < s.length; c++)
          if (s[c].parentNode)
            return t = s;
      }
      if (s.length === 0) {
        if (t = m(n, t, i), l)
          return t;
      } else
        a ? t.length === 0 ? T(n, s, i) : Y2(n, t, s) : (t && m(n), T(n, s));
      t = s;
    } else if (e instanceof Node) {
      if (g.context && e.parentNode)
        return t = l ? [e] : e;
      if (Array.isArray(t)) {
        if (l)
          return t = m(n, t, i, e);
        m(n, t, null, e);
      } else
        t == null || t === "" || !n.firstChild ? n.appendChild(e) : n.replaceChild(e, n.firstChild);
      t = e;
    }
  }
  return t;
}
function w(n, e, t, i) {
  let o = false;
  for (let r = 0, l = e.length; r < l; r++) {
    let s = e[r], a = t && t[r];
    if (s instanceof Node)
      n.push(s);
    else if (!(s == null || s === true || s === false))
      if (Array.isArray(s))
        o = w(n, s, a) || o;
      else if (typeof s == "function")
        if (i) {
          for (; typeof s == "function"; )
            s = s();
          o = w(n, Array.isArray(s) ? s : [s], Array.isArray(a) ? a : [a]) || o;
        } else
          n.push(s), o = true;
      else {
        let c = String(s);
        a && a.nodeType === 3 && a.data === c ? n.push(a) : n.push(document.createTextNode(c));
      }
  }
  return o;
}
function T(n, e, t = null) {
  for (let i = 0, o = e.length; i < o; i++)
    n.insertBefore(e[i], t);
}
function m(n, e, t, i) {
  if (t === void 0)
    return n.textContent = "";
  let o = i || document.createTextNode("");
  if (e.length) {
    let r = false;
    for (let l = e.length - 1; l >= 0; l--) {
      let s = e[l];
      if (o !== s) {
        let a = s.parentNode === n;
        !r && !l ? a ? n.replaceChild(o, s) : n.insertBefore(o, t) : a && s.remove();
      } else
        r = true;
    }
  } else
    n.insertBefore(o, t);
  return [o];
}
function $2(n, e) {
  let t = n.querySelectorAll("*[data-hk]");
  for (let i = 0; i < t.length; i++) {
    let o = t[i], r = o.getAttribute("data-hk");
    (!e || r.startsWith(e)) && !g.registry.has(r) && g.registry.set(r, o);
  }
}
function oe2() {
  let n = g.context;
  return `${n.id}${n.count++}`;
}
function we2(n) {
  return g.context ? void 0 : n.children;
}
function xe2(n) {
  return n.children;
}
function Se2() {
}
function S(n) {
  let e = new Error(`${n.name} is not supported in the browser, returning undefined`);
  console.error(e);
}
function se2(n, e) {
  S(se2);
}
function re2(n, e) {
  S(re2);
}
function le(n, e) {
  S(le);
}
function Ae2(n, ...e) {
}
function Ee2(n, e, t, i) {
}
function Ce2(n) {
}
function ke(n) {
}
function Ne2(n, e) {
}
function Le2() {
}
function Me2(n) {
}
function Te2(n) {
}
function $e2(n, e, t) {
}
var Pe2 = false, fe2 = "http://www.w3.org/2000/svg";
function q(n, e = false) {
  return e ? document.createElementNS(fe2, n) : document.createElement(n);
}
var He2 = (...n) => (At(), te2(...n));
function Oe2(n) {
  let { useShadow: e } = n, t = document.createTextNode(""), i = n.mount || document.body;
  function o() {
    if (g.context) {
      let [r, l] = V(false);
      return queueMicrotask(() => l(true)), () => r() && n.children;
    } else
      return () => n.children;
  }
  if (i instanceof HTMLHeadElement) {
    let [r, l] = V(false), s = () => l(true);
    K((a) => p(i, () => r() ? a() : o()(), null)), D(() => {
      g.context ? queueMicrotask(s) : s();
    });
  } else {
    let r = q(n.isSVG ? "g" : "div", n.isSVG), l = e && r.attachShadow ? r.attachShadow({ mode: "open" }) : r;
    Object.defineProperty(r, "_$host", { get() {
      return t.parentNode;
    }, configurable: true }), p(l, o()), i.appendChild(r), n.ref && n.ref(r), D(() => i.removeChild(r));
  }
  return t;
}
function qe2(n) {
  let [e, t] = Ft(n, ["component"]), i = E(() => e.component);
  return E(() => {
    let o = i();
    switch (typeof o) {
      case "function":
        return F(() => o(t));
      case "string":
        let r = R2.has(o), l = g.context ? ne2() : q(o, r);
        return z2(l, t, r), l;
    }
  });
}

// _tmp/solid-shorty.jsx
var _tmpl$ = /* @__PURE__ */ template(`<div>The solidify shortcode is active!</div>`, 2);
function Solidify() {
  return _tmpl$.cloneNode(true);
}
v(() => createComponent(Solidify, {}), document.getElementById("shorty"));