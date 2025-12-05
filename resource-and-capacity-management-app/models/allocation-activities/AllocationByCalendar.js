/**
 * AllocationByCalendar class for calendar-based resource allocation
 */
import { Calendar } from '../utility/Calendar';

export class AllocationByCalendar {
  constructor(data = {}) {
    this.calendar = data.calendar || null; // Calendar class instance
    this.allocatedTime = data.allocatedTime || 0; // Integer
  }
}
