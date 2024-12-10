import { SNOWFLAKE_ID_EPOCH } from 'consts/infra';
import getServerId from 'utils/getServerId';

/*
53 bits for now until converting ids to strings:
- 38 bits time
- 7 bits server id
- 8 bits counter

9 years
Copied logic from https://github.com/T-PWK/flake-idgen
*/

const EPOCH = new Date(SNOWFLAKE_ID_EPOCH).getTime();

const TIME_SECTION = 2 ** 15;

const SERVER_ID_SECTION = 2 ** 8;

type ModelState = { lastTime: number, counter: number };

const modelsToState = new Map<ModelType, ModelState>();

export default async function getSnowflakeId(modelType: ModelType): Promise<number> {
  const time = Date.now() - EPOCH;
  let state = modelsToState.get(modelType);
  if (!state) {
    state = { lastTime: time, counter: 0 };
    modelsToState.set(modelType, state);
  }

  if (time < state.lastTime) {
    if (time < state.lastTime - 1000) {
      throw new Error('getSnowflakeId: clock moved backwards');
    }

    await pause(state.lastTime - time);
    return getSnowflakeId(modelType);
  }

  if (time === state.lastTime) {
    if (state.counter >= 4095) {
      await pause(1);
      return getSnowflakeId(modelType);
    }

    state.counter++;
  } else {
    state.counter = 0;
  }
  state.lastTime = time;

  return (time * TIME_SECTION)
    + (getServerId() * SERVER_ID_SECTION)
    + state.counter;
}
