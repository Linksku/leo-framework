#!/bin/bash

docker exec -it $(yarn dc ps -q schema-registry) \
  kafka-avro-console-consumer --bootstrap-server broker:29092 \
  --property schema.registry.url=http://schema-registry:8081 \
  --partition 0 \
  --topic $1 \
  #--from-beginning \
  --max-messages 100

# docker exec $(yarn dc ps -q broker) kafka-configs --describe --all --bootstrap-server broker:29092 --entity-type topics --entity-name campus_mz_sink_
