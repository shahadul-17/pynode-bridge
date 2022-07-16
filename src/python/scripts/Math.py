def add(arguments):
  # retrieves function arguments from arguments...
  function_arguments = arguments['function_arguments']
  # retrieves cache from arguments...
  cache = arguments['cache']
  # preparing key for cache...
  cache_key = str(function_arguments['a']) + '+' + str(function_arguments['b'])
  # retrieves cached data by key from cache...
  cached_data = cache.get(cache_key)

  # checks if total exists in cache...
  if cached_data is not None:
    # if data is already cached, we shall return data from cache...
    return {
      'isCached': True,
      'total': cached_data,
    }

  # calculates sum
  total = function_arguments['a'] + function_arguments['b']
  # else, we calculate the value and set it to cache...
  cache[cache_key] = total

  # returns cached value...
  return {
    'isCached': False,
    'total': total,
    # cache must be provided to update the cache...
    'cache': cache
  }
