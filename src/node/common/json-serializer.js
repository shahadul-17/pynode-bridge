const { ObjectUtilities } = require('./object-utilities');

class JsonSerializer {

  /**
   * 
   * @param {Object} data 
   * @param {Number} spaces 
   * @param {Boolean} deepSerialize 
   * @param  {...String} fieldsToIgnore 
   * @returns 
   */
  static serialize(data, spaces, deepSerialize = false, ...fieldsToIgnore) {
    if (!Array.isArray(data)) {
      data = ObjectUtilities.sanitize(data, deepSerialize, ...fieldsToIgnore);
    }

    if (!data) { return ''; }

    return JSON.stringify(data, undefined, spaces);
  }

  /**
   * 
   * @param {String} json 
   * @returns {Object}
   */
  static deserialize(json) {
    return JSON.parse(json);
  }
}

module.exports = JsonSerializer;
