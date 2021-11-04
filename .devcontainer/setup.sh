#!/usr/bin/env bash

function setup {
    for d in */ ; do
        [ -L "${d%/}" ] && continue
        echo "Processing $d"
        cd "$d"
        npm install
        npm run format
        npm run build
        cd ..
    done
}

cd /workspaces/GCSMTTR/functions/helpers

setup

cd /workspaces/GCSMTTR/functions/authorizers

setup

cd /workspaces/GCSMTTR/functions/remediators
