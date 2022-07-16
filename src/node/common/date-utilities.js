module.exports.DateUtilities = class DateUtilities {

  /**
   * This method ensures that any given number is atleast double digit.
   * It adds a leading zero if the provided number is single digit.
   * @param {Number | String} number Number that needs to be double digit.
   * @returns {String} Returns double digit number.
   */
  static ensureDoubleDigit(number) {
    if (number === undefined || number === null) { return undefined; }

    if (typeof number === 'string') {
      number = Number(number);
    }

    if (isNaN(number)) { return '00'; }

    if (number < 10) { return `0${number}`; }

    return number;
  }

  /**
   * Formats time. If provided date is undefined/null, it
   * returns the date (undefined/null).
   * @param {String|Date} date Date that needs to be formatted.
   * @returns {String} Returns the formatted time as string.
   */
  static formatTime(date) {
    if (!date) { return date; }

    if (typeof (date) === "string") {
      date = new Date(date);
    }

    let hours = date.getHours();
    const minutes = this.ensureDoubleDigit(date.getMinutes());
    const seconds = this.ensureDoubleDigit(date.getSeconds());
    const amPm = hours < 12 ? "AM" : "PM";
    const timezone = -date.getTimezoneOffset() / 60;

    hours = hours % 12;
    hours = hours ? hours : 12;         // if hours is equal to zero, we make it twelve...
    hours = this.ensureDoubleDigit(hours);

    return `${hours}:${minutes}:${seconds} ${amPm} (${timezone ? `+${timezone}` : timezone})`;
  }

  /**
   * Formats day. If provided date is undefined/null, it
   * returns the date (undefined/null).
   * @param {String|Date} date Date that needs to be formatted.
   * @returns {String} Returns the formatted day as string.
   */
  static formatDay(date) {
    if (!date) { return date; }

    if (typeof (date) === "string") {
      date = new Date(date);
    }

    const day = this.ensureDoubleDigit(date.getDate());
    const month = date.toLocaleString("BD", { month: "short" });
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  }

  /**
   * Formats date. If provided date is undefined/null, it
   * returns the date (undefined/null).
   * @param {String|Date} date Date that needs to be formatted.
   * @returns {String} Returns the formatted date as string.
   */
  static formatDate(date) {
    if (!date) { return date; }

    if (typeof (date) === "string") {
      date = new Date(date);
    }

    return `${this.formatDay(date)} ${this.formatTime(date)}`;
  }
}
