import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import type { LifeState } from '../../types/life.ts'
import type { HostScene, HostWalk } from '../../venue-world.ts'
import { createWalker } from '../movement.ts'
import type { SceneThing, WalkSpot } from '../types.ts'
import type { VenueViewSource, ViewTarget } from '../view-extension.ts'
import { viewContext } from './venue-context.ts'

type Snapshot = ReturnType<VenueViewSource['read']>

function fixture() {
  const walker = createWalker()
  walker.place(3, 4, 0.75)
  const avatar = new THREE.Group()
  const playerBodyA = new THREE.Group(), playerBodyB = new THREE.Group()
  const groupA = new THREE.Group(), groupB = new THREE.Group()
  const people = [{ id: 'person-1', kind: 'player', x: 2, z: 3, top: 2 }]
  const walk = {
    scale: 2,
    avatar,
    solids: [[0, 0, 0, 1, 2, 1]],
    heightAt: () => 4,
    people: () => people,
  } as unknown as HostWalk
  const first: HostScene = {
    group: groupA,
    playerBody: playerBodyA,
    screens: () => [{ id: 'tv-a', x: 1, y: 2, z: 3, ry: 0, width: 2, height: 1 }],
    objects: () => [{ id: 'upper-object', itemId: 'reading-lamp', x: 5, y: 8, z: 6 }],
  }
  const second: HostScene = {
    group: groupB,
    playerBody: playerBodyB,
    screens: () => [{ id: 'tv-b', x: 7, y: 9, z: 8, ry: 1, width: 1.5, height: 0.8 }],
    objects: () => [{ id: 'supported-object', itemId: 'floor-lamp', x: 1, z: 2 }],
  }
  const state = { activeAction: null } as unknown as LifeState
  let snapshot: Snapshot = {
    current: first,
    walk,
    state,
    body: null,
    y: 7,
    phase: 1.2,
    rest: { pose: 'sit', seat: 1.25 },
    mode: 'venue',
    locked: false,
    location: 'home',
    weakDevice: false,
    spots: [{ id: 'spot-1', label: 'Counter', x: 1, y: 6, z: 2, ry: 0, approach: null, steps: [] }] satisfies WalkSpot[],
    things: [{ id: 'table-1', kind: 'table', table: 'ayo', game: 'ayo', x: 4, z: 5, top: 1.1, r: 1, label: 'Play Ayo' }] satisfies SceneThing[],
    tags: [{ id: 'person-1', text: 'Anthony' }],
  }
  const calls: string[] = []
  let refreshes = 0, releases = 0
  const source: VenueViewSource = {
    THREE,
    container: { hidden: false } as HTMLElement,
    camera: new THREE.PerspectiveCamera(),
    canvas: {} as HTMLCanvasElement,
    walker,
    read: () => snapshot,
    actions: {
      spot: id => calls.push(`spot:${id}`),
      object: id => calls.push(`object:${id}`),
      home: () => calls.push('home'),
      neighbour: id => calls.push(`neighbour:${id}`),
      street: () => calls.push('street'),
      tag: tag => calls.push(`tag:${tag.id}:${tag.kind}`),
    },
    refresh: () => { refreshes += 1 },
    release: () => { releases += 1 },
  }
  return {
    source, state, walk, calls, avatar, playerBodyA, playerBodyB, groupA, groupB, second,
    snapshot: () => snapshot,
    replace: (next: Snapshot) => { snapshot = next },
    refreshes: () => refreshes,
    releases: () => releases,
  }
}

test('venue context keeps scene units for upper-floor targets and seats, and follows scene replacement live', () => {
  const f = fixture()
  const context = viewContext(f.source)

  assert.equal(context.scene, f.groupA)
  assert.deepEqual(context.bodies, [f.avatar, f.playerBodyA])
  assert.equal(context.seat, 2.5, 'seat height is scaled into scene units')
  assert.equal(context.targets().find(target => target.id === 'upper-object')?.y, 10, 'an upper-floor object keeps its floor height and adds avatar scale')
  assert.equal(context.targets().find(target => target.id === 'spot-1')?.y, 8)
  assert.equal(context.screens[0]?.id, 'tv-a')

  f.replace({ ...f.snapshot(), current: f.second })
  assert.equal(context.scene, f.groupB)
  assert.deepEqual(context.bodies, [f.avatar, f.playerBodyB])
  assert.equal(context.screens[0]?.id, 'tv-b')
  assert.equal(context.targets().find(target => target.id === 'supported-object')?.y, 6, 'objects without stored height use the live walk support height')
})

test('busy state blocks dispatch, then activation uses the host callbacks and current people', () => {
  const f = fixture()
  const context = viewContext(f.source)
  const targets: ViewTarget[] = [
    { id: 'spot-1', kind: 'spot', label: 'Spot', x: 0, y: 0, z: 0 },
    { id: 'object-1', kind: 'object', label: 'Object', x: 0, y: 0, z: 0 },
    { id: 'home-door', kind: 'home-door', label: 'Home', x: 0, y: 0, z: 0 },
    { id: 'neighbour-1', kind: 'neighbour-door', label: 'Neighbour', x: 0, y: 0, z: 0 },
    { id: 'street-gate', kind: 'street-gate', label: 'Street', x: 0, y: 0, z: 0 },
    { id: 'table-1', kind: 'table', label: 'Table', x: 0, y: 0, z: 0 },
    { id: 'person-1', kind: 'person', label: 'Person', x: 0, y: 0, z: 0 },
  ]

  f.state.activeAction = { kind: 'activity', id: 'home-watch-tv', duration: 12, remaining: 6 }
  for (const target of targets) context.activate(target)
  assert.deepEqual(f.calls, [], 'a running action prevents every interaction dispatch')

  f.state.activeAction = null
  for (const target of targets) context.activate(target)
  assert.deepEqual(f.calls, [
    'spot:spot-1', 'object:object-1', 'home', 'neighbour:neighbour-1', 'street', 'tag:table-1:table', 'tag:person-1:player',
  ])
  context.refresh()
  context.release()
  assert.deepEqual([f.refreshes(), f.releases()], [1, 1], 'the adapter exposes the original host lifecycle callbacks')
})
