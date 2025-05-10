/**
 * Script Management API Endpoints
 * 
 * Provides endpoints for managing script organization, analysis, and deletion
 * through the System Health Agent's File Organization capability.
 */

const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { 
  scriptScannerService,
  organizationAnalyzerService
} = require('../../core/agent-bridge');

// Import deletion workflow
const {
  generatePreDeletionReport,
  executeScriptDeletion,
  updateApprovalStatus
} = require('../../../agents/system-health-agent/child-agents/file-organization-agent/micro-agents/organization-analyzer/deletion-workflow');

/**
 * @swagger
 * /api/v1/system-health/scripts:
 *   get:
 *     summary: Get script catalog
 *     description: Retrieve the catalog of all scripts in the system
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by script type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by script category
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by script location
 *       - in: query
 *         name: minDaysSinceUse
 *         schema:
 *           type: integer
 *         description: Minimum days since last use
 *     responses:
 *       200:
 *         description: Script catalog retrieved successfully
 */
router.get('/scripts', async (req, res) => {
  try {
    const { type, category, location, minDaysSinceUse } = req.query;
    
    // Build filter criteria
    const filterCriteria = {};
    if (type) filterCriteria.scriptType = type;
    if (category) filterCriteria.category = category;
    if (location) filterCriteria.location = location;
    if (minDaysSinceUse) filterCriteria.minDaysSinceUse = parseInt(minDaysSinceUse);
    
    // Get scripts from scanner service
    const scripts = await scriptScannerService.getScripts(filterCriteria);
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      count: scripts.length,
      scripts
    });
  } catch (error) {
    console.error('Error retrieving script catalog:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve script catalog',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/system-health/scripts/scan:
 *   post:
 *     summary: Trigger script scan
 *     description: Trigger a new scan of the system for scripts
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scanType:
 *                 type: string
 *                 enum: [quick, full, incremental]
 *               targetPath:
 *                 type: string
 *     responses:
 *       202:
 *         description: Scan initiated successfully
 */
router.post('/scripts/scan', [
  check('scanType').isIn(['quick', 'full', 'incremental']),
  check('targetPath').optional().isString()
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      status: 'error',
      errors: errors.array() 
    });
  }
  
  try {
    const { scanType, targetPath } = req.body;
    
    // Initiate scan
    const scanId = await scriptScannerService.startScan({ scanType, targetPath });
    
    res.status(202).json({
      status: 'success',
      message: `${scanType} scan initiated successfully`,
      scanId,
      estimatedCompletionTime: scanType === 'full' ? '3-5 minutes' : '30-60 seconds'
    });
  } catch (error) {
    console.error('Error initiating script scan:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to initiate script scan',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/system-health/organization/analysis:
 *   get:
 *     summary: Get organization analysis
 *     description: Retrieve the organization analysis for scripts
 *     responses:
 *       200:
 *         description: Organization analysis retrieved successfully
 */
router.get('/organization/analysis', async (req, res) => {
  try {
    // Get organization analysis
    const analysis = await organizationAnalyzerService.getAnalysis();
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      analysis
    });
  } catch (error) {
    console.error('Error retrieving organization analysis:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve organization analysis',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/system-health/organization/reports:
 *   get:
 *     summary: Get organization reports
 *     description: Retrieve organization reports
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by report type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum number of reports to return
 *     responses:
 *       200:
 *         description: Reports retrieved successfully
 */
router.get('/organization/reports', async (req, res) => {
  try {
    const { type, limit } = req.query;
    
    // Build filter criteria
    const filterCriteria = {};
    if (type) filterCriteria.type = type;
    if (limit) filterCriteria.limit = parseInt(limit);
    
    // Get reports
    const reports = await organizationAnalyzerService.getReports(filterCriteria);
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      count: reports.length,
      reports
    });
  } catch (error) {
    console.error('Error retrieving organization reports:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve organization reports',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/system-health/scripts/deletion/analyze:
 *   post:
 *     summary: Analyze script deletion
 *     description: Generate a pre-deletion verification report
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scriptPaths:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Pre-deletion report generated successfully
 */
router.post('/scripts/deletion/analyze', [
  check('scriptPaths').isArray()
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      status: 'error',
      errors: errors.array() 
    });
  }
  
  try {
    const { scriptPaths } = req.body;
    
    // Generate pre-deletion report
    const report = await generatePreDeletionReport(scriptPaths);
    
    res.json({
      status: 'success',
      message: 'Pre-deletion report generated successfully',
      report
    });
  } catch (error) {
    console.error('Error generating pre-deletion report:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate pre-deletion report',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/system-health/scripts/deletion/{reportId}/approve:
 *   post:
 *     summary: Approve script deletion
 *     description: Approve a script deletion based on a pre-deletion report
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the pre-deletion report
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               approvedBy:
 *                 type: string
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Deletion approved successfully
 */
router.post('/scripts/deletion/:reportId/approve', [
  check('approvedBy').isString(),
  check('comments').optional().isString()
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      status: 'error',
      errors: errors.array() 
    });
  }
  
  try {
    const { reportId } = req.params;
    const { approvedBy, comments } = req.body;
    
    // Update approval status
    const result = await updateApprovalStatus(reportId, 'approved', {
      approvedBy,
      comments
    });
    
    res.json({
      status: 'success',
      message: 'Deletion approved successfully',
      result
    });
  } catch (error) {
    console.error('Error approving deletion:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to approve deletion',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/system-health/scripts/deletion/{reportId}/reject:
 *   post:
 *     summary: Reject script deletion
 *     description: Reject a script deletion based on a pre-deletion report
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the pre-deletion report
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rejectedBy:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Deletion rejected successfully
 */
router.post('/scripts/deletion/:reportId/reject', [
  check('rejectedBy').isString(),
  check('reason').isString()
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      status: 'error',
      errors: errors.array() 
    });
  }
  
  try {
    const { reportId } = req.params;
    const { rejectedBy, reason } = req.body;
    
    // Update approval status
    const result = await updateApprovalStatus(reportId, 'rejected', {
      approvedBy: rejectedBy,
      comments: reason
    });
    
    res.json({
      status: 'success',
      message: 'Deletion rejected successfully',
      result
    });
  } catch (error) {
    console.error('Error rejecting deletion:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reject deletion',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/system-health/scripts/deletion/{reportId}/execute:
 *   post:
 *     summary: Execute script deletion
 *     description: Execute a previously approved script deletion
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the pre-deletion report
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               updateReferences:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Deletion executed successfully
 */
router.post('/scripts/deletion/:reportId/execute', [
  check('updateReferences').optional().isBoolean()
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      status: 'error',
      errors: errors.array() 
    });
  }
  
  try {
    const { reportId } = req.params;
    const { updateReferences = true } = req.body;
    
    // Execute deletion
    const result = await executeScriptDeletion(reportId, { updateReferences });
    
    res.json({
      status: 'success',
      message: 'Deletion executed successfully',
      result
    });
  } catch (error) {
    console.error('Error executing deletion:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to execute deletion',
      error: error.message
    });
  }
});

module.exports = router;