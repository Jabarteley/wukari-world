// OWNER: spaces
// THE SCRIPT SANDBOX of a 3D space (docs/SPACES-3D.md, phase 4). This page is loaded in an <iframe sandbox="allow-scripts">: an
// opaque origin with no cookies, no storage and no reach into the game's page, served with its own policy (no network, no images,
// no frames; server/security-headers.ts sandboxHeaders). It runs a player's script in a worker made from a blob, and stops that
// worker when a tick is not answered in time, so a script that loops for ever stops only itself.
//
// Messages, page → here: { type: 'start', code, objects, lines } · { type: 'tick', dt, t, walker, objects, events } · { type: 'stop' }
// here → page: { type: 'ready' } · { type: 'ops', ops } · { type: 'error', message } · { type: 'stopped', reason }
// The page checks every operation it is given (src/spaces/script.ts); nothing here is trusted by it.
'use strict'
;(function () {
  var TICK_LIMIT_MS = 300
  var START_LIMIT_MS = 1000
  var worker = null
  var url = null
  var started = false
  var waiting = 0
  var timer = 0

  function send(message) { window.parent.postMessage(message, '*') }
  function stop(reason) {
    if (timer) { clearTimeout(timer); timer = 0 }
    if (worker) { worker.terminate(); worker = null }
    if (url) { URL.revokeObjectURL(url); url = null }
    waiting = 0
    if (reason) send({ type: 'stopped', reason: reason })
  }
  function watch(ms, reason) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(function () { stop(reason) }, ms)
  }

  // The worker's side: the `space` API the player's script sees, then the script itself inside a function it is called with.
  function prelude() {
    'use strict'
    var objects = new Map()
    var listeners = { start: [], tick: [], tap: [], near: [], far: [], key: [] }
    var ops = []
    var MAX_OPS = 400
    var walker = { x: 0, y: 0, z: 0, yaw: 0 }
    var time = 0
    var started = false
    function op(item) { if (ops.length < MAX_OPS) ops.push(item) }
    function num(value) { var n = Number(value); return isFinite(n) ? n : 0 }
    function Thing(state) { this._s = state }
    Thing.prototype = {
      get name() { return this._s.name },
      get x() { return this._s.x }, get y() { return this._s.y }, get z() { return this._s.z },
      get turn() { return this._s.ry }, get loose() { return this._s.loose },
      moveTo: function (x, y, z) { this._s.x = num(x); this._s.y = num(y); this._s.z = num(z); op(['move', this._s.name, this._s.x, this._s.y, this._s.z]); return this },
      moveBy: function (dx, dy, dz) { return this.moveTo(this._s.x + num(dx), this._s.y + num(dy), this._s.z + num(dz)) },
      turnTo: function (degrees) { this._s.ry = num(degrees); op(['turn', this._s.name, this._s.ry]); return this },
      turnBy: function (degrees) { return this.turnTo(this._s.ry + num(degrees)) },
      push: function (x, y, z) { op(['push', this._s.name, num(x), num(y), num(z)]); return this },
      color: function (hex) { op(['color', this._s.name, String(hex)]); return this },
      show: function (on) { op(['show', this._s.name, on !== false]); return this },
      hide: function () { return this.show(false) },
      distanceToWalker: function () { var dx = this._s.x - walker.x, dz = this._s.z - walker.z; return Math.sqrt(dx * dx + dz * dz) },
    }
    var space = Object.freeze({
      find: function (name) { var s = objects.get(String(name)); return s ? s.thing : null },
      all: function () { return Array.from(objects.values()).map(function (s) { return s.thing }) },
      on: function (event, fn) { if (listeners[event] && typeof fn === 'function') listeners[event].push(fn) },
      say: function (line) { var values = Array.prototype.slice.call(arguments, 1).map(num).slice(0, 4); op(['say', typeof line === 'number' ? line : String(line)].concat(values)) },
      score: function (n) { op(['score', num(n)]) },
      sound: function (name) { op(['sound', String(name)]) },
      get walker() { return Object.freeze({ x: walker.x, y: walker.y, z: walker.z, yaw: walker.yaw }) },
      get time() { return time },
      random: Math.random,
    })
    function fire(event, args) {
      var list = listeners[event]
      for (var i = 0; i < list.length; i++) {
        try { list[i].apply(null, args) } catch (error) { self.postMessage({ type: 'error', message: String(error && error.message || error) }); }
      }
    }
    function take(states) {
      for (var i = 0; i < states.length; i++) {
        var s = states[i], found = objects.get(s.name)
        if (found) { found.x = s.x; found.y = s.y; found.z = s.z; found.ry = s.ry }
      }
    }
    // Nothing a script needs reaches outside: these are also blocked by the sandbox's policy.
    ;['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'indexedDB', 'caches', 'BroadcastChannel'].forEach(function (name) { try { self[name] = undefined } catch (_) {} })
    self.onmessage = function (event) {
      var m = event.data || {}
      ops = []
      if (m.type === 'start') {
        for (var i = 0; i < m.objects.length; i++) { var s = Object.assign({}, m.objects[i]); s.thing = new Thing(s); objects.set(s.name, s) }
        walker = m.walker || walker
        try { self.__main(space) } catch (error) { self.postMessage({ type: 'error', message: String(error && error.message || error) }) }
        started = true
        fire('start', [])
      } else if (m.type === 'tick' && started) {
        time = m.t; walker = m.walker; take(m.objects || [])
        var events = m.events || []
        for (var j = 0; j < events.length; j++) { var e = events[j], thing = e.name ? space.find(e.name) : null; fire(e.type, thing ? [thing] : [e.key]) }
        fire('tick', [m.dt, m.t])
      }
      self.postMessage({ type: 'ops', ops: ops })
    }
  }

  window.addEventListener('message', function (event) {
    if (event.source !== window.parent) return
    var m = event.data || {}
    if (m.type === 'start' && typeof m.code === 'string') {
      stop()
      var head = '(' + prelude.toString() + ')();\nself.__main = function (space) {\n"use strict";\n'
      var offset = head.split('\n').length - 1
      var source = head + m.code + '\n};\n'
      url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
      started = false
      try { worker = new Worker(url) } catch (error) { send({ type: 'stopped', reason: 'Scripts cannot run in this browser.' }); return }
      worker.onmessage = function (e) {
        var data = e.data || {}
        if (data.type === 'ops') { started = true; waiting = 0; if (timer) { clearTimeout(timer); timer = 0 } send({ type: 'ops', ops: Array.isArray(data.ops) ? data.ops.slice(0, 400) : [] }) }
        else if (data.type === 'error') send({ type: 'error', message: String(data.message).slice(0, 300) })
      }
      worker.onerror = function (e) {
        e.preventDefault()
        send({ type: 'error', message: String(e.message || 'Your code has an error.').slice(0, 300) + (e.lineno > offset ? ' (line ' + (e.lineno - offset) + ')' : '') })
        // Code that cannot even start (a typing mistake) stops at once; its error is what the player needs to see.
        if (!started) stop()
      }
      waiting = 1
      watch(START_LIMIT_MS, 'Your code took too long to start, so it was stopped.')
      worker.postMessage({ type: 'start', objects: m.objects || [], walker: m.walker })
    } else if (m.type === 'tick' && worker) {
      // One tick at a time: a script still busy with the last one misses this one.
      if (waiting) return
      waiting = 1
      watch(TICK_LIMIT_MS, 'Your code took too long on one step (an endless loop?), so it was stopped.')
      worker.postMessage(m)
    } else if (m.type === 'stop') stop()
  })
  send({ type: 'ready' })
})()
