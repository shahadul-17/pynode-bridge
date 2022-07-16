// imports configuration file...
const configuration = require('./configuration');
const http = require('http');
const express = require('express');
const expressFileUpload = require('express-fileupload');
const cors = require('cors');

const { requestHandler } = require('./middleware/request-handler');
const { errorHandler } = require('./middleware/error-handler');

const { pingV1Controller } = require('./controllers/ping.v1.controller');
const { pynodeBridgeV1Controller } = require('./controllers/pynode-bridge.v1.controller');

const { FileUtilities } = require('./common/file-utilities');
const { ApplicationStateService } = require('./services/application-state.service');
const { UIDService } = require('./services/uid.service');
const { PyNodeBridgeService } = require('./services/pynode-bridge.service');
const { Logger } = require('./common/logger');

const logger = new Logger(__filename);
const application = express();
const httpServer = new http.Server(application);
const pynodeBridgeService = PyNodeBridgeService.getInstance();

/**
 * Configures express application.
 * @param {express.Express} application Express application to be configured.
 */
const configureApplication = application => {
  //#region Middleware
  // removes 'x-powered-by' response header...
  application.disable('x-powered-by');
  // adding CORS middleware...
  application.use(cors());
  // adds request handler middleware...
  application.use(requestHandler);
  // adding error handler middleware...
  application.use(errorHandler);
  // adding JSON middleware...
  application.use(express.json());
  // adding file upload middleware...
  application.use(expressFileUpload({
    useTempFiles: true,
    tempFileDir: configuration.uploads.temporaryDirectoryPath,
    fileSize: configuration.uploads.maxFileSize,
  }));
  // adds express middleware to serve static files...
  application.use('/api/files/static', express.static(configuration.staticFilesDirectory));
  //#endregion

  //#region Controllers
  // adds ping controller...
  pingV1Controller.bindToExpressApplication(application, '/ping', '1.0');
  // adds pynode bridge controller...
  pynodeBridgeV1Controller.bindToExpressApplication(application, '/pynode-bridge', '1.0');
  //#endregion
};

const createDirectoriesAsync = async () => {
  // creates application data directory...
  await FileUtilities.createDirectoryAsync(configuration.applicationDataDirectory);
  // creates logs directory...
  await FileUtilities.createDirectoryAsync(configuration.logsDirectory);
  // creates uploads directory...
  await FileUtilities.createDirectoryAsync(configuration.uploads.directoryPath);
  // creates static files directory...
  await FileUtilities.createDirectoryAsync(configuration.staticFilesDirectory);
};

//#region Process Events

const onProcessExited = () => {
  logger.warning('Process is closing...');

  // destroys pynode bridge service instance...
  pynodeBridgeService.destroy();
  // closes http server...
  httpServer.close();

  logger.warning('Process closed successfully...');
};

// this event occurs when application exits...
process.on('exit', () => onProcessExited);
// this event occurs when Ctrl+C is pressed...
process.on('SIGINT', () => onProcessExited);
// these events occur when process is killed (e.g. nodemon restart)...
process.on('SIGUSR1', () => onProcessExited);
process.on('SIGUSR2', () => onProcessExited);
// this event occurs when exception is uncaught...
process.on('uncaughtException', () => onProcessExited);
// this event occurs on unhandled promise rejection...
process.on('unhandledRejection', () => onProcessExited);
//#endregion

// initializes PyNode Bridge service...
pynodeBridgeService.initializeAsync()
  .then(async () => {
    // creates necessary directories...
    await createDirectoriesAsync()
    // loads application state from file system...
    await ApplicationStateService.getInstance().loadAsync();
    // loads last generated UID...
    await UIDService.getInstance().loadLastGeneratedUIDAsync();

    configureApplication(application);

    httpServer.listen(configuration.port, configuration.host, async () => {
      logger.information(`Server is listening at http://${configuration.host}:${configuration.port}/api`);
    });
  })
  .catch(error => {
    logger.error('An unexpected error occurred.', error);
  });
