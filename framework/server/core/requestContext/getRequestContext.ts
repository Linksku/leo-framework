import RequestContextLocalStorage from './RequestContextLocalStorage';

export default function getRequestContext(): RequestContext | undefined {
  return RequestContextLocalStorage.getStore();
}
