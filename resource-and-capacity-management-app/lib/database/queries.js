const { getDB } = require('./mongodb');

/**
 * Generic query utilities for database operations
 */

/**
 * Find all documents in a collection
 * @param {string} collectionName - Name of the collection
 * @param {Object} filter - Query filter
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of documents
 */
async function findAll(collectionName, filter = {}, options = {}) {
  const db = getDB();
  const collection = db.collection(collectionName);
  return await collection.find(filter, options).toArray();
}

/**
 * Find one document in a collection
 * @param {string} collectionName - Name of the collection
 * @param {Object} filter - Query filter
 * @returns {Promise<Object|null>} Document or null
 */
async function findOne(collectionName, filter) {
  const db = getDB();
  const collection = db.collection(collectionName);
  return await collection.findOne(filter);
}

/**
 * Insert one document into a collection
 * @param {string} collectionName - Name of the collection
 * @param {Object} document - Document to insert
 * @returns {Promise<Object>} Insert result
 */
async function insertOne(collectionName, document) {
  const db = getDB();
  const collection = db.collection(collectionName);
  return await collection.insertOne({
    ...document,
    createdAt: new Date(),
    updatedAt: new Date()
  });
}

/**
 * Update one document in a collection
 * @param {string} collectionName - Name of the collection
 * @param {Object} filter - Query filter
 * @param {Object} update - Update operations
 * @returns {Promise<Object>} Update result
 */
async function updateOne(collectionName, filter, update) {
  const db = getDB();
  const collection = db.collection(collectionName);
  return await collection.updateOne(filter, {
    ...update,
    $set: { ...update.$set, updatedAt: new Date() }
  });
}

/**
 * Delete one document from a collection
 * @param {string} collectionName - Name of the collection
 * @param {Object} filter - Query filter
 * @returns {Promise<Object>} Delete result
 */
async function deleteOne(collectionName, filter) {
  const db = getDB();
  const collection = db.collection(collectionName);
  return await collection.deleteOne(filter);
}

/**
 * Count documents in a collection
 * @param {string} collectionName - Name of the collection
 * @param {Object} filter - Query filter
 * @returns {Promise<number>} Count of documents
 */
async function count(collectionName, filter = {}) {
  const db = getDB();
  const collection = db.collection(collectionName);
  return await collection.countDocuments(filter);
}

module.exports = {
  findAll,
  findOne,
  insertOne,
  updateOne,
  deleteOne,
  count
};
