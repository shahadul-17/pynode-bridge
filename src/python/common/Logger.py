import enum
import json
from datetime import datetime
import os
import threading

# this format shall be used to format date time while writing to log...
LOG_DATE_TIME_FORMAT = '%d-%b-%Y %I:%M:%S %p %z'
# this is the file name in which the logs shall be written...
LOG_FILE_NAME = 'python-bridge.log'
# global mutex for thread synchronization...
MUTEX = threading.Lock()

# log levels for python logger.
# e.g. 'Fatal'|'Error'|'Warning'|'Information'|'Debug' etc...
class LoggerLogLevels(enum.Enum):
  Fatal = 'Fatal'
  Error = 'Error'
  Warning = 'Warning'
  Information = 'Information'
  Debug = 'Debug'

# custom logger for python...
class Logger:

  # static Python Logger instance...
  __instance = None

  # initializing logger...
  def __init__(self, log_file_directory_path: str):
    # stores log file directory path...
    self.__log_file_directory_path = log_file_directory_path
    # file handle...
    self.__file_handle = Logger.__create_file_handle(self.__log_file_directory_path)

  def __enter__(self):
    return self

  def __exit__(self, exception_type, exception_value, exception_traceback):
    self.dispose()

  def log(self, log_level: LoggerLogLevels, current_file_path: str, *data):
    global MUTEX

    # extracting base name from the file path which shall be used as context... 
    context = os.path.basename(current_file_path)
    # formatting log to be written...
    formatted_log = Logger.__format_log(log_level, context, *data)

    # synchronized block starts here by acquiring lock...
    MUTEX.acquire()

    try:
      if self.__file_handle is not None and not self.__file_handle.closed:
        # writes formatted log to file...
        self.__file_handle.write(f'{formatted_log}\n')
        # flushing buffered content (if any)...
        self.__file_handle.flush()
    finally:
      # synchronized block ends here by releasing the lock...
      MUTEX.release()

  def fatal(self, current_file_path: str, *data):
    self.log(LoggerLogLevels.Fatal, current_file_path, *data)

  def error(self, current_file_path: str, *data):
    self.log(LoggerLogLevels.Error, current_file_path, *data)

  def warning(self, current_file_path: str, *data):
    self.log(LoggerLogLevels.Warning, current_file_path, *data)

  def information(self, current_file_path: str, *data):
    self.log(LoggerLogLevels.Information, current_file_path, *data)

  def debug(self, current_file_path: str, *data):
    self.log(LoggerLogLevels.Debug, current_file_path, data)

  def dispose(self):
    # if file handle is None...
    if self.__file_handle is None:
      # we shall do nothing...
      return

    # closes the opened static file handle...
    self.__file_handle.close()

    # setting None to file handle...
    self.__file_handle = None

  @staticmethod
  def __format_log(log_level: LoggerLogLevels, context: str, *data):
    # taking current time as string and formatting it as needed...
    current_time = datetime.now().strftime(LOG_DATE_TIME_FORMAT)
    # taking a variable and assigning empty string to it...
    formatted_log = f'{current_time} [{log_level.value}] [{context}] '

    # iterates through each datum in data...
    for datum in data:
      # if datum is none...
      if datum is None:
        # we shall append 'None' to log as string...
        formatted_log += 'None '
      # if datum is an instance of boolean, integer, float or string...
      elif isinstance(datum, bool) or isinstance(datum, int) or isinstance(datum, float) or isinstance(datum, str):
        # we shall append the datum to log as string...
        formatted_log += f'{datum} '
      # if datum is a tuple...
      elif isinstance(datum, tuple):
        # we'll not add write it to log...
        continue
      # if datum is an instance of object...
      elif isinstance(datum, object):
        # if the datum is not an instance of dictionary...
        if not isinstance(datum, dict):
          # we shall get dictionary version of the object...
          datum = datum.__dict__

        # we shall dump the datum as JSON string...
        try:
          json_datum = json.dumps(datum, skipkeys=True, indent = 2)
          # we'll append the json with leading and trailing new lines...
          formatted_log += f'\n{json_datum}\n'
        except:
          # gets datum as string...
          datum_as_string = str(datum)
          # and appends to log...
          formatted_log += f'{datum_as_string} '

      # if any other type is encountered...
      else:
        try:
          # we shall try to stringify that datum...
          formatted_log += f'{str(datum)} '
        except:
          # if exception occurs, we'll just skip...
          pass

    # lastly we shall strip any leading and trailing new lines of our formatted log...
    formatted_log = formatted_log.strip()

    # returns the formatted log...
    return formatted_log

  @staticmethod
  def __create_file_handle(log_file_directory_path: str):
    # if log file directory path does not exist...
    if not os.path.exists(log_file_directory_path):
      # we shall create new directory...
      os.makedirs(log_file_directory_path)

    # prepares log file path...
    log_file_path = os.path.join(log_file_directory_path, LOG_FILE_NAME)
    # opens log file handle...
    file_handle = open(log_file_path, 'a')

    return file_handle

  @staticmethod
  def get_instance(log_file_directory_path: str = None):
    global MUTEX

    # synchronized block starts here by acquiring lock...
    MUTEX.acquire()

    try:
      # if static instance of python logger is None...
      if Logger.__instance is None:
        # if log file directory path is None...
        if log_file_directory_path is None:
          # raises type error...
          raise TypeError('Log file directory path must be provided as logger has not been initialized.')

        # otherwise creates python logger instance...
        Logger.__instance = Logger(log_file_directory_path)

      # assigning newly created logger instance to our local instance variable...
      instance = Logger.__instance
    finally:
      # synchronized block ends here by releasing the lock...
      MUTEX.release()

    # returns python logger instance...
    return instance
