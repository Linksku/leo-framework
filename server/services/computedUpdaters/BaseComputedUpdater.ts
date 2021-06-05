import { toMysqlDateTime } from 'lib/mysqlDate';

const BATCH_SIZE = 1000;

export default abstract class BaseComputedUpdater {
  static dependencies = [] as string[];

  protected abstract getIds(startTimeStr: string): Promise<EntityId[]>;

  protected abstract updateIds(ids: EntityId[]): Promise<any>;

  async updateOne(id: EntityId) {
    return this.updateIds([id]);
  }

  async updateMulti(startTime: number) {
    const startTimeStr = toMysqlDateTime(new Date(startTime));
    const ids = await this.getIds(startTimeStr);
    // Serial for now in case of high DB load.
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      await this.updateIds(ids.slice(i, i + BATCH_SIZE));
    }
  }
}
