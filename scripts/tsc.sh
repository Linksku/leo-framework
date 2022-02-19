#!/bin/bash

rm -f framework/shared/tsconfig.tsbuildinfo
rm -f framework/server/tsconfig.tsbuildinfo
rm -f framework/web/tsconfig.tsbuildinfo
rm -f app/shared/tsconfig.tsbuildinfo
rm -f app/server/tsconfig.tsbuildinfo
rm -f app/web/tsconfig.tsbuildinfo

tsc --build | grep -P '^|(?<=/)\w+\.tsx?(?=\()' --color=always
