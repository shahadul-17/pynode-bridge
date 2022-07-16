const { ControllerBase } = require('../core/controller-base');
const { PyNodeBridgeService } = require('../services/pynode-bridge.service');

class PyNodeBridgeV1Controller extends ControllerBase {

  async getResponseFromPythonAsync(request) {
    const moduleName = `${request.params.module}.py`;
    const functionName = request.params.function;
    const functionArguments = request.body;
    const pythonResponse = await this.pynodeBridgeService.getResponseFromPythonAsync({
      moduleName: moduleName,
      functionName: functionName,
      functionArguments: functionArguments,
    });

    if (pythonResponse.hasSucceeded === true) {
      return {
        status: 200,
        message: 'Request has been processed successfully.',
        data: pythonResponse,
      };
    }

    return {
      status: 400,
      message: 'An error occurred while processing the request.',
      data: pythonResponse,
    };
  }

  configure(router) {
    // retrieves the instance of pynode bridge service...
    this.pynodeBridgeService = PyNodeBridgeService.getInstance();

    router.addRoute('POST', '/:module/:function', this.getResponseFromPythonAsync.bind(this));
  }
}

module.exports.pynodeBridgeV1Controller = new PyNodeBridgeV1Controller();
