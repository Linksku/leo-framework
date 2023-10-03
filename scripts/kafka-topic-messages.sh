#!/bin/bash

docker exec -it schema-registry \
  kafka-avro-console-consumer --bootstrap-server broker:29092 \
  --property schema.registry.url=http://schema-registry:8081 \
  --partition 0 \
  --topic $1 \
  --max-messages 100

# docker exec broker /opt/bitnami/kafka/bin/kafka-configs.sh --describe --all --bootstrap-server broker:29092 --entity-type topics --entity-name campus_mz_sink_
