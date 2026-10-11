import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export function machineFailed(catalogue, rows) {
  return !catalogue || rows.some(row =>
    ['generation', 'acceptance', 'proofGround', 'proofCity', 'receipt']
      .some(stage => row.machineStages[stage] !== true));
}

export function contactSheetInputs(out, rows) {
  return rows.map(row => {
    const images = [];
    for (const view of ['ground', 'city']) {
      const relative = `${row.id}/proof/${view}/${row.id}-flat.png`;
      const path = join(out, relative);
      if (!existsSync(path)) continue;
      const bytes = readFileSync(path);
      if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) continue;
      images.push({ view, path: relative, sha256: createHash('sha256').update(bytes).digest('hex'), proof: `${row.id}/proof/${view}/${row.id}-proof.json` });
    }
    return { id: row.id, status: 'HOLD', machineStages: row.machineStages, images, missingViews: ['ground', 'city'].filter(view => !images.some(image => image.view === view)), reasons: row.reasons, visualAcceptance: 'pending review of actual images', browserAcceptance: 'pending' };
  });
}
