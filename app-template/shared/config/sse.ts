import { DefaultSseParams, DefaultSseData } from 'core/defaultSse';

export type SseParams = DefaultSseParams;

export type SseName = Expand<keyof SseParams>;

export type SseData = DefaultSseData;
