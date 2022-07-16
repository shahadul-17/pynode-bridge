import sys

sys.path.append('./src/python/common')
sys.path.append('./src/python/services')

import importlib.util
import multiprocessing
import Utilities
from multiprocessing.connection import Connection
from Logger import LoggerLogLevels

class BackgroundProcess:

  def __init__(self, arguments: dict):
    self.__arguments = arguments
    self.__process_handle: multiprocessing.Process = None

  # returns response as dictionary containing formatted exception...
  def __get_exception_response(self):
    formatted_exception = Utilities.get_formatted_exception()

    return {
      'hasSucceeded': False,
      'exception': formatted_exception,
    }

  # child processes send log requests to parent process...
  def __send_log_request_to_parent(self, child_connection: Connection, log_level: LoggerLogLevels = None, *data):
    # sets default log level to 'information' if not provided...
    if log_level is None:
      log_level = LoggerLogLevels.Information

    # sending log request to parent process...
    child_connection.send({
      'shall_log': True,
      'log_level': log_level,
      'current_file_path': __file__,
      'data': data,
    })

  # dynamically executes function based on arguments...
  def __dynamically_execute_function(self, arguments: dict):
    # retrieving request ID...
    request_id: str = arguments.get('request_id')
    # retrieving function name from arguments...
    function_name: str = arguments.get('function_name')
    # retrieving module path from arguments...
    module_path: str = arguments.get('module_path')
    # retrieving function arguments from arguments...
    function_arguments: str = arguments.get('function_arguments')
    # retrieving child connection object from function arguments...
    # NOTE: child connection shall never be None...
    child_connection: Connection = arguments.get('connection')

    try:
      self.__send_log_request_to_parent(child_connection, LoggerLogLevels.Information, f'Dynamically executing function "{function_name}()" from "{module_path}" for request ID {request_id} with the following arguments.', function_arguments)

      # dynamically importing the module spec from file location...
      module_spec = importlib.util.spec_from_file_location(function_name, module_path)
      # creating module based on the spec...
      module = importlib.util.module_from_spec(module_spec)
      # executes the module in its own namespace...
      module_spec.loader.exec_module(module)
      # dynamically reading the function by name...
      function = getattr(module, function_name)
      # calling the function with arguments...
      result = function(arguments)
      # initializing cache with None...
      cache = None

      # if result is not None and is an instance of dictionary...
      if result is not None and isinstance(result, dict):
        # retrieving cache from result...
        cache = result.get('cache')

        # if cache is present...
        if cache is not None:
          # we shall delete cache from the result...
          del result['cache']

      return {
        'hasSucceeded': True,
        'result': result,
        'request_id': request_id,
        'additional_data': {
          'request_id': request_id,
          'module_path': module_path,
          'function_name': function_name,
          'function_arguments': function_arguments,
          'cache': cache
        },
      }
    except:
      exception_response = self.__get_exception_response()
      exception_response['request_id'] = request_id
      exception_response['additional_data'] = {
        'module_path': module_path,
        'function_name': function_name,
        'function_arguments': function_arguments
      }

      return exception_response

  # retrieves response by executing functions dynamically in child process...
  def get_response_from_dynamically_executed_function(self, arguments: dict):
    # retrieves request ID...
    request_id: str = arguments.get('requestId')
    # retrieving child process connection object from arguments...
    # NOTE: child connection shall never be None...
    child_connection: Connection = arguments.get('connection')

    self.__send_log_request_to_parent(child_connection, LoggerLogLevels.Information, f'Child process has initialized to process request ID {request_id}')

    # sending notification to the parent process so that it can stop waiting for the background process to spawn...
    child_connection.send({ 'request_id': request_id, 'has_spawned': True })

    # dynamically executing the function from the module...
    response = self.__dynamically_execute_function(arguments)

    # writes response to parent process...
    child_connection.send(response)

  # starts the background process...
  def start(self):
    # creating new process to dynamically execute function from
    # the module and write JSON response to standard output...
    self.__process_handle = multiprocessing.Process(
      target=self.get_response_from_dynamically_executed_function,
      args=(self.__arguments,), daemon=False)
    # starts the newly created background process...
    self.__process_handle.start()

  # returns the underlying process handle...
  def get_process_handle(self):
    return self.__process_handle
