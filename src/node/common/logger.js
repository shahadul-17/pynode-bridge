const configuration = require('../configuration');
const JsonSerializer = require('./json-serializer');
const { Queue } = require('./queue');
const { DateUtilities } = require('./date-utilities');
const { FileUtilities } = require('./file-utilities');
const path = require('path');
const fileSystem = require('fs/promises');

module.exports.Logger = class Logger {

  /**
   * @param {String} context 
   */
  constructor(context) {
    this.context = path.basename(context);

    this.FATAL = 'Fatal';
    this.ERROR = 'Error';
    this.WARNING = 'Warning';
    this.INFORMATION = 'Information';
    this.DEBUG = 'Debug';
  }

  /**
   * @param {'Fatal'|'Error'|'Warning'|'Information'|'Debug'} logLevel 
   * @param {Array<any>} parameters 
   */
  log(logLevel, ...parameters) {
    if (!parameters.length) { return; }

    let message = `${DateUtilities.formatDate(new Date())} [${logLevel}] [${this.context}] `;

    for (const parameter of parameters) {
      if (typeof parameter === 'undefined' || parameter === null) { continue; }

      if (['string', 'boolean', 'number', 'bigint'].includes(typeof parameter)) {
        message += `${parameter} `;

        continue;
      } else if (typeof parameter === 'object') {
        message += `\n${JsonSerializer.serialize(parameter, 2, true)}\n`;

        continue;
      }

      try {
        message += `${parameter.toString()} `;
      } catch (error) {
        console.warn('An error occurred during parameter conversion.', error);
      }
    }

    message = message.trim();

    const consoleLogger = Logger.getConsoleFunctionByLogLevel(logLevel);
    consoleLogger(message);

    message += '\n';

    Logger.messages.enqueue(message);
    Logger.flushToFileAsync();
  }

  fatal(...parameters) {
    this.log('Fatal', ...parameters);
  }

  error(...parameters) {
    this.log('Error', ...parameters);
  }

  warning(...parameters) {
    this.log('Warning', ...parameters);
  }

  information(...parameters) {
    this.log('Information', ...parameters);
  }

  debug(...parameters) {
    this.log('Debug', ...parameters);
  }

  // NEVER USE THESE VARIABLES DIRECTLY...
  static isFlushing = false;
  static fileHandle = undefined;
  static fileHandleCreatedAt = '';
  // this queue shall hold all the logs until written into file...
  static messages = new Queue();

  /**
   * @returns {Promise<fileSystem.FileHandle>} 
   */
  static async getFileHandleAsync() {
    const currentDay = DateUtilities.formatDay(new Date());

    // if file handle is not initialized or file handle wasn't created today,
    // we'll create new file handle...
    if (currentDay !== this.fileHandleCreatedAt) {
      // closes previously opened file handle (if any)...
      await this.fileHandle?.close();
      // creates logs directory if doesn't exist...
      await FileUtilities.createDirectoryAsync(configuration.logsDirectory);

      const fileName = `${DateUtilities.formatDay(currentDay)}.log`;
      const filePath = path.join(configuration.logsDirectory, fileName);

      this.fileHandle = await fileSystem.open(filePath, 'a');
      this.fileHandleCreatedAt = currentDay;
    }

    return this.fileHandle;
  }

  /**
   * @param {'Fatal'|'Error'|'Warning'|'Information'|'Debug'} logLevel 
   */
  static getConsoleFunctionByLogLevel(logLevel) {
    switch (logLevel) {
      case 'Debug':
        return console.debug;
      case 'Information':
        return console.info;
      case 'Warning':
        return console.warn;
      case 'Error':
      case 'Fatal':
        return console.error;
      default:
        return console.log;
    }
  }

  static async flushToFileAsync() {
    // checks if the queue is empty...
    if (this.isFlushing || this.messages.isEmpty()) { return; }

    this.isFlushing = true;

    try {
      const fileHandle = await this.getFileHandleAsync();

      // we shall dequeue elements until the queue is empty...
      while (!this.messages.isEmpty()) {
        const message = this.messages.dequeue();

        await fileHandle.write(message);
      }
    } catch (error) {
      console.error('An error occurred while flushing logs to file.', error);
    }

    this.isFlushing = false;
  }
}
