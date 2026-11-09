#!/bin/sh
# Open the self-contained local prototype without starting a server.
cd -- "$(dirname -- "$0")" || exit 1
open web/index.html
