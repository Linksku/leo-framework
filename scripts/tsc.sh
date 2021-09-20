#!/bin/bash

concurrently "tsc --p src/web/tsconfig.json" "tsc --p src/server/tsconfig.json" "tsc --p src/shared/tsconfig.json" \
  | grep -P '^|(?<=/)\w+\.tsx?(?=\()' --color=always
