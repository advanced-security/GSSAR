#!/usr/bin/env bash

function setup {
    for d in */ ; do
        [ -L "${d%/}" ] && continue
        echo "Processing $d"
        cd "$d"
        yarn 
        cd ..
    done
}

cd /workspaces/GSSAR/functions/helpers

setup

cd /workspaces/GSSAR/functions/authorizers

setup

cd /workspaces/GSSAR/functions/remediators

setup