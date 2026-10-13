import pathlib
import sys
import tarfile

archive, destination = sys.argv[1:]
root = pathlib.Path(destination)
root.mkdir()
with tarfile.open(archive) as source:
    members = source.getmembers()
    # Measured 13 Oct 2026 at 235 cities: 7,994 files and 233 MB including the Worker (street packs about 5,100 files and 67 MB,
    # about 8 files and 0.2 MB per city, a few cities at 2 to 5 MB). Cloudflare accepted that package for joinallworld-next
    # (static assets: up to 100,000 files per version and 25 MiB per file on the paid plan). Bound the archive well above the
    # game's growth to about 600 cities, and keep the 5 MiB per-file ceiling of the package guard.
    if len(members) > 20000 or sum(item.size for item in members) > 1024 * 1024 * 1024 or any(item.size > 5 * 1024 * 1024 for item in members):
        raise ValueError('Package size limit')
    for item in members:
        path = pathlib.PurePosixPath(item.name)
        if path.is_absolute() or '..' in path.parts or not (item.isfile() or item.isdir()):
            raise ValueError('Unsafe package entry')
    source.extractall(root, members=members, filter='data')
