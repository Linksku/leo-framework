#!/bin/bash

isPortUsed=$(netstat -anp 2> /dev/null | grep ':9092 ')
numDockerContainers=$(docker ps | wc -l)
if [ -n "$isPortUsed" ] && [ "$numDockerContainers" -le 1 ] ; then
    echo "Already running elsewhere"
    exit
fi

yarn dc --compatibility up -d --remove-orphans
