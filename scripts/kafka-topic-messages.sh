#!/bin/bash

docker exec -it schema-registry \
  kafka-avro-console-consumer --bootstrap-server broker:29092 \
  --property schema.registry.url=http://schema-registry:8081 \
  --partition 0 \
  --topic $1 \
  --max-messages 100
