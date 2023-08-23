#!/bin/bash

# replace
# `\d+:
#  with `$lineNr:

cd ~/.local/share/0ad/mods/autocivp
for file in $(find ./ -type f -name "*.js"); do
    lineNr=0
    while IFS= read -r line; do
        ((++lineNr))
        line=${line/\`[0-9]+:/\`$lineNr:}
        echo "$line"
    done < "$file" > temp && mv temp "$file"
done
