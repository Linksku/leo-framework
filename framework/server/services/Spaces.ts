import S3 from 'aws-sdk/clients/s3';

export default new S3({
  endpoint: 'nyc3.digitaloceanspaces.com',
  accessKeyId: process.env.DO_SPACES_ID,
  secretAccessKey: process.env.DO_SPACES_SECRET,
});
