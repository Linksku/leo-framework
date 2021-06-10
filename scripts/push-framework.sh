echo 'src/' >> .gitignore

git --git-dir=.git-framework add -A
git --git-dir=.git-framework commit -m 'Squashed commits'
git --git-dir=.git-framework push

sed -i '$d' .gitignore
