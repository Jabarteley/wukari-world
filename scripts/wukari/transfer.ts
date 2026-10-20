/** Single-file, hash-checked transfer into the existing offline importer. No network or archive extraction. */
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { importOffline, sha256, validateReceipt, type Receipt } from './offline.ts';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MAX_SOURCE = 20 * 1024 * 1024, MAX_RECEIPT = 64 * 1024, MAX_BUNDLE = 29 * 1024 * 1024;
interface Bundle {
    schemaVersion: 1;
    kind: 'wukari-osm-transfer';
    format: 'osm-xml' | 'osm-json';
    source: {
        bytes: number;
        sha256: string;
        base64: string;
    };
    receipt: {
        bytes: number;
        sha256: string;
        base64: string;
    };
}
function readBounded(path: string, max: number): Buffer { if (statSync(path).size > max)
    throw new Error(`File exceeds ${max} bytes`); const bytes = readFileSync(path); if (bytes.length > max)
    throw new Error('File grew beyond transfer limit'); return bytes; }
function formatValid(format: string): asserts format is Bundle['format'] { if (!['osm-xml', 'osm-json'].includes(format))
    throw new Error('Transfer accepts osm-xml or osm-json; prepare PBF externally'); }
function item(bytes: Buffer): Bundle['source'] { return { bytes: bytes.length, sha256: sha256(bytes), base64: bytes.toString('base64') }; }
function decode(value: Bundle['source'], max: number): Buffer {
    if (!value || !Number.isSafeInteger(value.bytes) || value.bytes < 0 || value.bytes > max || typeof value.base64 !== 'string' || value.base64.length > Math.ceil(max / 3) * 4)
        throw new Error('Invalid transfer item size');
    const bytes = Buffer.from(value.base64, 'base64');
    if (bytes.toString('base64') !== value.base64 || bytes.length !== value.bytes || sha256(bytes) !== value.sha256)
        throw new Error('Transfer item hash, length or encoding mismatch');
    return bytes;
}
export function pack(input: string, receiptPath: string, format: string, output: string): {
    sha256: string;
    bytes: number;
} {
    formatValid(format);
    const source = readBounded(input, MAX_SOURCE), receiptBytes = readBounded(receiptPath, MAX_RECEIPT);
    const receipt = JSON.parse(receiptBytes.toString()) as Receipt;
    validateReceipt(receipt, source);
    if (receipt.mode !== 'source-data')
        throw new Error('Synthetic fixtures cannot be packaged as real geographic sources');
    const bundle: Bundle = { schemaVersion: 1, kind: 'wukari-osm-transfer', format, source: item(source), receipt: item(receiptBytes) };
    const bytes = Buffer.from(JSON.stringify(bundle) + '\n');
    if (bytes.length > MAX_BUNDLE)
        throw new Error('Bundle exceeds upload limit');
    writeFileSync(output, bytes, { flag: 'wx' });
    return { sha256: sha256(bytes), bytes: bytes.length };
}
export function receive(input: string, expectedHash: string, output: string, campusWay?: number): void {
    const bytes = readBounded(input, MAX_BUNDLE);
    if (!/^[a-f0-9]{64}$/.test(expectedHash) || sha256(bytes) !== expectedHash)
        throw new Error('Whole transfer SHA-256 mismatch; use the independently recorded pack result');
    const bundle = JSON.parse(bytes.toString()) as Bundle;
    if (bundle.schemaVersion !== 1 || bundle.kind !== 'wukari-osm-transfer')
        throw new Error('Unsupported transfer schema');
    formatValid(bundle.format);
    const source = decode(bundle.source, MAX_SOURCE), receiptBytes = decode(bundle.receipt, MAX_RECEIPT);
    const receipt = JSON.parse(receiptBytes.toString()) as Receipt;
    validateReceipt(receipt, source);
    if (receipt.mode !== 'source-data')
        throw new Error('Synthetic source refused');
    const out = resolve(output), cache = resolve(root, '.cache/wukari');
    if (!out.startsWith(cache + '/'))
        throw new Error('Receive output must be a new directory under .cache/wukari');
    mkdirSync(out, { recursive: false });
    writeFileSync(resolve(out, 'transfer.json'), bytes, { flag: 'wx' });
    writeFileSync(resolve(out, 'source.bin'), source, { flag: 'wx' });
    writeFileSync(resolve(out, 'receipt.json'), receiptBytes, { flag: 'wx' });
    const audit = { transferSHA256: expectedHash, sourceSHA256: sha256(source), receiptSHA256: sha256(receiptBytes), fieldVerified: false, campusPlayable: false };
    try {
        importOffline(resolve(out, 'source.bin'), resolve(out, 'receipt.json'), bundle.format, resolve(out, 'imported'), campusWay);
        writeFileSync(resolve(out, 'transfer-validation.json'), JSON.stringify({ ...audit, status: 'imported-source-review-required' }, null, 2) + '\n', { flag: 'wx' });
    }
    catch (error) {
        writeFileSync(resolve(out, 'transfer-validation.json'), JSON.stringify({ ...audit, status: 'rejected', error: error instanceof Error ? error.message : String(error) }, null, 2) + '\n', { flag: 'wx' });
        throw error;
    }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    try {
        const [command, ...args] = process.argv.slice(2);
        const allowed = command === 'pack' ? ['--input', '--receipt', '--format', '--out'] : command === 'receive' ? ['--bundle', '--sha256', '--out', '--campus-way'] : [];
        if (!allowed.length || args.length % 2 || args.some((a, i) => i % 2 === 0 && (!allowed.includes(a) || args.indexOf(a) !== i)))
            throw new Error('Use pack --input FILE --receipt FILE --format osm-xml|osm-json --out NEW_FILE, or receive --bundle FILE --sha256 HASH --out NEW_CACHE_DIR [--campus-way ID]');
        const get = (k: string): string => { const i = args.indexOf(k); if (i < 0 || !args[i + 1])
            throw new Error(`Missing ${k}`); return args[i + 1]!; };
        if (command === 'pack')
            console.log(JSON.stringify({ status: 'packaged-not-geometrically-validated', ...pack(get('--input'), get('--receipt'), get('--format'), get('--out')) }));
        else {
            const campus = args.includes('--campus-way') ? Number(get('--campus-way')) : undefined;
            if (campus !== undefined && (!Number.isSafeInteger(campus) || campus <= 0))
                throw new Error('Invalid campus way');
            receive(get('--bundle'), get('--sha256'), get('--out'), campus);
        }
    }
    catch (error) {
        console.error(JSON.stringify({ status: 'failed', stage: 'transfer', campusPlayable: false, error: error instanceof Error ? error.message : String(error) }));
        process.exitCode = 1;
    }
}
