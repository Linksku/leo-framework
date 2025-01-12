import formatAndLogApiErrorResponse from './formatAndLogApiErrorResponse';

export default function rawApiWrap<Name extends ApiName>(
  api: RawApiDefinition<Name>,
): (req: ExpressRequest, res: ExpressResponse) => Promise<void> {
  return async (req: ExpressRequest, res: ExpressResponse) => {
    try {
      const ret = api.handler(req, res);
      if (ret instanceof Promise) {
        await ret;
      }
    } catch (err) {
      const result = formatAndLogApiErrorResponse(err, 'rawApiWrap', 'default');
      res
        .status(result.status)
        .send(JSON.stringify(
          result,
          null,
          process.env.PRODUCTION ? 0 : 2,
        ));
    }
  };
}
