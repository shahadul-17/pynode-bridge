const express = require('express');
const { ApiResponse } = require('./api-response');
const { Logger } = require('../common/logger');

module.exports.ExtendedRouter = class ExtendedRouter {

  constructor() {
    this.logger = new Logger(ExtendedRouter.name);
    this.router = express.Router();
    // binds 'addRoute' method to this class instance...
    this.addRoute = this.addRoute.bind(this);
    this.getExpressRouter = this.getExpressRouter.bind(this);
    this.bindToExpressApplication = this.bindToExpressApplication.bind(this);
  }

  /**
   * Adds a new route to the router.
   * @param {'ALL'|'HEAD'|'GET'|'POST'|'PUT'|'PATCH'|'DELETE'|'OPTIONS'} method HTTP request method.
   * @param {String} path Request path.
   * @param  {...Function} handlers Callback functions that handles requests.
   * @returns {ExtendedRouter} Returns extended router itself.
   */
  addRoute(method, path, ...handlers) {
    method = method.toLowerCase();

    let routerMatcher = this.router[method];

    if (typeof routerMatcher !== 'function') {
      this.logger.warning(`Route could not be added due to invalid method name, ${method}`);

      return this;
    }

    routerMatcher = routerMatcher.bind(this.router);

    const lastIndexOfHandlers = handlers.length - 1;
    const _handlers = handlers.slice(0, lastIndexOfHandlers);
    const lastHandler = handlers[lastIndexOfHandlers];

    if (typeof lastHandler !== 'function') {
      this.logger.warning('Route could not be added due to invalid route handler');

      return this;
    }

    routerMatcher(path, ..._handlers, async (request, response, next) => {
      try {
        const result = await lastHandler(request) ?? {};

        if (typeof result.filePath === 'string') {
          return response.status(result.status ?? 200).sendFile(result.filePath);
        }

        const apiResponse = new ApiResponse();
        apiResponse.status = result.status ?? apiResponse.status;
        apiResponse.message = result.message ?? apiResponse.message;
        apiResponse.data = result.data;

        return response.status(apiResponse.status).send(apiResponse);
      } catch (error) {
        next(error);
      }
    });

    return this;
  }

  /**
   * Retrieves the underlying express router instance.
   * @returns {express.Router} Returns the underlying express router instance.
   */
  getExpressRouter() {
    return this.router;
  }

  /**
   * @param {express.Express} application Express application to which the router should be bounded.
   * @param {String} path Path to which the router should be bound to.
   * @returns {this} Returns the router itself.
   */
  bindToExpressApplication(application, path, apiVersion = '1.0') {
    // if path is not string, we'll do nothing...
    if (typeof path !== 'string') { return this; }

    // retrieves express router...
    const router = this.getExpressRouter();
    // if path does not start with '/', we shall prepend '/'
    // to the provided path...
    path = path.startsWith('/') ? path : `/${path}`;
    // preparing path...
    const _path = `/api${typeof apiVersion === 'string' ? `/v${apiVersion}` : ''}${path}`;
    // binds to the express application...
    application.use(_path, router);

    this.logger.information(`Router registered for path ${_path}`);

    // returns current extended router instance...
    return this;
  }
}
