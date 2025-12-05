/**
 * Availability class for tracking resource availability
 */
import { AvailabilityStatus } from './AvailabilityStatus';
import { Calendar } from '../utility/Calendar';

export class Availability {
  constructor(data = {}) {
    this.employeeID = data.employeeID || 0;
    this.calendar = data.calendar || null; // Calendar instance
    this.month = data.month || 0; // Calendar month (1-12) - from calendar.month
    this.year = data.year || 0; // Calendar year - from calendar.year
    this.availabilityStatus = data.availabilityStatus || AvailabilityStatus.FULL_TIME;
  }

  /**
   * Set availability status
   * @param {string} availabilityStatus - Availability status from AvailabilityStatus enum
   */
  setAvailability(availabilityStatus) {
    if (Object.values(AvailabilityStatus).includes(availabilityStatus)) {
      this.availabilityStatus = availabilityStatus;
    }
  }

  /**
   * Check if available
   * @returns {boolean} True if available (not terminated or on-leave)
   */
  isAvailable() {
    return this.availabilityStatus === AvailabilityStatus.FULL_TIME || 
           this.availabilityStatus === AvailabilityStatus.PART_TIME;
  }
}
