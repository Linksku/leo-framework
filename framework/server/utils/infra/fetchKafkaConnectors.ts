import fetchJson from 'utils/fetchJson';
import { KAFKA_CONNECT_HOST, KAFKA_CONNECT_PORT } from 'consts/infra';
import retry from 'utils/retry';

export type ConnectorStatus = {
  name: string,
  status: {
    connector: { state: string },
    tasks: { state: string, trace: string }[],
  },
};

export type ConnectorInfo = {
  name: string,
  info: {
    config: ObjectOf<string>,
    tasks: { task: number }[],
  },
};

function fetchKafkaConnectors(prefix: string, expand?: never): Promise<string[]>;

function fetchKafkaConnectors(prefix: string, expand: 'status'): Promise<ConnectorStatus[]>;

function fetchKafkaConnectors(prefix: string, expand: 'info'): Promise<ConnectorInfo[]>;

async function fetchKafkaConnectors(
  prefix: string,
  expand?: 'status' | 'info',
) {
  let response: {
    data?: unknown;
    status: number;
  } | undefined;
  try {
    await retry(
      async () => {
        response = await fetchJson(
          `http://${KAFKA_CONNECT_HOST}:${KAFKA_CONNECT_PORT}/connectors${expand ? `?expand=${expand}` : ''}`,
        );
      },
      {
        timeout: 60 * 1000,
        interval: 10 * 1000,
        ctx: `fetchKafkaConnectors(${prefix})`,
      },
    );
  } catch (err) {
    if (!(err instanceof Error && err.message.includes('fetch failed'))) {
      throw err;
    }
  }
  if (response && response.status >= 400) {
    throw new Error(`fetchKafkaConnectors: status ${response.status}`);
  }

  let connectors = response?.data;
  if (!expand
    && Array.isArray(connectors)
    && connectors.every((v: unknown) => typeof v === 'string')) {
    return connectors.filter(c => (c as string).startsWith(prefix)) as string[];
  }

  if (connectors && typeof connectors === 'object') {
    connectors = Object.entries(connectors)
      .filter(pair => pair[0].startsWith(prefix))
      .map(pair => ({
        name: pair[0],
        ...pair[1],
      }));
  }
  if (expand === 'status' && Array.isArray(connectors)
    && connectors.every(v => TS.isObj(v)
      && TS.hasProp(v, 'status')
      && TS.isObj(v.status)
      && TS.hasProp(v.status, 'connector')
      && TS.hasProp(v.status, 'tasks'))) {
    return connectors as ConnectorStatus[];
  }
  if (expand === 'info' && Array.isArray(connectors)
    && connectors.every((v: unknown) => TS.isObj(v)
      && TS.hasProp(v, 'info')
      && TS.isObj(v.info)
      && TS.hasProp(v.info, 'config')
      && TS.hasProp(v.info, 'tasks'))) {
    return connectors as ConnectorInfo[];
  }
  throw getErr(
    'fetchKafkaConnectors: invalid response from GET /connectors',
    { connectors },
  );
}

export default fetchKafkaConnectors;
