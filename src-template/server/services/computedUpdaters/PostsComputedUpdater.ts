import BaseComputedUpdater from 'services/computedUpdaters/BaseComputedUpdater';

export default class PostsComputedUpdater extends BaseComputedUpdater<PostModel> {
  static dependencies = ['postReply'];

  async getIds(startTime: string) {
    const postReplies = await PostReply.query()
        .distinct('parentEntityId')
        .where('time', '>=', startTime);
    return postReplies.map(r => r.parentEntityId);
  }

  async updateIds(ids: EntityId[]) {
    const numReplies = await PostReply.query()
      .modify('active')
      .select('parentEntityId as id')
      .count('* as numReplies')
      .whereIn('parentEntityId', ids)
      .groupBy('parentEntityId');

    return {
      Model: Post,
      results: [
        [numReplies, ['numReplies']],
      ] as const,
    };
  }
}
