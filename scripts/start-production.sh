#!/bin/sh
set -eu

./node_modules/.bin/prisma db push

if [ "${AUTO_DEPLOY_COMMANDS:-false}" = "true" ]; then
  node dist/scripts/deploy-commands.js
fi

exec node dist/src/index.js
