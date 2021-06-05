npx concurrently \
  "node scripts/build-global-types web/config/globals.js src/web/types/generated/globals.d.ts" \
  "node scripts/build-global-types src/web/config/globals.js src/web/types/generated/globalsSrc.d.ts" \
  "node scripts/build-global-types server/config/globals.js src/server/types/generated/globals.d.ts" \
  "node scripts/build-global-types src/server/config/globals.js src/server/types/generated/globalsSrc.d.ts"
npx concurrently "yarn ss buildServerEntities" "yarn ss buildWebEntities" "yarn ss buildSharedEntities"
yarn ss buildApiTypes
