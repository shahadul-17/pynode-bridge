const { instanceId, } = require('../configuration');
const { UIDGenerator } = require('@shahadul-17/uid-generator');
const { ApplicationStateService } = require('./application-state.service');

module.exports.UIDService = class UIDService {

  constructor() {
    this.uidGenerator = UIDGenerator.create();
    this.applicationStateService = ApplicationStateService.getInstance();
  }

  async loadLastGeneratedUIDAsync() {
    const lastGeneratedUid = await this.applicationStateService.getAsync('lastGeneratedUid');

    if (typeof lastGeneratedUid !== 'string') { return; }

    this.uidGenerator.setLast(lastGeneratedUid);
  }

  async generateUIDAsync() {
    const uid = this.uidGenerator.generate();

    // saves the newly generated UID as last generated UID to application state...
    await this.applicationStateService.setAsync({ lastGeneratedUid: uid, });

    return `${instanceId}-${uid}`;
  }

  static instance = new UIDService();

  static getInstance() { return this.instance; }
}
