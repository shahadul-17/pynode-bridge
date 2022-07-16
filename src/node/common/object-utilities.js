module.exports.ObjectUtilities = class ObjectUtilities {

  /**
   * 
   * @param {Object} data 
   * @param {Boolean} deepSanitize 
   * @param  {...String} propertiesToIgnore 
   * @returns 
   */
  static sanitize(data, deepSanitize = false, ...propertiesToIgnore) {
    if (!data) { return data; }

    const sanitizedData = {};
    // prepares sanitized data object...
    const propertyNames = Object.getOwnPropertyNames(data);

    if (propertyNames.length === 0) { return undefined; }

    for (const propertyName of propertyNames) {
      if (propertiesToIgnore.includes(propertyName)) { continue; }

      let propertyValue = data[propertyName];

      if (deepSanitize && typeof propertyValue === 'object') {
        propertyValue = this.sanitize(propertyValue,
          deepSanitize, ...propertiesToIgnore);
      }

      sanitizedData[propertyName] = propertyValue;
    }

    return sanitizedData;
  }
}
