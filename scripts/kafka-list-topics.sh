#!/bin/bash

docker exec $(yarn dc ps -q broker) kafka-topics --bootstrap-server broker:29092 --list
