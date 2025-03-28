import { Kafka, logLevel, LogEntry } from 'kafkajs';

import { KAFKA_BROKER_HOST, KAFKA_BROKER_PORT } from 'consts/mz';

function _shouldIgnoreError(entry: LogEntry) {
  return typeof entry.log.error === 'string'
    && entry.log.error?.includes('This server does not host this topic-partition');
}

let kafka: Kafka | undefined;

// Note: Redpanda has the same latency as Kafka, but uses less memory
export default function getKafka() {
  if (kafka) {
    return kafka;
  }

  kafka = new Kafka({
    brokers: [`${KAFKA_BROKER_HOST}:${KAFKA_BROKER_PORT}`],
    requestTimeout: 10 * 1000,
    retry: {
      retries: 1,
    },
    logLevel: logLevel.WARN,
    logCreator: () => entry => {
      if (_shouldIgnoreError(entry)) {
        return;
      }

      if (entry.level === logLevel.INFO || entry.level === logLevel.DEBUG) {
        printDebug(`${entry.log.message}: ${entry.log.error}`);
        return;
      }

      const errorLoggerMethod = {
        [logLevel.WARN]: 'warn' as const,
        [logLevel.ERROR]: 'error' as const,
        [logLevel.NOTHING]: 'error' as const,
      }[entry.level];
      const { message, timestamp, ...props } = entry.log;
      ErrorLogger[errorLoggerMethod](
        new Error(`Kafka: ${message}: ${props.error || entry.label}`),
        props,
        false,
      );
    },
  });

  return kafka;
}
