import RequestContextLocalStorage from 'services/RequestContextLocalStorage';

export default function getRequestContext() {
  return RequestContextLocalStorage.getStore();
}
