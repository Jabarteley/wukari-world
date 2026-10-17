#!/bin/bash
# runpair.sh <tag> : desktop then CPU x4, sequential
cd /tmp/allworld-hitch; mkdir -p $1
node rec.mjs http://127.0.0.1:5191 /tmp/allworld-hitch/$1/d 1 > $1/d.log 2>&1
node rec.mjs http://127.0.0.1:5191 /tmp/allworld-hitch/$1/t4 4 > $1/t4.log 2>&1
echo done > $1/DONE
