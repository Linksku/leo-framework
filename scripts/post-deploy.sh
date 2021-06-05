cd $REMOTE_ROOT_DIR

rm -rf build
unzip build.zip
rm build.zip

git fetch origin
git reset --hard origin/master
yarn

yarn env
pm2 restart $APP_NAME_SLUG
