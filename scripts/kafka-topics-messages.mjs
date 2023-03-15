#!/usr/bin/env zx

import { $, chalk } from 'zx';
import pLimit from 'p-limit';

const limiter = pLimit(2);

$.verbose = false;

const _topics = await $`
  docker exec -it broker \
    /opt/bitnami/kafka/bin/kafka-topics.sh \
    --bootstrap-server broker:29092 \
    --list
`;
const topics = _topics.stdout.trim().split('\n').sort();

await Promise.all(topics.map(topic => limiter(async () => {
  const _numMsgs = await $`
    docker exec -it broker \
      /opt/bitnami/kafka/bin/kafka-run-class.sh kafka.tools.GetOffsetShell \
      --bootstrap-server broker:29092 \
      --topic ${topic} \
      | awk -F  ":" '{sum += $3} END {print sum}'
  `;
  const numMsgs = Number.parseInt(_numMsgs.stdout.trim(), 10);

  let lastMsg = '';
  if (numMsgs) {
    const _lastMsg = await $`
      docker exec -it schema-registry \
        kafka-avro-console-consumer --bootstrap-server broker:29092 \
        --property schema.registry.url=http://schema-registry:8081 \
        --partition 0 \
        --topic ${topic} \
        --offset ${numMsgs - 1} \
        --max-messages 1
    `;
    lastMsg = _lastMsg.stdout.trim();
  }

  console.log(`${chalk.cyan(topic)}: ${numMsgs} (${lastMsg})`);
})));
