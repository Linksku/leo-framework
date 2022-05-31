import processApiRet from './processApiRet';
import handleApiError from './handleApiError';
import apiHandlerWrap from './apiHandlerWrap';

export default function apiWrap<Name extends ApiName>(
  api: ApiDefinition<Name>,
): (req: ExpressRequest, res: ExpressResponse) => Promise<void> {
  return async (req, res) => {
    try {
      const paramsObj = req.method === 'GET'
        ? req.query
        : req.body;

      const ver = TS.parseIntOrNull(paramsObj.ver);
      // todo: low/mid restart webpack watch after creating git commit
      if (process.env.PRODUCTION && ver && ver < Number.parseInt(process.env.JS_VERSION, 10)) {
        throw new HandledError('Client is outdated.', 469);
      }

      let params: ApiParams<Name>;
      try {
        params = JSON.parse(paramsObj?.params);
      } catch {
        throw new HandledError('API params isn\'t JSON.', 400);
      }

      const { files } = req;
      if (api.config.fileFields && files && !Array.isArray(files)) {
        for (const { name, maxCount } of api.config.fileFields) {
          if (TS.hasProp(files, name)) {
            if (maxCount === 1) {
              // @ts-ignore wontfix key error
              params[name] = files[name][0];
            } else {
              // @ts-ignore wontfix key error
              params[name] = files[name];
            }
          }
        }
      }

      const ret = await apiHandlerWrap(
        api,
        params,
        req.currentUserId,
        res,
      );
      res
        .set(
          'Cache-Control',
          process.env.PRODUCTION ? 'public,max-age=60' : 'public,max-age=0',
        )
        .set('Content-Type', 'application/json; charset=utf-8')
        .send(JSON.stringify(
          processApiRet<Name>(ret),
          null,
          process.env.PRODUCTION ? 0 : 2,
        ));
    } catch (err) {
      ErrorLogger.error(err, `apiWrap: ${api.config.name}`);

      const { status, errorData } = handleApiError(err, api.config.name);

      res.status(status)
        .set('Content-Type', 'application/json; charset=utf-8')
        .send(JSON.stringify(
          {
            status,
            error: errorData,
          } as ApiErrorResponse,
          null,
          process.env.PRODUCTION ? 0 : 2,
        ));
    }
  };
}
