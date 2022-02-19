import type { ApiDefinition } from 'services/ApiManager';
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
      if (process.env.NODE_ENV === 'production' && ver && ver < Number.parseInt(process.env.JS_VERSION, 10)) {
        throw new HandledError('Client is outdated.', 469);
      }

      let params: ApiNameToParams[Name];
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
      res.set(
        'Cache-Control',
        process.env.NODE_ENV === 'production' ? 'public,max-age=60' : 'public,max-age=0',
      );
      res.json(processApiRet<Name>(ret));
    } catch (err) {
      ErrorLogger.error(err, `apiWrap: ${api.config.name}`);

      const { status, errorData } = handleApiError(err, api.config.name);

      res.status(status).json({
        status,
        error: errorData,
      } as ApiErrorResponse);
    }
  };
}
