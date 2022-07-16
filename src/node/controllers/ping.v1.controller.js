const { ControllerBase } = require('../core/controller-base');

class PingV1Controller extends ControllerBase {

  async pingAsync(request) {
    const { headers, ipAddress, method, body, query, contextData, } = request;
    const headersLength = Object.keys(headers).length;
    const queryParametersLength = Object.keys(query).length;
    const requestBodyLength = Object.keys(body).length;
    let userAgent = undefined;

    if (headersLength) {
      userAgent = headers['user-agent'];

      // deletes user agent from headers...
      delete headers['user-agent'];
    }

    return {
      status: 200,
      message: 'Ping request processed successfully.',
      data: {
        apiVersion: contextData.apiVersion,
        httpMethod: method,
        ipAddress: ipAddress,
        userAgent: userAgent,
        headers: headersLength ? headers : undefined,
        queryParameters: queryParametersLength ? query : undefined,
        requestBody: requestBodyLength ? body : undefined,
      },
    };
  }

  configure(router) {
    router.addRoute('ALL', '/', this.pingAsync.bind(this));
  }
}

module.exports.pingV1Controller = new PingV1Controller();
