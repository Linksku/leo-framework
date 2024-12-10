import getKafka from 'services/getKafka';

export default function getKafkaAdmin() {
  return getKafka().admin();
}
