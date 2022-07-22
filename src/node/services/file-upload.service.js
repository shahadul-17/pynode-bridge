const path = require('path');
const { uploads, } = require('../configuration');
const { Logger } = require('../common/logger');
const { FileUtilities } = require('../common/file-utilities');

module.exports.FileUploadService = class FileUploadService {

  constructor() {
    this._logger = new Logger(__filename);
  }

  /**
   * Saves an uploaded file to appropriate location.
   * @param {any} file 
   * @returns {Promise<{
   * fileName: String,
   * originalFileName: String,
   * fileExtension: String,
   * filePath: String,
   * temporaryFilePath: String,
   * contentLength: Number,
   * contentType: String,
   * md5Hash: String
   * }>} Returns saved file info.
   */
  async saveFileAsync(file) {
    // if file is undefined/null or not an object or the object does not contain a function named mv,
    // we shall return undefined...
    if (!file || typeof file !== 'object' || typeof file.mv !== 'function') { return undefined; }

    try {
      const fileExtension = FileUtilities.getFileExtension(file.name);
      const fileName = FileUtilities.generateFileName(uploads.directoryPath, fileExtension);
      const filePath = path.join(uploads.directoryPath, fileName);

      // moves file to the specified path...
      await file.mv(filePath);

      return {
        fileName: fileName,
        originalFileName: file.name,
        fileExtension: fileExtension,
        filePath: filePath,
        temporaryFilePath: file.tempFilePath,
        contentLength: file.size,
        contentType: file.mimetype,
        md5Hash: file.md5,
      };
    } catch (error) {
      this._logger.error('An error occurred while saving the file.', error);

      return undefined;
    }
  }

  /**
   * Saves uploaded files.
   * @param {any | Array<any>} files Files to be handled.
   * @returns {Promise<Array<{
   * fileName: String,
   * originalFileName: String,
   * fileExtension: String,
   * filePath: String,
   * temporaryFilePath: String,
   * contentLength: Number,
   * contentType: String,
   * md5Hash: String
   * }>>} Returns file infos after files are saved.
   */
  async saveFilesAsync(files) {
    // if files is undefined/null, we shall return empty array...
    if (!files) { return []; }
    // if files is not an array of files, it means it is an object...
    if (!Array.isArray(files)) {
      // so, we shall make files an array containing the object...
      files = [files];
    }

    // taking an empty array to store file infos...
    const fileInfos = [];

    // we shall iterate over the files array...
    for (const file of files) {
      // saves each file to the uploads directory...
      const fileInfo = await this.saveFileAsync(file);

      // if file info is undefined, we shall skip this iteration...
      if (!fileInfo) { continue; }

      // pushes the file info to the array...
      fileInfos.push(fileInfo);
    }

    // returns the array containing file infos...
    return fileInfos;
  }

  static instance = new FileUploadService();

  static getInstance() { return this.instance; }
}
