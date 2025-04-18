import DefaultSseParams from 'core/defaultSseParams';

export type SseParams = DefaultSseParams;

export type SseName = Expand<keyof SseParams>;
