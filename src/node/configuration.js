const { getArgument, } = require('./core/argument-parser');

const configuration = {
  instanceId: getArgument('instanceId') ?? '1',
  host: getArgument('host') ?? '127.0.0.1',
  port: getArgument('port') ?? '53631',
  poweredBy: 'PyNode Bridge',
  applicationDataDirectory: './application-data',
  logsDirectory: getArgument('logsDirectory') ?? "./application-data/logs",
  includeErrorStack: getArgument('includeErrorStack') ? getArgument('includeErrorStack') === 'true' : true,
  staticFilesDirectory: './application-data/wwwroot',
  applicationState: {
    dataFilePath: './application-data/application-state.json',
  },
  uploads: {
    directoryPath: './application-data/uploads',
    temporaryDirectoryPath: './application-data/temporary-files',
    maxFileSize: 10485760,            // maximum file size is 10 MB...
    fileNameLength: 64,
  },
};

module.exports = configuration;
