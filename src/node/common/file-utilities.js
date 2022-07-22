const { RandomGenerator } = require('@shahadul-17/random-generator');
const fileSystem = require('fs');
const asyncFileSystem = require('fs/promises');
const path = require('path');
const JsonSerializer = require('./json-serializer');

module.exports.FileUtilities = class FileUtilities {

  /**
   * @async
   * @param {String} filePath 
   * @returns {Promise<boolean>} 
   */
  static async deleteFileAsync(filePath) {
    try {
      await asyncFileSystem.unlink(filePath);
    } catch (error) {
      console.error('An error occurred while deleting the requested file.', error);

      return false;
    }

    return true;
  }

  static exists(path) {
    return fileSystem.existsSync(path);
  }

  static async createDirectoryAsync(directoryPath) {
    if (FileUtilities.exists(directoryPath)) { return; }

    await asyncFileSystem.mkdir(directoryPath, { recursive: true, });
  }

  /**
   * @param {String} fileName 
   * @returns {String} 
   */
  static getFileNameWithoutExtension(fileName) {
    const fileExtension = this.getFileExtension(fileName);
    const fileNameWithoutExtension = path.basename(fileName, fileExtension);

    return fileNameWithoutExtension;
  }

  /**
   * @param {String} fileName 
   * @returns {String} 
   */
  static getFileExtension(fileName) {
    return path.extname(fileName);
  }

  /**
   * @param {String} directoryPath 
   * @param {String} fileExtension 
   * @param {Number} length 
   * @returns {String} 
   */
  static generateFileName(directoryPath, fileExtension, length = 64) {
    let fileName;
    let fileExists;

    do {
      fileName = RandomGenerator.generateString(length - fileExtension.length);
      fileName = `${fileName}${fileExtension}`;
      fileExists = FileUtilities.exists(`${directoryPath}/${fileName}`);
    } while (fileExists);

    return fileName;
  }

  /**
   * @async
   * @param {String} filePath 
   * @param {*} file 
   * @returns {Promise<Boolean>} 
   */
  static moveFileAsync(filePath, file) {
    return new Promise((resolve, reject) => {
      file.mv(filePath, error => {
        if (error) {
          console.error(`An error occurred while moving file to '${filePath}'.`, error);

          resolve(false);

          return;
        }

        resolve(true);
      });
    });
  };

  /**
   * @async
   * @param {String} filePath 
   * @returns {String | any} 
   */
  static async readFileAsync(filePath) {
    const contents = await asyncFileSystem.readFile(filePath, { encoding: 'utf-8', });
    const firstCharacter = contents.charAt(0);
    const lastCharacter = contents.charAt(contents.length - 1);
    // checks if first and last characters are '{' and '}' or, '[' and ']'...
    const isJsonData = (firstCharacter === '{' && lastCharacter === '}') || (firstCharacter === '[' && lastCharacter === ']');

    // if contents is JSON...
    if (isJsonData) {
      // deserializes the contents and returns the deserialized object...
      return JsonSerializer.deserialize(contents);
    }

    // otherwise returns contents as string...
    return contents;
  }

  /**
   * @async
   * @param {String} filePath 
   * @param {String | any} data 
   */
  static async writeFileAsync(filePath, data, flag = 'w') {
    let contents = data;

    // checks if data is an object (array is also an object)...
    if (typeof contents === 'object') {
      contents = JsonSerializer.serialize(data, 2, true);
    }

    await asyncFileSystem.writeFile(filePath, contents, { encoding: 'utf-8', flag: flag, });
  }
};
