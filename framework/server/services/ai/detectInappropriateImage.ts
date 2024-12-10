import askLlamaJson from './askLlamaJson';

export default async function detectInappropriateImage(
  image: Buffer,
  clubNames?: string[], // Include ancestors
): Promise<{ isAppropriate: boolean, isRelated: boolean }> {
  const data = await askLlamaJson({
    fields: {
      isAppropriate: {
        type: 'boolean',
        description: 'is this image appropriate for all audiences? E.g. not sexually explicit, disturbing, or self-harm',
      },
      ...(clubNames && {
        isRelated: {
          type: 'boolean',
          description: `is this image related to the topic "${clubNames.reverse().join(', ')}"`,
        },
      }),
    },
    image,
    maxOutputLength: 100,
  });

  return {
    isAppropriate: !!data.isAppropriate,
    isRelated: data.isRelated !== false,
  };
}
