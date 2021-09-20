import type { Api } from 'services/ApiManager';
import ReqErrorLogger from 'lib/errorLogger/ReqErrorLogger';
import { unserializeDateProps } from 'lib/dateSchemaHelpers';
import processApiRet from './processApiRet';
import handleApiError from './handleApiError';
import validateApiData from './validateApiData';

export default function apiWrap<Name extends ApiName>(
  api: Api<Name>,
): (req: ExpressRequest, res: ExpressResponse) => Promise<void> {
  return async (req, res) => {
    try {
      const paramsObj = req.method === 'GET'
        ? req.query
        : req.body;

      const ver = TS.parseIntOrNull(paramsObj.ver);
      if (ver && ver < Number.parseInt(process.env.JS_VERSION, 10)) {
        throw new HandledError('Client is outdated.', 469);
      }

      const paramsStr: string = paramsObj.params;
      let params: ApiNameToParams[Name];
      try {
        params = JSON.parse(paramsStr);
      } catch {
        throw new HandledError('API params isn\'t JSON.', 400);
      }

      const { files } = req;
      if (api.config.fileFields && files && !Array.isArray(files)) {
        for (const { name, maxCount } of api.config.fileFields) {
          if (TS.hasDefinedProperty(files, name)) {
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

      validateApiData('params', api.validateParams, params);
      if (api.config.paramsSchema) {
        params = unserializeDateProps(api.config.paramsSchema, params);
      }

      const paramsWithUser = {
        ...params,
        currentUserId: req.currentUserId,
      };
      let ret = api.handler(paramsWithUser, res);
      if (ret instanceof Promise) {
        ret = await ret;
      }

      if (api.validateData) {
        if (!ret.data) {
          throw new HandledError('Api didn\'t include data.', 500);
        }
        if (process.env.NODE_ENV !== 'production') {
          validateApiData('data', api.validateData, ret.data);
        }
      }

      if (process.env.NODE_ENV !== 'production' && Object.keys(ret).some(
        k => !TS.inArray(k, ['data', 'entities', 'createdEntities', 'updatedEntities', 'deletedIds']),
      )) {
        throw new HandledError(`Api contains extra keys: ${Object.keys(ret).join(', ')}`, 500);
      }

      res.json(processApiRet<Name>(ret));
    } catch (err) {
      ReqErrorLogger.error(req, err, `apiWrap: ${api.config.name}`);

      const { status, errorData } = handleApiError(err, api.config.name);

      res.status(status).json({
        status,
        error: errorData,
      } as ApiErrorResponse);
    }
  };
}
