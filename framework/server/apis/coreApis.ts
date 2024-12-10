import { defineApi } from 'services/ApiManager';
import { isHealthy } from 'services/healthcheck/HealthcheckManager';

defineApi(
  {
    name: 'status',
    paramsSchema: SchemaConstants.emptyObj,
    dataSchema: {
      type: 'object',
      required: ['isHealthy'],
      properties: {
        isHealthy: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  function statusApi() {
    return {
      data: {
        isHealthy: isHealthy({
          ignoreStaleRR: true,
          onlyFatal: true,
        }),
      },
    };
  },
);
