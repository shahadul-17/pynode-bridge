const configuration = require('../configuration');
const { ApiError } = require('../core/api-error');
const { Logger } = require('../common/logger');

const logger = new Logger(__filename);

module.exports.errorHandler = async (error, request, response, _) => {
  const { host, port, ipAddress, } = request.contextData;
  const apiError = ApiError.fromError(error);
  const apiResponse = apiError.toResponse(configuration.includeErrorStack);

  logger.error(`An error occurred while processing '${request.method}' request for http://${host}:${port}${request.originalUrl} from ${ipAddress}.`, error);

  response.status(apiResponse.status).send(apiResponse);
};
