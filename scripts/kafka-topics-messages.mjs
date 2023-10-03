#!/usr/bin/env zx

import { $, chalk } from 'zx';
import pLimit from 'p-limit';

import '../framework/server/helpers/initDotenv.cjs';

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
  topic = topic.trim();
  if (!topic.startsWith(`${process.env.APP_NAME_LOWER}_`)
    || topic.endsWith('-consistency')) {
    return;
  }

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
    try {
      const _lastMsg = await $`
        docker exec -it schema-registry \
          kafka-avro-console-consumer --bootstrap-server broker:29092 \
          --property schema.registry.url=http://schema-registry:8081 \
          --partition 0 \
          --topic ${topic} \
          --offset ${numMsgs - 1} \
          --max-messages 1
      `.timeout('300s');
      lastMsg = _lastMsg.stdout.trim()
        .replace(/\bProcessed a topic of \d+ messages\b/, '');
    } catch (err) {
      lastMsg = err instanceof Error ? err.message : `${err}`;
    }
  }

  console.log(`${chalk.cyan(topic)}: ${numMsgs} ${lastMsg}\n`);
})));
