(() => {
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
      let m = 0;
      let n = taskQueue2.length - 1;
      while (m <= n) {
        const k = n + m >> 1;
        const cmp = task.expirationTime - taskQueue2[k].expirationTime;
        if (cmp > 0)
          m = k + 1;
        else if (cmp < 0)
          n = k - 1;
        else
          return k;
      }
      return m;
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
      let v;
      if (options.ssrLoadFrom === "initial")
        initP = options.initialValue;
      else if (sharedConfig.load && (v = sharedConfig.load(id)))
        initP = v[0];
    }
    function loadEnd(p, v, error2, key) {
      if (pr === p) {
        pr = null;
        resolved = true;
        if ((p === initP || v === initP) && options.onHydrated)
          queueMicrotask(() => options.onHydrated(key, {
            value: v
          }));
        initP = NO_INIT;
        if (Transition && p && loadedUnderTransition) {
          Transition.promises.delete(p);
          loadedUnderTransition = false;
          runUpdates(() => {
            Transition.running = true;
            completeLoad(v, error2);
          }, false);
        } else
          completeLoad(v, error2);
      }
      return v;
    }
    function completeLoad(v, err) {
      runUpdates(() => {
        if (!err)
          setValue(() => v);
        setState(err ? "errored" : "ready");
        setError(err);
        for (const c of contexts.keys())
          c.decrement();
        contexts.clear();
      }, false);
    }
    function read() {
      const c = SuspenseContext && lookup(Owner, SuspenseContext.id), v = value(), err = error();
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
      return v;
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
      const p = initP !== NO_INIT ? initP : untrack(() => fetcher(lookup2, {
        value: value(),
        refetching
      }));
      if (typeof p !== "object" || !(p && "then" in p)) {
        loadEnd(pr, p, void 0, lookup2);
        return p;
      }
      pr = p;
      scheduled = true;
      queueMicrotask(() => scheduled = false);
      runUpdates(() => {
        setState(resolved ? "refreshing" : "pending");
        trigger();
      }, false);
      return p.then((v) => loadEnd(p, v, void 0, lookup2), (e) => loadEnd(p, void 0, castError(e), lookup2));
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
    const node = createComputation((p) => {
      const v = source();
      for (const [key, val] of subs.entries())
        if (fn(key, v) !== fn(key, p)) {
          for (const c of val.values()) {
            c.state = STALE;
            if (c.pure)
              Updates.push(c);
            else
              Effects.push(c);
          }
        }
      return v;
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
        const source = factory((x) => oldSource.track(x), trigger);
        return {
          track: (x) => source.track(x),
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
      c.fn = (x) => {
        track();
        return Transition && Transition.running ? inTransition.track(x) : ordinary.track(x);
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
          for (const d of disposed)
            cleanNode(d);
          for (const v of sources) {
            v.value = v.tValue;
            if (v.owned) {
              for (let i = 0, len = v.owned.length; i < len; i++)
                cleanNode(v.owned[i]);
            }
            if (v.tOwned)
              v.owned = v.tOwned;
            delete v.tValue;
            delete v.tOwned;
            v.tState = 0;
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
            const v = input();
            untrack(() => handler(v));
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
      const unsub = producer.subscribe((v) => set(() => v));
      onCleanup(() => "unsubscribe" in unsub ? unsub.unsubscribe() : unsub());
    } else {
      const clean = producer(set);
      onCleanup(clean);
    }
    return s;
  }
  var FALLBACK = Symbol("fallback");
  function dispose(d) {
    for (let i = 0; i < d.length; i++)
      d[i]();
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
    get(_, property, receiver) {
      if (property === $PROXY)
        return receiver;
      return _.get(property);
    },
    has(_, property) {
      if (property === $PROXY)
        return true;
      return _.has(property);
    },
    set: trueFn,
    deleteProperty: trueFn,
    getOwnPropertyDescriptor(_, property) {
      return {
        configurable: true,
        enumerable: true,
        get() {
          return _.get(property);
        },
        set: trueFn,
        deleteProperty: trueFn
      };
    },
    ownKeys(_) {
      return _.keys();
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
            const v = resolveSource(sources[i])[property];
            if (v !== void 0)
              return v;
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
                const v = (sources[i2] || {})[key];
                if (v !== void 0)
                  return v;
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
    let p;
    const wrap = (props) => {
      const ctx = sharedConfig.context;
      if (ctx) {
        const [s, set] = createSignal();
        (p || (p = fn())).then((mod) => {
          setHydrateContext(ctx);
          set(() => mod.default);
          setHydrateContext();
        });
        comp = s;
      } else if (!comp) {
        const [s] = createResource(() => (p || (p = fn())).then((mod) => mod.default));
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
    wrap.preload = () => p || ((p = fn()).then((mod) => comp = () => mod.default), p);
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
    let v;
    if (sharedConfig.context && sharedConfig.load && (v = sharedConfig.load(sharedConfig.context.id + sharedConfig.context.count)))
      err = v[0];
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
    let counter2 = 0, show, ctx, p, flicker, error;
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
      if (ref && (p = ref[0]) && p !== "$$f") {
        if (typeof p !== "object" || !("then" in p))
          p = Promise.resolve(p);
        const [s, set] = createSignal(void 0, {
          equals: false
        });
        flicker = s;
        p.then((err) => {
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
          if (ctx && p === "$$f")
            setHydrateContext();
          const rendered = createMemo(() => props.children);
          return createMemo((prev) => {
            const inFallback2 = store.inFallback(), {
              showContent = true,
              showFallback = true
            } = show ? show() : {};
            if ((!inFallback2 || p && p !== "$$f") && showContent) {
              store.resolved = true;
              dispose2 && dispose2();
              dispose2 = ctx = p = void 0;
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
    let v, s;
    for (s in prev) {
      value[s] == null && nodeStyle.removeProperty(s);
      delete prev[s];
    }
    for (s in value) {
      v = value[s];
      if (v !== prev[s]) {
        nodeStyle.setProperty(s, v);
        prev[s] = v;
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
          const v = end.nodeValue;
          if (v === "#")
            count++;
          else if (v === "/") {
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
    return name.toLowerCase().replace(/-([a-z])/g, (_, w) => w.toUpperCase());
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
        const h = Array.isArray(prev) ? prev[0] : prev;
        node.removeEventListener(name, h);
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
          let x = elem.nextSibling;
          elem.remove();
          elem = x;
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
        let v = value();
        while (typeof v === "function")
          v = v();
        current = insertExpression(parent, v, current, marker);
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
    const [p, others] = splitProps(props, ["component"]);
    const cached = createMemo(() => p.component);
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

  // src/scripts/jsx/app.jsx
  var _tmpl$ = /* @__PURE__ */ template(`<div>Count value is </div>`, 2);
  var CountingComponent = () => {
    const [count, setCount] = createSignal(0);
    const interval = setInterval(() => setCount((c) => c + 1), 1e3);
    onCleanup(() => clearInterval(interval));
    return (() => {
      const _el$ = _tmpl$.cloneNode(true), _el$2 = _el$.firstChild;
      insert(_el$, count, null);
      return _el$;
    })();
  };
  render(() => createComponent(CountingComponent, {}), document.getElementById("app"));
})();
//# sourceMappingURL=app-XWMNSWQ5.js.map
