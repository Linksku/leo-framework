import dotenv from 'dotenv';

dotenv.config({
  path: process.env.SERVER === 'production'
    ? '../../src/.env'
    : 'src/.env',
});

export {};
