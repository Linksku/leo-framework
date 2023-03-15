#!/bin/bash

docker exec broker /opt/bitnami/kafka/bin/kafka-topics.sh --bootstrap-server broker:29092 --list
