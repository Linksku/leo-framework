#!/bin/bash

if [ "$1" = "high" ]; then
  search='todo: high'
elif [ "$1" = "mid" ]; then
  search='todo: mid'
else
  search='todo: '
fi

git grep -il todo: \*.{ts,tsx,js,jsx,css,scss,html,ejs,json,txt} \
  | xargs -n1 git blame -f -e --ignore-revs-file .git-blame-ignore-revs \
  | LC_ALL=C grep -iF "$search" \
  | sed -E 's/^[^ ]+ +(.+\/)*([^ ]+) +\(<[^>]+> +([^ ]+).+todo: (.+)/\3\t\4\t\2/i' \
  | sort \
  | column -ts $'\t'
