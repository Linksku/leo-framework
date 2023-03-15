import { AsyncLocalStorage } from 'async_hooks';

export type ServiceContext = {
  serviceName: string,
  data: any,
};

export function createServiceContext(name: string, data?: any): ServiceContext {
  return {
    serviceName: name,
    data,
  };
}

export default new AsyncLocalStorage<ServiceContext>();
