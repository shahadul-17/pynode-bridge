const configuration = require('../configuration.js');
const { Logger } = require('../common/logger');

const logger = new Logger(__filename);

const getClientIpAddress = request => {
  // actual IP address of the client...
  const ipAddress = request.headers['x-forwarded-for']
    ?? request.socket.remoteAddress;

  return ipAddress;
};

const parseApiVersion = request => {
  let apiVersion = request.originalUrl.substring('/api/'.length);
  const indexOfForwardSlash = apiVersion.indexOf('/');

  if (indexOfForwardSlash === -1) { return ''; }

  apiVersion = apiVersion.substring(0, indexOfForwardSlash);

  return apiVersion;
};

module.exports.requestHandler = async (request, response, next) => {
  try {
    const contextData = {
      host: configuration.host,
      port: configuration.port,
      ipAddress: getClientIpAddress(request),
      apiVersion: parseApiVersion(request),
    };

    request.contextData = contextData;

    logger.information(`'${request.method}' request received from ${contextData.ipAddress} for http://${contextData.host}:${contextData.port}${request.originalUrl}`);

    configuration.poweredBy && response.set('X-Powered-By', configuration.poweredBy);

    next();
  } catch (error) {
    next(error);
  }
};
