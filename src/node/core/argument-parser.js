/**
 * @returns {Map<String, String>} Returns arguments map.
 */
const populateArgumentsMap = () => {
  const argumentsMap = new Map();

  for (let i = 2; i < process.argv.length; i++) {
    const argument = process.argv[i];

    if (!argument.startsWith("--")) {
      continue;
    }

    i++;    // i points to the next index...

    const argumentName = argument.substring(2);
    const argumentValue = process.argv[i];    // next argument is the value...

    argumentsMap.set(argumentName, argumentValue);
  }

  return argumentsMap;
};

const argumentsMap = populateArgumentsMap();

/**
 * Retrieves command-line argument value by name.
 * @param {String} argumentName Command-line argument name.
 * @returns Returns command-line argument.
 */
module.exports.getArgument = argumentName => {
  return argumentsMap.get(argumentName);
};
