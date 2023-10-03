import S3 from 'aws-sdk/clients/s3.js';

export default new S3({
  endpoint: `${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`,
  accessKeyId: process.env.DO_SPACES_ID,
  secretAccessKey: process.env.DO_SPACES_SECRET,
});
