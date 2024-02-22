import S3 from 'aws-sdk/clients/s3.js';
import { DO_SPACES_ID, DO_SPACES_REGION } from 'config/serverConfig';

export default new S3({
  endpoint: `${DO_SPACES_REGION}.digitaloceanspaces.com`,
  accessKeyId: DO_SPACES_ID,
  secretAccessKey: process.env.DO_SPACES_SECRET,
});
