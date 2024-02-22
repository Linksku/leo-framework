#!/usr/bin/env zx

import { $, chalk } from 'zx';

import '../framework/server/core/initEnv.cjs';
import throttledPromiseAll from '../framework/shared/utils/throttledPromiseAll';
import { APP_NAME_LOWER } from '../framework/shared/config/config.js';

$.verbose = false;

const _topics = await $`
  docker exec -it $(yarn dc ps -q broker) \
    /opt/bitnami/kafka/bin/kafka-topics.sh \
    --bootstrap-server broker:29092 \
    --list
`;
const topics = _topics.stdout.trim().split('\n').sort();

await throttledPromiseAll(2, topics, async topic => {
  topic = topic.trim();
  if (!topic.startsWith(`${APP_NAME_LOWER}_`)
    || topic.endsWith('-consistency')) {
    return;
  }

  const _numMsgs = await $`
    docker exec -it $(yarn dc ps -q broker) \
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
        docker exec -it $(yarn dc ps -q schema-registry) \
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
});
