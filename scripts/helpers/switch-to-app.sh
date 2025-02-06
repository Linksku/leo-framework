#!/bin/bash

sed -i 1,2d README.md
rm .gitignore
mv .gitignore-temp .gitignore
