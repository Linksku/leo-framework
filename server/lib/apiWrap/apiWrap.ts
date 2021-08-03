import type { Api } from 'services/ApiManager';
import processApiRet from './processApiRet';
import handleApiError from './handleApiError';
import validateApiData from './validateApiData';

export default function apiWrap<Name extends ApiName>(
  api: Api<Name>,
): (req: ExpressRequest, res: ExpressResponse) => Promise<void> {
  return async (req, res) => {
    try {
      const paramsStr: string = req.method === 'GET'
        ? req.query.params
        : req.body.params;
      let params: ApiNameToParams[Name] & { currentUserId: number | undefined };
      try {
        params = JSON.parse(paramsStr);
      } catch {
        throw new HandledError('API params isn\'t JSON.', 400);
      }

      const { files } = req;
      if (api.config.fileFields && files && !Array.isArray(files)) {
        for (const { name, maxCount } of api.config.fileFields) {
          if (hasDefinedProperty(files, name)) {
            if (maxCount === 1) {
              // @ts-ignore
              params[name] = files[name][0];
            } else {
              // @ts-ignore
              params[name] = files[name];
            }
          }
        }
      }
      await validateApiData('params', api.validateParams, params);
      params.currentUserId = req.currentUserId;

      let ret = api.handler(params, res);
      if (ret instanceof Promise) {
        ret = await ret;
      }

      if (api.validateData) {
        if (!ret.data) {
          throw new HandledError('Api didn\'t include data.', 500);
        }
        if (process.env.NODE_ENV !== 'production') {
          await validateApiData('data', api.validateData, ret.data);
        }
      }

      if (process.env.NODE_ENV !== 'production' && Object.keys(ret).filter(
        k => k !== 'entities' && k !== 'data' && k !== 'deletedIds',
      ).length) {
        throw new HandledError('Api contains extra keys.', 500);
      }

      res.json(processApiRet<Name>(ret));
    } catch (err) {
      const { status, errorData } = handleApiError(err, api.config.name);
      res.status(status).json({
        status,
        error: errorData,
      } as ApiErrorResponse);
    }
  };
}
