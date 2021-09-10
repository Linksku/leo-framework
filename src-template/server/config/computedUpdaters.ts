import type BaseComputedUpdater from '../services/computedUpdaters/BaseComputedUpdater';
import PostsComputedUpdater from '../services/computedUpdaters/PostsComputedUpdater';

const updaters: ObjectOf<BaseComputedUpdater<any>> = {
  PostsComputedUpdater: new PostsComputedUpdater(),
};

export default updaters;
