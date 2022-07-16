const { ApiResponse } = require('./api-response');

module.exports.ApiError = class ApiError extends Error {

  /**
   * @param {Number} status 
   * @param {String} message 
   * @param {Object} data 
   * @param {String} stackTrace 
   */
  constructor(status, message, data = undefined, stackTrace = undefined) {
    super(message);

    Object.setPrototypeOf(this, new.target.prototype);

    this.status = status;
    this.data = data;

    if (stackTrace) {
      this.stack = stackTrace;
    }
  }

  /**
   * @param {Boolean} includeStackTrace 
   * @returns {ApiResponse} 
   */
  toResponse(includeStackTrace) {
    let data = this.data;

    if (includeStackTrace && this.stack) {
      if (!data) { data = {}; }

      data.stackTrace = this.stack;
    }

    const apiResponse = new ApiResponse();
    apiResponse.status = this.status;
    apiResponse.message = this.message;
    apiResponse.data = data;

    return apiResponse;
  }

  /**
   * @param {Error} error 
   * @param {Number} status 
   * @returns {ApiError} 
   */
  static fromError(error, status = 500) {
    // if 'error' object is already an instance of ApiError, we return the same object...
    if (error instanceof ApiError) { return error; }

    // otherwise, we create new 'ApiError'...
    return new ApiError(status, error.message, undefined, error.stack);
  }
}
