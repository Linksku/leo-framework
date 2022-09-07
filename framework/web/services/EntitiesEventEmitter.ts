// todo: low/mid maybe write a custom higher performance eventemitter
import EventEmitter from 'eventemitter2';

const ee = new EventEmitter();
ee.setMaxListeners(100);

export default markMemoed(ee);
