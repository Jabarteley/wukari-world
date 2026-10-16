// The entry: what Allworld needs to know to host the game (the contract is src/arena/cartridge.ts, the guide docs/CARTRIDGES.md).
// `npm run cartridge:check -- --dir examples/cartridge-sample` checks this file, the rules and every listed asset.
import { CARTRIDGE_CONTRACT, defineCartridge } from '../../src/arena/cartridge.ts'

export const cartridge = defineCartridge({
  contract: CARTRIDGE_CONTRACT,
  id: 'tug',
  name: 'Tug',
  blurb: 'Pull the rope your way. Two players, fifteen seconds.',
  rev: 1,
  venues: ['arcade'],
  modes: { alone: 'live', friends: 'live', community: 'planned', matchmaking: 'planned', agents: 'planned' },
  reads: ['identity'],
  writes: ['result', 'replay'],
  manifest: {
    // The stem of the screen's lazy chunk: TugGame.vue builds to dist/assets/TugGame-<hash>.js.
    entry: 'TugGame',
    // Paths are from the repository root. When the cartridge is accepted its files move to public/assets/<id>/ and the paths with them.
    assets: [
      { path: 'examples/cartridge-sample/assets/rope.svg', licence: 'ours', source: 'Allworld sample, drawn for this example' },
    ],
  },
})
export default cartridge
