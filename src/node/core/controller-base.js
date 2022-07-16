const { ExtendedRouter } = require('./extended-router');

module.exports.ControllerBase = class ControllerBase {

  constructor() {
    this.router = new ExtendedRouter();
    this.configure = this.configure.bind(this);

    this.configure(this.router);
  }

  /**
   * This method gets called internally by ControllerBase.
   * Do not call this method directly. Override this method
   * in the derived controller class for configuration.
   * @param {ExtendedRouter} router Router that shall come handy during configuration.
   */
  configure(router) {}

  getRouter() {
    return this.router;
  }

  /**
   * @param {express.Express} application Express application to which the router should be bounded.
   * @param {String} path Path to which the router should be bound to.
   * @param {String} apiVersion API version to which the controller should be bounded.
   * @returns {this} Returns controller itself.
   */
  bindToExpressApplication(application, path, apiVersion = '1.0') {
    this.router.bindToExpressApplication(application, path, apiVersion);

    return this;
  }
}
