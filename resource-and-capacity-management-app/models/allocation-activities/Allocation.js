/**
 * Allocation class for resource allocation to activities
 */
import { Resource } from '../resource-management/Resource';
import { User } from '../user-management/User';
import { AllocationByCalendar } from './AllocationByCalendar';

export class Allocation {
  constructor(data = {}) {
    this.allocationID = data.allocationID || 0;
    this.firstName = data.firstName || '';
    this.lastName = data.lastName || '';
    this.allocatedResource = data.allocatedResource || null; // Resource class instance
    this.department = data.department || '';
    this.reportTo = data.reportTo || null; // User class instance
    this.leaderAccountable = data.leaderAccountable || null; // User class instance
    this.requestor = data.requestor || null; // User class instance
    this.requestorVP = data.requestorVP || null; // User class instance
    this.requestingDepartment = data.requestingDepartment || '';
    this.allocatedTime = data.allocatedTime || []; // List<AllocationByCalendar class>
  }

  /**
   * Assign allocation
   */
  assign() {
    // Implementation here
  }

  /**
   * Validate allocation
   * @returns {boolean} True if allocation is valid
   */
  validateAllocation() {
    // Implementation here
  }

  /**
   * Get allocation ratio
   * @returns {number} Allocation ratio as a small real number
   */
  getAllocationRatio() {
    // Implementation here
  }

  /**
   * Check if resource is over-allocated
   * @returns {boolean} True if over-allocated
   */
  isOverAllocated() {
    // Implementation here
  }

  /**
   * Get utilization status
   * @returns {string} Utilization status
   */
  getUtilizationStatus() {
    // Implementation here
  }
}
