#!/bin/bash

sed -i 1,2d README.md
sed -i '/^# App-specific/,$d' .gitignore
sed -i '$d' .gitignore
