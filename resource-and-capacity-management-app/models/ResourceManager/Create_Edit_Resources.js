

 
/**
 * Get all employees with optional filters
 * @param {Object} db - MongoDB database instance
 * @param {Object} filters - filters { status, dept, manager_id, user_emp_id, filter }
 * @returns {Array} Array of employee objects
 */
async function getAllEmployees(db, filters = {}) {
  const { filter, status, dept, manager_id, user_emp_id } = filters;
  const employeeCollection = db.collection('employee');
  const capacityCollection = db.collection('capacity');
 
  // Build query
  let query = {};
 
  // Filter by department
  if (dept) {
    query.dept_no = dept;
  }
 
  // Filter by manager (for "mine" filter)
  if (filter === 'mine' && user_emp_id) {
    query.manager_id = parseInt(user_emp_id);
  }
 
  if (manager_id) {
    query.manager_id = parseInt(manager_id);
  }
 
  // Get all employees matching query
  const employees = await employeeCollection.find(query).toArray();
 
  // If status filter is applied, check capacity collection
  if (status && status !== 'all') {
    // Get current month in YYYYMM format
    const now = new Date();
    const currentDate = now.getFullYear() * 100 + (now.getMonth() + 1);
 
    // Get capacity records for current month
    const capacityRecords = await capacityCollection.find({
      date: currentDate,
      current_status: status === 'active' ? 'Active' : 'Inactive'
    }).toArray();
 
    // Get emp_ids that match the status
    const matchingEmpIds = capacityRecords.map(c => c.emp_id);
 
    // Filter employees by matching emp_ids
    return employees.filter(emp => matchingEmpIds.includes(emp.emp_id));
  }
 
  return employees;
}
 
// =============================================================================
// GET SINGLE EMPLOYEE
// =============================================================================
 
/**
 * Get a single employee by emp_id with department and manager names
 * @param {Object} db - MongoDB database instance
 * @param {Number} empId - Employee ID
 * @returns {Object|null} Employee object with dept_name and manager_name, or null if not found
 */
async function getEmployeeById(db, empId) {
  const employeeCollection = db.collection('employee');
  const departmentCollection = db.collection('department');
 
  const employee = await employeeCollection.findOne({ emp_id: parseInt(empId) });
 
  if (!employee) {
    return null;
  }
 
  // Get department name
  const department = await departmentCollection.findOne({ dept_no: employee.dept_no });
 
  // Get manager name if exists
  let managerName = null;
  if (employee.manager_id) {
    const manager = await employeeCollection.findOne({ emp_id: employee.manager_id });
    managerName = manager ? manager.emp_name : null;
  }
 
  return {
    ...employee,
    dept_name: department ? department.dept_name : null,
    manager_name: managerName
  };
}
 
// =============================================================================
// CREATE EMPLOYEE
// =============================================================================
 
/**
 * Create a new employee
 * @param {Object} db - MongoDB database instance
 * @param {Object} employeeData - { emp_name, emp_title, dept_no, manager_id }
 * @returns {Object} { success: boolean, employee?: Object, error?: string }
 */
async function createEmployee(db, employeeData) {
  const { emp_name, emp_title, dept_no, manager_id } = employeeData;
 
  // Validation: Check required fields
  if (!emp_name || !emp_title || !dept_no) {
    return {
      success: false,
      error: 'Please complete all required fields: emp_name, emp_title, dept_no'
    };
  }
 
  const employeeCollection = db.collection('employee');
  const capacityCollection = db.collection('capacity');
 
  // Generate new emp_id (get max and add 1)
  const lastEmployee = await employeeCollection
    .find({})
    .sort({ emp_id: -1 })
    .limit(1)
    .toArray();
 
  const newEmpId = lastEmployee.length > 0 ? lastEmployee[0].emp_id + 1 : 1000;
 
  // Create new employee document
  const newEmployee = {
    emp_id: newEmpId,
    emp_name: emp_name,
    emp_title: emp_title,
    dept_no: dept_no,
    manager_id: manager_id ? parseInt(manager_id) : null
  };
 
  // Insert employee
  await employeeCollection.insertOne(newEmployee);
 
  // Create capacity records for the next 16 months
  const capacityRecords = [];
  const now = new Date();
 
  for (let i = 0; i < 16; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const dateNum = date.getFullYear() * 100 + (date.getMonth() + 1);
 
    capacityRecords.push({
      emp_id: newEmpId,
      date: dateNum,
      amount: 1,
      current_status: 'Active',
      comments: ''
    });
  }
 
  await capacityCollection.insertMany(capacityRecords);
 
  return {
    success: true,
    employee: newEmployee
  };
}
 
// =============================================================================
// UPDATE EMPLOYEE
// =============================================================================
 
/**
 * Update an existing employee
 * @param {Object} db - MongoDB database instance
 * @param {Number} empId - Employee ID to update
 * @param {Object} employeeData - { emp_name, emp_title, dept_no, manager_id }
 * @returns {Object} { success: boolean, employee?: Object, error?: string }
 */
async function updateEmployee(db, empId, employeeData) {
  const { emp_name, emp_title, dept_no, manager_id } = employeeData;
 
  // Validation: Check required fields
  if (!emp_name || !emp_title || !dept_no) {
    return {
      success: false,
      error: 'Please complete all required fields: emp_name, emp_title, dept_no'
    };
  }
 
  const employeeCollection = db.collection('employee');
 
  // Check if employee exists
  const existingEmployee = await employeeCollection.findOne({ emp_id: parseInt(empId) });
  if (!existingEmployee) {
    return {
      success: false,
      error: 'Employee not found'
    };
  }
 
  const updateData = {
    emp_name: emp_name,
    emp_title: emp_title,
    dept_no: dept_no,
    manager_id: manager_id ? parseInt(manager_id) : null
  };
 
  await employeeCollection.updateOne(
    { emp_id: parseInt(empId) },
    { $set: updateData }
  );
 
  return {
    success: true,
    employee: { emp_id: parseInt(empId), ...updateData }
  };
}
 
// =============================================================================
// UPDATE EMPLOYEE STATUS (Active/Inactive)
// =============================================================================
 
/**
 * Toggle employee active/inactive status
 * @param {Object} db - MongoDB database instance
 * @param {Number} empId - Employee ID
 * @param {String} status - 'Active' or 'Inactive'
 * @param {String} comments - Optional comments
 * @returns {Object} { success: boolean, error?: string }
 */
async function updateEmployeeStatus(db, empId, status, comments = '') {
  // Validate status
  if (!status || !['Active', 'Inactive'].includes(status)) {
    return {
      success: false,
      error: 'Status must be either "Active" or "Inactive"'
    };
  }
 
  const employeeCollection = db.collection('employee');
  const capacityCollection = db.collection('capacity');
 
  // Check if employee exists
  const employee = await employeeCollection.findOne({ emp_id: parseInt(empId) });
  if (!employee) {
    return {
      success: false,
      error: 'Employee not found'
    };
  }
 
  // Get current month in YYYYMM format
  const now = new Date();
  const currentDate = now.getFullYear() * 100 + (now.getMonth() + 1);
 
  // Update all capacity records from current month onwards
  await capacityCollection.updateMany(
    {
      emp_id: parseInt(empId),
      date: { $gte: currentDate }
    },
    {
      $set: {
        current_status: status,
        amount: status === 'Inactive' ? 0 : 1,
        comments: comments || ''
      }
    }
  );
 
  return {
    success: true,
    emp_id: parseInt(empId),
    new_status: status
  };
}
 
// =============================================================================
// GET EMPLOYEE CAPACITY
// =============================================================================
 
/**
 * Get employee's capacity/availability by month
 * @param {Object} db - MongoDB database instance
 * @param {Number} empId - Employee ID
 * @returns {Array|null} Array of capacity records or null if not found
 */
async function getEmployeeCapacity(db, empId) {
  const capacityCollection = db.collection('capacity');
 
  const capacityRecords = await capacityCollection
    .find({ emp_id: parseInt(empId) })
    .sort({ date: 1 })
    .toArray();
 
  if (capacityRecords.length === 0) {
    return null;
  }
 
  return capacityRecords;
}
 
// =============================================================================
// UPDATE EMPLOYEE CAPACITY
// =============================================================================
 
/**
 * Update employee's capacity for specific months
 * @param {Object} db - MongoDB database instance
 * @param {Number} empId - Employee ID
 * @param {Array} updates - Array of { date, amount, comments } objects
 * @returns {Object} { success: boolean, error?: string }
 */
async function updateEmployeeCapacity(db, empId, updates) {
  if (!updates || !Array.isArray(updates)) {
    return {
      success: false,
      error: 'Updates must be an array of { date, amount, comments } objects'
    };
  }
 
  const capacityCollection = db.collection('capacity');
 
  for (const update of updates) {
    if (!update.date) continue;
 
    await capacityCollection.updateOne(
      { emp_id: parseInt(empId), date: update.date },
      {
        $set: {
          amount: update.amount !== undefined ? update.amount : 1,
          comments: update.comments || ''
        }
      }
    );
  }
 
  return {
    success: true,
    emp_id: parseInt(empId)
  };
}
 
// =============================================================================
// GET ALL DEPARTMENTS
// =============================================================================
 
/**
 * Get all departments (for dropdown lists)
 * @param {Object} db - MongoDB database instance
 * @returns {Array} Array of department objects
 */
async function getAllDepartments(db) {
  const departments = await db.collection('department').find({}).toArray();
  return departments;
}
 
// =============================================================================
// GET ALL MANAGERS
// =============================================================================
 
/**
 * Get all employees who are managers (for "Reports To" dropdown)
 * @param {Object} db - MongoDB database instance
 * @returns {Array} Array of manager objects
 */
async function getAllManagers(db) {
  const employeeCollection = db.collection('employee');
 
  const managers = await employeeCollection.find({
    $or: [
      { emp_title: { $regex: /manager|supervisor|lead|director/i } }
    ]
  }).toArray();
 
  return managers;
}
 
// =============================================================================
// EXPORTS
// =============================================================================
 
module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  updateEmployeeStatus,
  getEmployeeCapacity,
  updateEmployeeCapacity,
  getAllDepartments,
  getAllManagers
};
 