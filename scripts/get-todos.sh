#!/bin/bash

if [ "$1" = "high" ]; then
  search='todo: ((veryhigh|veryhard)|(veryhigh|high)/(easy|mid|hard)) '
elif [ "$1" = "mid" ]; then
  search='todo: mid/(easy|mid) '
elif [ "$1" = "easy" ]; then
  search='todo: \w+/easy '
elif [ "$1" = "all" ] || [ "$1" = "misc" ]; then
  search='todo: \w+/\w+ '
elif [ "$1" = "hard" ]; then
  search='todo: (mid|high|veryhigh)/(hard|veryhard) '
elif [ "$1" = "low" ]; then
  search='todo: (low/(mid|hard|veryhard)|mid/(hard|veryhard)) '
else
  search='todo: (veryhigh/(easy|mid|hard)|high/(easy|mid))|(mid/easy) '
fi

git grep -il "todo:" \*.{js,ts,tsx,cjs,css,scss,html} \
  | grep "^${2:-}" \
  | xargs -n1 git blame -f -e --ignore-revs-file .git-blame-ignore-revs \
  | LC_ALL=C grep -i -E "$search" \
  | if [ "$1" = "misc" ]; then LC_ALL=C grep -i -v -E 'todo: (veryhigh|high|mid|low)/(veryhard|hard|mid|easy)'; else cat; fi \
  | sed -E 's/^[^ ]+ +(.+\/)*([^ ]+) +\(<[^>]+> +([^ ]+).+todo: (.+)/\3\t\4\t\2/i' \
  | sort \
  | column -ts $'\t'
