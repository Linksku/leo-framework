#!/bin/bash

if [ "$1" = "high" ]; then
  search='todo: ((veryhigh|veryhard)|(veryhigh|high)/(easy|med|hard)) '
elif [ "$1" = "med" ]; then
  search='todo: med/(easy|med) '
elif [ "$1" = "easy" ]; then
  search='todo: \w+/easy '
elif [ "$1" = "all" ] || [ "$1" = "misc" ]; then
  search='todo: \w+/\w+ '
elif [ "$1" = "hard" ]; then
  search='todo: (med|high|veryhigh)/(hard|veryhard) '
elif [ "$1" = "low" ]; then
  search='todo: (low/(med|hard|veryhard)|med/(hard|veryhard)) '
else
  search='todo: (veryhigh/(easy|med|hard)|high/(easy|med))|(med/easy) '
fi

git grep -il "todo:" \*.{js,ts,tsx,cjs,css,scss,html} \
  | grep "^${2:-}" \
  | xargs -n1 git blame -f -e --ignore-revs-file .git-blame-ignore-revs \
  | LC_ALL=C grep -i -E "$search" \
  | if [ "$1" = "misc" ]; then LC_ALL=C grep -i -v -E 'todo: (veryhigh|high|med|low)/(veryhard|hard|med|easy)'; else cat; fi \
  | sed -E 's/^[^ ]+ +(.+\/)*([^ ]+) +\(<[^>]+> +([^ ]+).+todo: (.+)/\3\t\4\t\2/i' \
  | sort \
  | column -ts $'\t'
