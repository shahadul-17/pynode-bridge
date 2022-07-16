import sys

sys.path.append('./src/python/common')
sys.path.append('./src/python/services')

import json
import threading
import multiprocessing
import time
import Utilities
from queue import Queue
from Logger import Logger, LoggerLogLevels
from BackgroundProcess import BackgroundProcess

PARENT_CONNECTION_POLL_TIMEOUT_IN_MILLISECONDS = 10
CHILD_PROCESS_SPAWNER_THREAD_REQUEST_DATA_RECEIVE_TIMEOUT_IN_SECONDS = 0.25
BACKGROUND_PROCESS_SPAWN_WAIT_POLL_TIMEOUT_IN_SECONDS = 0.1
BACKGROUND_PROCESS_SPAWN_WAIT_ADDITIONAL_TIMEOUT_IN_SECONDS = 1
LOG_FILE_DIRECTORY_PATH = 'application-data/logs'
RESPONSE_START_FLAG = '<------------------- START ------------------->'
RESPONSE_END_FLAG = '<------------------- END ------------------->'
# cached data shall be stored in this dictionary...
CACHE = {}

# loader...
class Loader:

  # initializing python loader...
  def __init__(self):
    # flag that indicates if python loader is disposed...
    self.__is_disposed = False
    # flag that indicates if python loader is running...
    self.__is_running = False
    # flag that indicates if background process has spawned...
    self.__has_process_spawned = False
    # global logger...
    self.__logger = Logger.get_instance(LOG_FILE_DIRECTORY_PATH)
    # queue that holds child process spawn requests...
    self.__child_process_spawn_requests = Queue()
    # creating pipe to communicate with child process...
    self.__parent_connection, self.__child_connection = multiprocessing.Pipe(duplex=False)

  # reads data from standard input...
  def __read_from_standard_input(self):
    # this try block is only for handling errors while reading lines from standard input...
    try:
      # trying to read line from standard input...
      line = sys.stdin.readline()

      self.__logger.information(__file__, 'Request data is read from standard input...')
    except:
      self.__logger.error(__file__, 'An error occurred while reading line from standard input...', Utilities.get_formatted_exception())

      # returs False if there is an error while reading line from standard input...
      return False

    try:
      line = line.strip()

      self.__logger.information(__file__, 'Removing leading and trailing whitespaces from the line...')

      # if the line read from standard input is empty...
      if len(line) == 0:
        self.__logger.warning(__file__, 'Line read from the standard input is empty...')

        # we shall return None...
        return None

      self.__logger.information(__file__, 'Trying to parse the line as JSON...')

      # parsing line as JSON...
      data = json.loads(line)

      self.__logger.information(__file__, 'Successfully parsed line as JSON...')

      return data
    except:
      self.__logger.information(__file__, 'An error occurred while parsing data from line...', Utilities.get_formatted_exception())

      return None

  # prepares data before writing to standard output...
  def __prepare_data(self, data):
    # if response is 'None'...
    if data is None:
      # we'll assign empty dictionary...
      data = {}

    # parsing response as JSON...
    data_as_json = json.dumps(data)

    return data_as_json

  # writes data to standard output...
  def __write_to_standard_output(self, data):
    self.__logger.information(__file__, 'Preparing response data for writing...')

    # prepares data for writing by parsing it as JSON...
    data_as_json = self.__prepare_data(data)

    self.__logger.information(__file__, 'Response data is prepared for writing...')
    self.__logger.information(__file__, 'Writing prepared response data to standard system output...')

    # writing JSON response to standard output...
    sys.stdout.write(f'{RESPONSE_START_FLAG}{data_as_json}{RESPONSE_END_FLAG}')

    self.__logger.information(__file__, 'Response data written to standard system output...')
    self.__logger.information(__file__, 'Flushing standard system output...')

    # flushing standard output...
    sys.stdout.flush()

    self.__logger.information(__file__, 'Response data has been written successfully to standard system output...')

  # writes log receieved from the child process...
  def __write_child_process_log(self, log_response: dict):
    # we shall log the response data...
    log_level: LoggerLogLevels = log_response.get('log_level')
    current_file_path: str = log_response.get('current_file_path')
    data: tuple = log_response.get('data')

    self.__logger.log(log_level, current_file_path, *data)

  # reads responses from child processes...
  def __read_responses_from_child_processes(self):
    self.__logger.information(__file__, 'Background thread is listening for child process response...')

    # indefinitely waits for data from child processes...
    while self.__is_running:
      # checks if response is available...
      if self.__parent_connection.poll(timeout=PARENT_CONNECTION_POLL_TIMEOUT_IN_MILLISECONDS):
        self.__logger.information(__file__, 'Background thread needs to receive response from child process now...')

        try:
          # if response is found, we'll store this...
          response = self.__parent_connection.recv()
        except:
          self.__logger.error(__file__, 'An error occurred while receiving response from the child process.', Utilities.get_formatted_exception())

          continue

        self.__logger.information(__file__, 'Background thread has received the following response from the child process.', response)

        # if received response contains key 'shall_log' with value 'True'...
        if response.get('shall_log') is True:
          self.__write_child_process_log(response)

          continue

        # if received response contains key 'has_spawned' with value 'True'...
        if response.get('has_spawned') is True:
          # we shall set the value of the flag '__has_process_spawned' to 'True'...
          self.__has_process_spawned = True

          continue

        # retrieves additional data and it is always present...
        additional_data = response.get('additional_data')

        # if additional data is not None...
        if additional_data is not None:
          # we shall delete additional data...
          del response['additional_data']

        # writes response to standard output...
        self.__write_to_standard_output(response)

        # retrieves cache from additional data...
        cache = additional_data.get('cache')

        # if cache is not None and is an instance of dictionary...
        if cache is not None and isinstance(cache, dict):
          # we shall update current cache with the new one...
          Loader.__set_cached_data(additional_data['function_name'], additional_data['module_path'], cache)

  # spawns a child process...
  def __spawn_child_process(self, arguments: dict):
    # reading request ID...
    request_id = arguments.get('requestId')
    # reading function name from request data...
    function_name = arguments.get('functionName')
    # reading module path from request data...
    module_path = arguments.get('modulePath')
    # reading function arguments from request data...
    function_arguments = arguments.get('functionArguments')

    # renaming keys...
    arguments['function_name'] = function_name
    arguments['module_path'] = module_path
    arguments['request_id'] = request_id
    arguments['function_arguments'] = function_arguments

    # sets child connection to data...
    arguments['connection'] = self.__child_connection
    # adding cache to data...
    arguments['cache'] = Loader.__retrieve_cached_data(function_name, module_path)

    self.__logger.information(__file__, 'Background thread is spawning new process with the following data...', arguments)

    # initiates background process...
    backgroundProcess = BackgroundProcess(arguments)
    backgroundProcess.start()

    self.__logger.information(__file__, 'Background thread has spawned new process with the following data...', arguments)

    return backgroundProcess

  # handles requests to spawn child processes...
  def __handle_child_process_spawn_requests(self):
    self.__logger.information(__file__, 'Background thread started for handling child process spawn requests...')

    while self.__is_running:
      # self.__logger.information(__file__, 'Background thread is waiting for spawn requests from parent process...')

      try:
        # receives request datum from request data queue...
        child_process_spawn_request = self.__child_process_spawn_requests.get(timeout=CHILD_PROCESS_SPAWNER_THREAD_REQUEST_DATA_RECEIVE_TIMEOUT_IN_SECONDS)
      except:
        # self.__logger.warning(__file__, 'An error occurred while processing child process spawn request...', __get_formatted_exception())

        # we shall continue iteration if no data is read or during exception...
        continue

      # spawns a child process...
      self.__spawn_child_process(child_process_spawn_request)

  # waits until background process spawns...
  def __wait_for_background_process_to_spawn(self):
    # sets '__has_process_spawned' flag to false...
    self.__has_process_spawned = False

    # this while loop iterates until the value of the flag '__has_process_spawned' is True...
    while self.__has_process_spawned is False:
      # before checking the flag value, this thread shall sleep for a while...
      time.sleep(BACKGROUND_PROCESS_SPAWN_WAIT_POLL_TIMEOUT_IN_SECONDS)

    # waits for a few more milliseconds to be safe...
    time.sleep(BACKGROUND_PROCESS_SPAWN_WAIT_ADDITIONAL_TIMEOUT_IN_SECONDS)

  # execution starts from this method...
  def execute(self):
    if self.__is_disposed:
      raise Exception('This instance of Python Loader class has been disposed.')

    self.__logger.information(__file__, 'Initializing python loader...')

    # setting 'isRunning' flag to true...
    self.__is_running = True

    # creating a thread to initiate child processes...
    child_process_spawner_thread = threading.Thread(target=self.__handle_child_process_spawn_requests, daemon=False)
    # starts listening for child process spawn requests...
    child_process_spawner_thread.start()

    # creating a thread to read response from child processes...
    child_process_response_reader_thread = threading.Thread(target=self.__read_responses_from_child_processes, daemon=False)
    # starts listening from child processes...
    child_process_response_reader_thread.start()

    while self.__is_running:
      try:
        # reading data from standard input...
        data = self.__read_from_standard_input()

        # we shall skip this iteration if received data is None...
        if data is None:
          self.__logger.warning(__file__, 'Skipping iteration as received request data is None...')

          continue

        # checks if data is false or 'exit' is true...
        if data is False or data.get('exit') == True:
          self.__is_running = False

          self.__logger.warning(__file__, 'Received exit request in main thread...')

          break

        self.__logger.information(__file__, 'Received data is about to be placed on queue to be processed by the background thread...', data)

        # placing data on queue. background thread shall receive
        # the data and perform further processing...
        self.__child_process_spawn_requests.put(data)
        
        self.__logger.information(__file__, 'Received data is successfully placed on queue to be processed by the background thread...', data)
        self.__logger.information(__file__, 'Waiting for background process to spawn...')

        # we need to pause execution of current thread in order for
        # our background process to be initiated properly. otherwise process spawn
        # gets blocked by 'self.__read_from_standard_input()' method...
        self.__wait_for_background_process_to_spawn()

        self.__logger.information(__file__, 'Background process spawned successfully...')
      except:
        self.__logger.warning(__file__, 'An error occurred while processing input.', Utilities.get_formatted_exception())

  # releases resources occupied by python loader...
  def dispose(self):
    if self.__is_disposed:
      raise Exception('This instance of Python Loader class has been disposed.')

    # setting is disposed flag to true...
    self.__is_disposed = True
    # setting is running flag to false...
    self.__is_running = False
    # disposes python logger...
    self.__logger.dispose()
    # disposes child process connection...
    self.__child_connection.close()
    # disposes parent process connection...
    self.__parent_connection.close()

  # prepares key for caching...
  @staticmethod
  def __prepare_cache_key(function_name: str, module_path: str):
    # prepares cache key...
    return f'{function_name}@{module_path}'

  # retrieves cached data...
  @staticmethod
  def __retrieve_cached_data(function_name: str, module_path: str) -> dict:
    global CACHE

    # prepares cache key...
    cache_key = Loader.__prepare_cache_key(function_name, module_path)
    # retrieves cached data by key...
    cached_data = CACHE.get(cache_key)

    # if no cached data exists...
    if cached_data is None:
      # creating a new dictionary as cached data...
      cached_data = {}
      # we add the newly created dictionary to our cache corresponding to the key...
      CACHE[cache_key] = {}

    return cached_data

  # sets cached data...
  @staticmethod
  def __set_cached_data(function_name: str, module_path: str, cached_data: dict):
    global CACHE

    # prepares cache key...
    cache_key = Loader.__prepare_cache_key(function_name, module_path)
    # sets cached data corresponding to the key...
    CACHE[cache_key] = cached_data

# entry point of the application...
if __name__ == '__main__':
  # initializing loader...
  loader = Loader()
  # executes loader...
  loader.execute()
  # disposes loader once execution is finished...
  loader.dispose()
