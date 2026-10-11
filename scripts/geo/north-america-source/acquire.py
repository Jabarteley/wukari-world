"""Cloud-only, one-download Mexico boundary acquisition with compact receipts.

Local --validate-only validates the request and fixture without network or imports
of geometry dependencies. The downloaded PBF stays private until the runner ends.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request


TOOLING_REVISION = '0786c00510f2827d6495a53fc3299f3112d0d6b4'
SOURCE = {
    'id': 'mexico-2026-10-09',
    'countryISO': 'MX',
    'sourceUrl': 'https://download.geofabrik.de/north-america/mexico-261009.osm.pbf',
    'snapshotDate': '2026-10-09',
    'bytes': 646582098,
    'md5': '165a7baf3e69b06cbd097f9c98c0fe26',
    'fixture': 'fixtures/mx.json',
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + '\n')


def read_request(path):
    request = json.loads(path.read_text())
    require(request == {'schemaVersion': 1, 'jobs': [SOURCE]},
            'request must contain exactly the pinned Mexico job')
    fixture_path = path.parent / SOURCE['fixture']
    fixture = json.loads(fixture_path.read_text())
    require(fixture.get('schemaVersion') == 1 and fixture.get('countryISO') == 'MX',
            'fixture schema/country mismatch')
    require('datasetSha256' not in fixture, 'template SHA is bound after verified download')
    require(fixture.get('coordinateOrder') == 'longitude, latitude', 'fixture coordinate order required')
    require(fixture.get('purpose'), 'diagnostic fixture purpose required')
    checks = fixture.get('checks')
    require(isinstance(checks, list) and len(checks) == 3, 'exactly three diagnostic checks required')
    expected = {
        'diagnostic/mexico-city-centre': 'inside',
        'diagnostic/toronto-centre': 'outside',
        'diagnostic/new-york-centre': 'outside',
    }
    require({check.get('ref'): check.get('expected') for check in checks} == expected,
            'diagnostic point references/classifications mismatch')
    for check in checks:
        point = check.get('point')
        require(isinstance(point, list) and len(point) == 2
                and all(type(v) in (int, float) and math.isfinite(v) for v in point)
                and -180 <= point[0] <= 180 and -90 <= point[1] <= 90,
                'fixture coordinates invalid')
        require(check.get('origin'), 'caller-supplied diagnostic origin required')
    return request, fixture


def download(pbf):
    md5, sha256 = hashlib.md5(), hashlib.sha256()
    total = 0
    started = time.monotonic()
    request = urllib.request.Request(SOURCE['sourceUrl'], headers={'User-Agent': 'Allworld-boundary-source/1.0'})
    # One HTTP download attempt, bounded both in bytes and elapsed time.
    with urllib.request.urlopen(request, timeout=90) as response, pbf.open('xb') as stream:
        require(response.geturl() == SOURCE['sourceUrl'], 'source redirect refused')
        require(response.status == 200, 'source HTTP status is not 200')
        content_length = response.headers.get('Content-Length')
        if content_length is not None:
            require(int(content_length) == SOURCE['bytes'], 'HTTP content length pin mismatch')
        while True:
            require(time.monotonic() - started < 900, 'download exceeded 15 minute bound')
            block = response.read(1024 * 1024)
            if not block:
                break
            total += len(block)
            require(total <= SOURCE['bytes'], 'download exceeds byte pin')
            stream.write(block)
            md5.update(block)
            sha256.update(block)
    result = {
        'sourceUrl': SOURCE['sourceUrl'], 'snapshotDate': SOURCE['snapshotDate'],
        'bytes': total, 'md5': md5.hexdigest(), 'sha256': sha256.hexdigest(),
        'expectedBytes': SOURCE['bytes'], 'expectedMd5': SOURCE['md5'],
        'downloadAttempts': 1, 'elapsedSeconds': round(time.monotonic() - started, 3),
        'sha256Policy': 'Computed from the single payload after publisher MD5 and byte pins pass',
    }
    return result


def acquire(args, request, fixture):
    require(os.environ.get('GITHUB_ACTIONS') == 'true', 'acquisition only runs on disposable GitHub runners')
    require(args.out is not None and args.tooling is not None, '--out and --tooling required')
    out = Path(args.out).resolve()
    require(not out.exists(), 'fresh private output directory required')
    publish = out / 'publish'
    publish.mkdir(parents=True)
    write_json(publish / 'request.json', request)
    write_json(publish / 'fixture-template.json', fixture)
    stage = 'tooling-verification'
    try:
        tooling = Path(args.tooling).resolve()
        revision = subprocess.check_output(['git', '-C', str(tooling), 'rev-parse', 'HEAD'], text=True).strip()
        require(revision == TOOLING_REVISION, 'tooling commit pin mismatch')
        helper_relative = 'scripts/geo/factory/bootstrap/country-boundary.py'
        helper = tooling / helper_relative
        committed_helper = subprocess.check_output(['git', '-C', str(tooling), 'show', f'{TOOLING_REVISION}:{helper_relative}'])
        require(helper.read_bytes() == committed_helper, 'tooling helper differs from committed bytes')
        stage = 'source-download'
        pbf = out / 'mexico-261009.osm.pbf'
        source = download(pbf)
        write_json(publish / 'download.json', source)
        require(source['bytes'] == SOURCE['bytes'], 'download byte pin mismatch')
        require(source['md5'] == SOURCE['md5'], 'download MD5 pin mismatch')
        fixture['datasetSha256'] = source['sha256']
        bound_fixture = publish / 'fixture.json'
        write_json(bound_fixture, fixture)
        stage = 'same-pbf-boundary-proof'
        command = [sys.executable, str(helper), '--pbf', str(pbf), '--country', 'MX',
                   '--expected-bytes', str(SOURCE['bytes']), '--expected-sha256', source['sha256'],
                   '--dataset-url', SOURCE['sourceUrl'], '--dataset-date', SOURCE['snapshotDate'],
                   '--fixture', str(bound_fixture), '--out', str(publish / 'boundary')]
        with (publish / 'boundary.log').open('w') as log:
            process = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, timeout=900)
        require(process.returncode == 0, f'boundary helper returned {process.returncode}; inspect boundary/result.json and boundary.log')
        write_json(publish / 'acquisition.json', {
            'schemaVersion': 1, 'status': 'OSM_COUNTRY_BOUNDARY_CANDIDATE', 'countryISO': 'MX',
            'toolingRevision': revision, 'helperSha256': hashlib.sha256(committed_helper).hexdigest(),
            'sourceSha256': source['sha256'], 'sourceBytes': source['bytes'],
            'rawPbfPublished': False, 'rawPbfLifetime': 'private runner storage until job ends',
            'limitations': ['Diagnostic points do not prove boundary completeness; inspect helper assembly receipt',
                            'No metadata extraction, city generation, browser acceptance or deployment proved'],
        })
        print(json.dumps({'status': 'OSM_COUNTRY_BOUNDARY_CANDIDATE', 'sourceSha256': source['sha256']}))
        return 0
    except Exception as error:
        result = {'schemaVersion': 1, 'status': 'HOLD', 'countryISO': 'MX', 'stage': stage,
                  'reason': str(error), 'rawPbfPublished': False, 'toolingRevision': TOOLING_REVISION}
        write_json(publish / 'acquisition.json', result)
        print(json.dumps(result))
        return 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--request', required=True)
    parser.add_argument('--tooling')
    parser.add_argument('--out')
    parser.add_argument('--validate-only', action='store_true')
    args = parser.parse_args()
    request, fixture = read_request(Path(args.request).resolve())
    if args.validate_only:
        print(json.dumps({'status': 'VALID_REQUEST', 'jobs': 1, 'countryISO': 'MX', 'networkUsed': False}))
        return 0
    return acquire(args, request, fixture)


if __name__ == '__main__':
    sys.exit(main())
