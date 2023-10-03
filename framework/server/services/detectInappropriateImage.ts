import type { ImageBlob } from 'aws-sdk/clients/rekognition.js';
import Rekognition from 'aws-sdk/clients/rekognition.js';

const client = new Rekognition({
  accessKeyId: process.env.AWS_ACCESS_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
});

// https://docs.aws.amazon.com/rekognition/latest/dg/moderation.html
const MAYBE_INAPPROPRIATE_LABELS = new Set([
  'Suggestive',
  'Female Swimwear Or Underwear',
  'Male Swimwear Or Underwear',
  'Revealing Clothes',
  'Sexual Situations',
  'Graphic Violence Or Gore',
  'Corpses',
]);

export default async function detectInappropriateImage(image: ImageBlob): Promise<boolean> {
  const data = await client.detectModerationLabels({
    Image: {
      Bytes: image,
    },
    MinConfidence: 80,
  }).promise();
  const labels = data?.ModerationLabels;
  if (!labels?.length) {
    return false;
  }

  return labels.some(
    label => label.ParentName === 'Explicit Nudity'
      || label.Name === 'Explicit Nudity'
      || (label.Confidence && label.Name
        && label.Confidence >= 90 && MAYBE_INAPPROPRIATE_LABELS.has(label.Name)),
  );
}
