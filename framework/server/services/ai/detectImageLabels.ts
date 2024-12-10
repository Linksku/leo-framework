import stringify from 'utils/stringify';
import askLlamaJson from './askLlamaJson';

export default async function detectImageLabels(
  image: Buffer,
): Promise<{ interests: string[], tags: string[] }> {
  const data = await askLlamaJson({
    fields: {
      interests: {
        type: 'string[]',
        description: 'up to 5 interests or hobbies in this image',
      },
      tags: {
        type: 'string[]',
        description: 'specific tags or things in this image',
      },
    },
    image,
    maxOutputLength: 100,
  });

  if (!TS.isObj(data)) {
    throw new Error(`detectInappropriateImage: invalid data: ${stringify(data)}`);
  }

  if (typeof data.interests === 'string') {
    data.interests = data.interests.split(',').map(str => str.trim());
  }
  if (typeof data.tags === 'string') {
    data.tags = data.tags.split(',').map(str => str.trim());
  }

  return TS.assertType(
    data,
    val => TS.isObj(val) && Array.isArray(val.interests) && Array.isArray(val.tags),
    new Error(`detectInappropriateImage: invalid data: ${stringify(data)}`),
  );
}
