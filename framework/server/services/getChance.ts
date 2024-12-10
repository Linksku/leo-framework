import type ChanceType from 'chance';

let chance: InstanceType<typeof ChanceType> | null = null;
let chancePromise: Promise<InstanceType<typeof ChanceType>> | null = null;

export default async function getChance(): Promise<InstanceType<typeof ChanceType>> {
  if (!chance) {
    chancePromise ??= import('chance')
      .then(module => new module.default.Chance());
    chance = await chancePromise;
  }

  return chance;
}
