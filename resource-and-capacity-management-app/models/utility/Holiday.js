/**
 * Holiday class for tracking holidays
 */
export class Holiday {
  constructor(data = {}) {
    this.HolidayID = data.HolidayID || 0;
    this.name = data.name || '';
    this.day = data.day || 0; // Integer (1-31)
    this.Month = data.Month || 0; // Integer (1-12)
    this.year = data.year || 0; // Integer
  }
}
