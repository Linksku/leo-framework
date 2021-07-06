#!/bin/bash

set -o allexport; source src/env; set +o allexport

mysqldump -u root -p -h 127.0.0.1 -d --opt $MYSQL_DB --skip-add-drop-table | sed 's/ AUTO_INCREMENT=[0-9]*//g' > src/tables.sql
