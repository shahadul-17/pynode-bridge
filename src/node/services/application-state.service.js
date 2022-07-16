const { instanceId, applicationState, } = require('../configuration');
const { FileUtilities } = require('../common/file-utilities');
const { Logger } = require('../common/logger');

module.exports.ApplicationStateService = class ApplicationStateService {

  constructor() {
    this.logger = new Logger(ApplicationStateService.name);
    this.dataFilePath = ApplicationStateService.prepareDataFilePath();
    this.data = {};
  }

  async loadAsync() {
    let data;

    try {
      data = await FileUtilities.readFileAsync(this.dataFilePath);
    } catch (error) {
      this.logger.error('An error occurred while loading application state from file system.', error);

      data = {};

      return false;
    }

    this.data = data;

    return true;
  }

  async saveAsync() {
    try {
      await FileUtilities.writeFileAsync(this.dataFilePath, this.data);
    } catch (error) {
      this.logger.error('An error occurred while saving application state to file system.', error);

      return false;
    }

    return true;
  }

  /**
   * @param {String} key 
   * @returns {Promise<any>} 
   */
  async getAsync(key) {
    return this.data[key];
  }

  /**
   * @param {Object} data 
   * @param {Boolean} flush 
   */
  async setAsync(data, flush = true) {
    // data must be an object and cannot be an array...
    if (typeof data !== 'object' || Array.isArray(data)) { return; }

    const entries = Object.entries(data);

    for (const [key, value] of entries) {
      this.data[key] = value;
    }

    flush && await this.saveAsync();
  }

  static instance = new ApplicationStateService();

  static getInstance() { return this.instance; }

  static prepareDataFilePath() {
    const dataFilePath = applicationState.dataFilePath;
    const lastIndexOfPeriod = dataFilePath.lastIndexOf('.');

    // it means file has no extension...
    if (lastIndexOfPeriod === -1) { return `${dataFilePath}-${instanceId}`; }

    const dataFilePathWithoutExtension = dataFilePath.substring(0, lastIndexOfPeriod);
    const dataFileExtension = dataFilePath.substring(lastIndexOfPeriod);

    return `${dataFilePathWithoutExtension}-${instanceId}${dataFileExtension}`;
  }
}
