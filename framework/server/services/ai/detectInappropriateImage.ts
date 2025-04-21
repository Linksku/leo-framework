import stringify from 'utils/stringify';
import askLlamaJson from './askLlamaJson';

export default async function detectInappropriateImage(
  image: Buffer,
  clubNames?: string[], // Include ancestors
): Promise<{ isInappropriate: boolean, reason: string, isRelated: boolean }> {
  const data = await askLlamaJson({
    fields: {
      ...(clubNames && {
        isRelated: {
          type: 'boolean',
          description: `is this image related to the topic "${clubNames.slice().reverse().join(', ')}"`,
        },
      }),
      isInappropriate: {
        type: 'boolean',
        description: 'is this image inappropriate? E.g. sexually explicit, disturbing, self-harm, or hate symbols. Swimwear is appropriate',
      },
      reason: {
        type: 'string',
        description: 'why is this image inappropriate, e.g. "contains nudity", or "N/A" if it\'s appropriate',
      },
    },
    image,
    maxOutputLength: 100,
  });

  return {
    isInappropriate: !!data.isInappropriate,
    reason: stringify(data.reason),
    isRelated: data.isRelated !== false,
  };
}
