/**
 * Capacity class for tracking resource capacity
 */
import { ActivityCategory } from "../allocation-activities"
import { Calendar } from "../utility";

export class Capacity {
  constructor(data = {}) {
    this.category = data.category;
    this.month = data.month;
    this.totalCapacity = data.totalCapacity || 0;
  }
}
