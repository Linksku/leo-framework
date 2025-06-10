import { IS_GENERATED_USER } from 'consts/coreUserMetaKeys';
import { createGeneratedUser } from 'config/functions';

// Kafka + AvroConverter needs at least 1 row in each table to create schemas in Schema Registry.
export default async function createEachModel() {
  // Users
  const generatedUsers = await entityQuery(UserModel, 'bt')
    .join(
      UserMetaModel.tableName,
      {
        [UserMetaModel.cols.userId]: UserModel.cols.id,
        [UserMetaModel.cols.metaKey]: raw('?', [IS_GENERATED_USER]),
      },
    )
    .orderBy(UserModel.cols.id, 'asc')
    .limit(2);
  const user1 = generatedUsers.length >= 1
    ? generatedUsers[0]
    : await createGeneratedUser();
  const user2 = generatedUsers.length >= 2
    ? generatedUsers[1]
    : await createGeneratedUser();
  await UserDeviceModel.insertOne(
    {
      userId: user1.id,
      platform: 'desktop-web',
      deviceId: 'seed',
      userAgent: 'Mozilla/5.0',
    },
    { onDuplicate: 'ignore' },
  );

  // Misc
  await Promise.all([
    NotifModel.insertOne({
      scope: 'general',
      notifType: 'seedDb',
      userId: user1.id,
      groupingId: 1,
      params: {},
    }, { onDuplicate: 'ignore' }),
    NotifSettingModel.insertOne({
      userId: user1.id,
      channel: 'general',
      push: true,
      email: false,
    }, { onDuplicate: 'ignore' }),
    UnsubEmailModel.insertOne({
      email: user2.email,
    }, { onDuplicate: 'ignore' }),
    UnsubNotifModel.insertOne({
      entityType: 'user',
      entityId: user2.id,
      userId: user1.id,
    }, { onDuplicate: 'ignore' }),
    FtueSeenTimeModel.insertOne({
      userId: user1.id,
      ftueType: 'seed',
    }, { onDuplicate: 'ignore' }),
    MzTestModel.insertOne(
      { id: 1 },
      { onDuplicate: 'ignore' },
    ),
  ]);
}
