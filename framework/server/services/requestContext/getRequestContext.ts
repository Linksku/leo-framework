import RequestContextLocalStorage from './RequestContextLocalStorage';

export default function getRequestContext() {
  return RequestContextLocalStorage.getStore();
}
