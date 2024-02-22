#!/bin/bash

docker exec $(yarn dc ps -q broker) /opt/bitnami/kafka/bin/kafka-topics.sh --bootstrap-server broker:29092 --list
