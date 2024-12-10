import type S3Type from 'aws-sdk/clients/s3.js';
import { DO_SPACES_ID, DO_SPACES_REGION } from 'config/serverConfig';

let client: S3Type | null;
let clientPromise: Promise<S3Type> | null = null;

export default async function getSpaces(): Promise<S3Type> {
  if (!client) {
    clientPromise ??= import('aws-sdk/clients/s3.js')
      .then(({ default: S3Client }) => new S3Client({
        endpoint: `${DO_SPACES_REGION}.digitaloceanspaces.com`,
        accessKeyId: DO_SPACES_ID,
        secretAccessKey: process.env.DO_SPACES_SECRET,
      }));
    client = await clientPromise;
  }

  return client;
}
