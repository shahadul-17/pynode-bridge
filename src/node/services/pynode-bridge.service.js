const path = require('path');
const fileSystem = require('fs');
const childProcess = require('child_process');
const { EventManager } = require('@shahadul-17/event-manager');
const { UIDGenerator } = require('@shahadul-17/uid-generator');

const PYTHON_LOADER_FILE_NAME = 'Loader.py';
const PYTHON_DEFAULT_WINDOWS_PATH = 'C:\\Program Files\\Python310';
const RESPONSE_START_FLAG = '<------------------- START ------------------->';
const RESPONSE_END_FLAG = '<------------------- END ------------------->';

module.exports.PyNodeBridgeService = class PyNodeBridgeService extends EventManager {

  static instance = new PyNodeBridgeService();

  constructor() {
    super();

    this.response = '';
    this.isDestroyed = false;
    this.uidGenerator = UIDGenerator.create();
    this.pythonProcess = undefined;
  }

  getProcessId() {
    return this.pythonProcess?.pid ?? -1;
  }

  /**
   * Sends data to python process.
   * @param {any} data Request data to be sent.
   */
  send(data) {
    if (!data || typeof data !== 'object') { return false; }

    // parsing data as JSON...
    const dataAsJson = JSON.stringify(data);

    // writing to python process...
    this.pythonProcess.stdin.write(`${dataAsJson}\n`);

    return true;
  }

  /**
   * Destroys the bridge.
   * @returns {Boolean} Returns true if successfully destroyed.
   * Otherwise returns false.
   */
  destroy() {
    this.isDestroyed = true;

    if (!this.pythonProcess) { return false; }

    this.send({ exit: true });
    this.pythonProcess.stdin.destroy();
    this.pythonProcess.kill();

    return true;
  }

  parseResponse() {
    const indexOfResponseStartFlag = this.response.indexOf(RESPONSE_START_FLAG);
    const indexOfResponseEndFlag = this.response.indexOf(RESPONSE_END_FLAG);

    if (indexOfResponseStartFlag === -1 || indexOfResponseEndFlag === -1) { return undefined; }

    // creating a copying of response...
    let response = this.response;
    // stripping end flag from response...
    response = response.substring(0, indexOfResponseEndFlag);
    // stripping start flag from response...
    response = response.substring(indexOfResponseStartFlag + RESPONSE_START_FLAG.length);

    // removing previously received/processed response from the global response...
    this.response = this.response.substring(indexOfResponseEndFlag + RESPONSE_END_FLAG.length);

    // if response is JSON...
    if (PyNodeBridgeService.isJson(response)) {
      try {
        // we shall parse the JSON response...
        response = JSON.parse(response);
      } catch (error) {
        console.error('An error occurred while parsing response as JSON.', error);
      }
    }

    return response;
  }

  /**
   * Initializes PyNode Bridge service.
   * @param {{
   * pythonInterpreterFileName?: String,
   * pythonInterpreterPath?: String,
   * pathEnvironmentVariable?: Array<String>,
   * }} options Request options that are required to initialize the bridge.
   * @returns {Promise<void>} Returns a promise.
   */
  initializeAsync(options = {}) {
    return new Promise((resolve, reject) => {
      this.isDestroyed = false;

      const spawnOptions = {
        shell: true,
        env: { ...process.env, },
      };

      options.pathEnvironmentVariable = Array.isArray(options.pathEnvironmentVariable) ? options.pathEnvironmentVariable : [];

      // if the operating system is windows and python interpreter path is not provided...
      if (process.platform === 'win32' && !options.pythonInterpreterPath) {
        // sets default windows python installation path as the python interpreter path...
        options.pythonInterpreterPath = PYTHON_DEFAULT_WINDOWS_PATH;
      }

      // checks if python interpreter path is provided...
      if (options.pythonInterpreterPath) {
        // checks if python interpreter exists in the directory...
        if (!fileSystem.existsSync(options.pythonInterpreterPath)) {
          return reject(new Error('Python interpreter is not found in this system.'));
        }

        options.pathEnvironmentVariable.push(options.pythonInterpreterPath);
        options.pathEnvironmentVariable.push(path.join(options.pythonInterpreterPath, 'Scripts'));
      }

      // adds path environment variable if provided...
      for (const variable of options.pathEnvironmentVariable) {
        spawnOptions.env.PATH += `${path.delimiter}${variable}`;
      }

      try {
        // spawns python application as child process...
        this.pythonProcess = childProcess.spawn(
          options.pythonInterpreterFileName ?? PyNodeBridgeService.getPythonInterpreterFileName(),
          [`src/python/services/${PYTHON_LOADER_FILE_NAME}`], spawnOptions);

        // adding listener to know if python process has exited...
        this.pythonProcess.on('close', async () => {
          if (this.isDestroyed) { return; }

          // respawns python process if closes...
          await this.initializeAsync(options);
        });

        // adding listener to catch exception from python process...
        this.pythonProcess.on('error', error => this.fireEventListeners({
          type: 'ERROR',
          error: error,
        }));

        // adding listener to catch error while reading from python process...
        this.pythonProcess.stdout.on('error', error => this.fireEventListeners({
          type: 'ERROR',
          error: error,
        }));

        // adding listener to read data from python process...
        this.pythonProcess.stdout.on('data', chunk => {
          // fires data event listener...
          this.fireEventListeners({ type: 'DATA', chunk: chunk, });

          // concatenating chunk to response...
          this.response += chunk.toString();

          // if complete response has been received, response will be parsed.
          // otherwise, this method will return undefined...
          const parsedResponse = this.parseResponse();

          // fires response event listener if response is parsed successfully...
          parsedResponse && this.fireEventListeners({ type: 'RESPONSE', response: parsedResponse, });
        });

        // adding listener to know when all the data has successfully been read from the python process...
        this.pythonProcess.stdout.on('end', () => {
          // if complete response has been received, response will be parsed.
          // otherwise, this method will return undefined...
          const parsedResponse = this.parseResponse();

          // fires response event listener if response is parsed successfully...
          parsedResponse && this.fireEventListeners({ type: 'RESPONSE', response: parsedResponse, });

          // fires end event listener...
          this.fireEventListeners({ type: 'END', });
        });

        // adding listener to read error data from python process...
        // this.pythonProcess.stderr.on('data', chunk => { errorResponse += chunk.toString(); });
        // adding listener to know if there occurs an error while reading error from python process...
        // this.pythonProcess.stderr.on('error', error => reject(error));
        // adding listener to know when all the error data has successfully been read from the python process...
        // this.pythonProcess.stderr.on('end', () => reject(errorResponse));
      } catch (error) {
        reject(error);
      }

      resolve();
    });
  }

  /**
   * Retrieves response from python application.
   * @param {{
   * moduleName: String,
   * functionName: String,
   * functionArguments: any,
   * }} options Request options that are required to get response.
   * @returns {Promise<any>} Returns a promise that resolves to python response.
   */
  getResponseFromPythonAsync(options) {
    const context = this;

    return new Promise((resolve, reject) => {
      // generating a unique request ID...
      const requestId = this.uidGenerator.generate();

      function onErrorOccurred(eventArguments) {
        context.removeEventListener(onErrorOccurred);

        reject(eventArguments.error);
      }

      function onResponseReceived(eventArguments) {
        context.removeEventListener(onResponseReceived);

        const response = eventArguments.response;

        // if request ID that we received from the response
        // is not equal to the generated request ID, we shall not proceed...
        if (response.request_id !== requestId) { return; }

        // removing the request data from the response object...
        delete response.request_id;

        // but if the request ID is equal to our generated one,
        // we shall resolve the response...
        resolve(response);
      }

      try {
        // adding listener to catch exception from python process...
        this.addEventListener('ERROR', onErrorOccurred);
        this.addEventListener('RESPONSE', onResponseReceived);
        // writing data to python process...
        this.send({
          requestId: requestId,
          moduleName: options.moduleName,
          // resolves module path...
          modulePath: path.resolve(__dirname, '..', '..', 'python', 'scripts', options.moduleName),
          functionName: options.functionName,
          functionArguments: options.functionArguments,
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  static isJson(text) {
    const firstCharacter = text.charAt(0);
    const lastCharacter = text.charAt(text.length - 1);

    return (firstCharacter === '{' && lastCharacter === '}')
      || (firstCharacter === '[' && lastCharacter === ']');
  }

  /**
   * Retrieves python interpreter file name based
   * on the operating system.
   * @returns Returns python interpreter file name based
   * on the operating system.
   */
  static getPythonInterpreterFileName() {
    const platform = process.platform;

    switch (platform) {
      case 'win32':
        return 'python.exe';
      case 'linux':
        return 'python3';
      default:
        return 'python';
    }
  }

  static getInstance() {
    return this.instance;
  }
}
