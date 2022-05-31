import deleteDBZConnectors from './steps/deleteDBZConnectors';

export default async function destroyDBZ() {
  await deleteDBZConnectors();
}
