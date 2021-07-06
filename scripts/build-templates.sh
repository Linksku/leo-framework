#!/bin/bash

set -o allexport; source src/env; set +o allexport

export SERVER=production
export NODE_ENV=production

node scripts/build-templates.js
