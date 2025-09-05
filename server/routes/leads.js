const express = require('express');
const { body, query } = require('express-validator');
const Lead = require('../models/Lead');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { protect, authorize } = require('../middleware/auth');
const handleValidationErrors = require('../middleware/validation');
const { 
  getEasternNow, 
  getEasternTimeRanges, 
  formatEasternTime,
  getEasternStartOfDay,
  getEasternEndOfDay 
} = require('../utils/timeFilters');

const router = express.Router();

// Validation rules
const createLeadValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail()
    .withMessage('Please enter a valid email'),
  body('phone')
    .custom((value) => {
      if (!value || value.trim() === '') return true; // allow empty or missing
      if (typeof value !== 'string') throw new Error('Phone must be a string');
      // Accept either +1XXXXXXXXXX or just XXXXXXXXXX format
      const cleanPhone = value.trim().replace(/[\s\-\(\)]/g, '');
      if (!/^(\+1)?\d{10}$/.test(cleanPhone)) {
        throw new Error('Phone number must be 10 digits with optional +1 prefix (e.g., +12345678901 or 2345678901)');
      }
      return true;
    })
    .withMessage('Phone number must be 10 digits with optional +1 prefix (e.g., +12345678901 or 2345678901)'),
  body('alternatePhone')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (!value || value.trim() === '') return true; // allow empty or missing
      if (typeof value !== 'string') throw new Error('Alternate phone must be a string');
      // Accept either +1XXXXXXXXXX or just XXXXXXXXXX format
      const cleanPhone = value.trim().replace(/[\s\-\(\)]/g, '');
      if (!/^(\+1)?\d{10}$/.test(cleanPhone)) {
        throw new Error('Alternate phone number must be 10 digits with optional +1 prefix (e.g., +12345678901 or 2345678901)');
      }
      return true;
    })
    .withMessage('Alternate phone number must be 10 digits with optional +1 prefix (e.g., +12345678901 or 2345678901)'),
  body('debtCategory')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['secured', 'unsecured'])
    .withMessage('Debt category must be secured or unsecured'),
  body('debtTypes')
    .optional({ nullable: true, checkFalsy: true })
    .isArray()
    .withMessage('Debt types must be an array'),
  body('totalDebtAmount')
    .optional({ nullable: true, checkFalsy: true })
    .isNumeric()
    .withMessage('Total debt amount must be a number'),
  body('numberOfCreditors')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Number of creditors must be a non-negative integer'),
  body('monthlyDebtPayment')
    .optional({ nullable: true, checkFalsy: true })
    .isNumeric()
    .withMessage('Monthly debt payment must be a number'),
  body('creditScore')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 0, max: 900 })
    .withMessage('Credit score must be a whole number between 0 and 900'),
  body('creditScoreRange')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['300-549', '550-649', '650-699', '700-749', '750-850'])
    .withMessage('Credit score range must be 300-549, 550-649, 650-699, 700-749, or 750-850'),
  body('budget')
    .optional({ nullable: true, checkFalsy: true })
    .isNumeric()
    .withMessage('Budget must be a number'),
  body('source')
    .optional({ nullable: true, checkFalsy: true })
    .isIn([
      'Personal Debt', 'Secured Debt', 'Unsecured Debt', 'Revolving Debt', 
      'Installment Debt', 'Credit Card Debt', 'Mortgage Debt', 'Student Loans',
      'Auto Loans', 'Personal Loans', 'Medical Debt', 'Home Equity Loans (HELOCs)',
      'Payday Loans', 'Buy Now, Pay Later (BNPL) loans'
    ])
    .withMessage('Invalid debt type'),
  body('company')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 })
    .withMessage('Company name cannot exceed 100 characters'),
  body('jobTitle')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 })
    .withMessage('Job title cannot exceed 100 characters'),
  body('location')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 200 })
    .withMessage('Location cannot exceed 200 characters'),
  body('requirements')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 1000 })
    .withMessage('Requirements cannot exceed 1000 characters'),
  body('notes')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 2000 })
    .withMessage('Notes cannot exceed 2000 characters'),
  body('address')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 200 })
    .withMessage('Address cannot exceed 200 characters'),
  body('city')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),
  body('state')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 50 })
    .withMessage('State cannot exceed 50 characters'),
  body('zipcode')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 20 })
    .withMessage('Zipcode cannot exceed 20 characters')
];

const updateLeadValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail()
    .withMessage('Please enter a valid email'),
  body('phone')
    .optional()
    .custom((value) => {
      if (!value || value.trim() === '') return true; // allow empty or missing
      if (typeof value !== 'string') throw new Error('Phone must be a string');
      if (value.length < 5 || value.length > 20) throw new Error('Phone must be 5-20 characters');
      if (!/^[\d+\-()\s]+$/.test(value)) throw new Error('Phone can only contain numbers, spaces, +, -, (, )');
      return true;
    })
    .withMessage('Phone must be 5-20 characters and contain only numbers, spaces, +, -, (, )'),
  body('alternatePhone')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (!value || value.trim() === '') return true; // allow empty or missing
      if (typeof value !== 'string') throw new Error('Alternate phone must be a string');
      if (value.length < 5 || value.length > 20) throw new Error('Alternate phone must be 5-20 characters');
      if (!/^[\d+\-()\s]+$/.test(value)) throw new Error('Alternate phone can only contain numbers, spaces, +, -, (, )');
      return true;
    })
    .withMessage('Alternate phone must be 5-20 characters and contain only numbers, spaces, +, -, (, )'),
  body('debtCategory')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['secured', 'unsecured'])
    .withMessage('Debt category must be secured or unsecured'),
  body('debtTypes')
    .optional({ nullable: true, checkFalsy: true })
    .isArray()
    .withMessage('Debt types must be an array'),
  body('totalDebtAmount')
    .optional({ nullable: true, checkFalsy: true })
    .isNumeric()
    .withMessage('Total debt amount must be a number'),
  body('numberOfCreditors')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Number of creditors must be a non-negative integer'),
  body('monthlyDebtPayment')
    .optional({ nullable: true, checkFalsy: true })
    .isNumeric()
    .withMessage('Monthly debt payment must be a number'),
  body('creditScore')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 0, max: 900 })
    .withMessage('Credit score must be a whole number between 0 and 900'),
  body('creditScoreRange')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['300-549', '550-649', '650-699', '700-749', '750-850'])
    .withMessage('Credit score range must be 300-549, 550-649, 650-699, 700-749, or 750-850'),
  body('address')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 200 })
    .withMessage('Address cannot exceed 200 characters'),
  body('city')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),
  body('state')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 50 })
    .withMessage('State cannot exceed 50 characters'),
  body('zipcode')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 20 })
    .withMessage('Zipcode cannot exceed 20 characters'),
  body('notes')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 2000 })
    .withMessage('Notes cannot exceed 2000 characters'),
  body('company')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 })
    .withMessage('Company name cannot exceed 100 characters'),
  body('source')
    .optional({ nullable: true, checkFalsy: true })
    .isIn([
      'Personal Debt', 'Secured Debt', 'Unsecured Debt', 'Revolving Debt', 
      'Installment Debt', 'Credit Card Debt', 'Mortgage Debt', 'Student Loans',
      'Auto Loans', 'Personal Loans', 'Medical Debt', 'Home Equity Loans (HELOCs)',
      'Payday Loans', 'Buy Now, Pay Later (BNPL) loans'
    ])
    .withMessage('Invalid debt type'),
  body('status')
    .optional()
    .isIn(['new', 'interested', 'not-interested', 'successful', 'follow-up'])
    .withMessage('Invalid status'),
  body('leadStatus')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Warm Transfer – Pre-Qualified', 'Cold Transfer – Unqualified', 'From Internal Dept.', 'Test / Training Call'])
    .withMessage('Invalid lead status'),
  body('contactStatus')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Connected & Engaged', 'Connected – Requested Callback', 'No Answer', 'Wrong Number', 'Call Dropped'])
    .withMessage('Invalid contact status'),
  body('qualificationOutcome')
    .optional({ nullable: true, checkFalsy: true })
    .isIn([
      'Qualified – Meets Criteria', 'Pre-Qualified – Docs Needed', 'Disqualified – Debt Too Low',
      'Disqualified – Secured Debt Only', 'Disqualified – Non-Service State', 'Disqualified – No Hardship',
      'Disqualified – Active with Competitor'
    ])
    .withMessage('Invalid qualification outcome'),
  body('callDisposition')
    .optional({ nullable: true, checkFalsy: true })
    .isIn([
      'Appointment Scheduled', 'Immediate Enrollment', 'Info Provided – Awaiting Decision',
      'Nurture – Not Ready', 'Declined Services', 'DNC'
    ])
    .withMessage('Invalid call disposition'),
  body('engagementOutcome')
    .optional({ nullable: true, checkFalsy: true })
    .isIn([
      'Proceeding with Program', 'Callback Needed', 'Hung Up',
      'Info Only – Follow-up Needed', 'Not Interested', 'DNC'
    ])
    .withMessage('Invalid engagement outcome'),
  body('disqualification')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Debt Too Low', 'Secured Debt Only', 'No Debt', 'Wrong Number / Bad Contact'])
    .withMessage('Invalid disqualification'),
  body('followUpDate')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) {
        return true; // Allow empty values
      }
      // Check if it's a valid date
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid follow-up date');
      }
      return true;
    }),
  body('followUpTime')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) {
        return true; // Allow empty values
      }
      // Check if it matches HH:MM format
      if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
        throw new Error('Follow-up time must be in HH:MM format');
      }
      return true;
    }),
  body('followUpNotes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Follow-up notes cannot exceed 500 characters'),
  body('conversionValue')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) {
        return true; // Allow empty values
      }
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) {
        throw new Error('Conversion value must be a positive number');
      }
      return true;
    }),
  body('leadProgressStatus')
    .optional({ nullable: true, checkFalsy: true })
    .isIn([
      'Appointment Scheduled',
      'Immediate Enrollment', 
      'Info Provided – Awaiting Decision',
      'Nurture – Not Ready',
      'Qualified – Meets Criteria',
      'Pre-Qualified – Docs Needed',
      'Disqualified – Debt Too Low',
      'Disqualified – Secured Debt Only',
      'Disqualified – Non-Service State',
      'Disqualified – Active with Competitor',
      'Callback Needed',
      'Hung Up',
      'Not Interested',
      'DNC (Do Not Contact)'
    ])
    .withMessage('Invalid lead progress status'),
  body('agent2LastAction')
    .optional()
    .isString()
    .withMessage('Agent2 last action must be a string'),
  body('lastUpdatedBy')
    .optional()
    .isString()
    .withMessage('Last updated by must be a string'),
  body('lastUpdatedAt')
    .optional()
    .isISO8601()
    .withMessage('Last updated at must be a valid date')
];

// @desc    Get all leads with pagination and filtering
// @route   GET /api/leads
// @access  Private (Agent1, Agent2, Admin)
router.get('/', protect, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['new', 'interested', 'not-interested', 'successful', 'follow-up'])
    .withMessage('Invalid status filter'),
  query('category')
    .optional()
    .isIn(['hot', 'warm', 'cold'])
    .withMessage('Invalid category filter'),
  query('qualificationStatus')
    .optional()
    .isIn(['qualified', 'unqualified', 'pending'])
    .withMessage('Invalid qualification status filter'),
  query('duplicateStatus')
    .optional()
    .isIn(['all', 'duplicates', 'non-duplicates'])
    .withMessage('Invalid duplicate status filter'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query cannot exceed 100 characters'),
  query('organization')
    .optional()
    .isMongoId()
    .withMessage('Invalid organization ID')
], handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.qualificationStatus) {
      filter.qualificationStatus = req.query.qualificationStatus;
    }

    // Duplicate status filter
    if (req.query.duplicateStatus) {
      if (req.query.duplicateStatus === 'duplicates') {
        filter.isDuplicate = true;
      } else if (req.query.duplicateStatus === 'non-duplicates') {
        filter.isDuplicate = { $ne: true };
      }
      // 'all' shows both duplicates and non-duplicates (no filter added)
    }

    // Search functionality
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { company: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Organization filter for SuperAdmin and REDDINGTON GLOBAL CONSULTANCY Admin
    if (req.query.organization && ['superadmin'].includes(req.user.role)) {
      filter.organization = req.query.organization;
    } else if (req.query.organization && req.user.role === 'admin') {
      // Check if admin is from REDDINGTON GLOBAL CONSULTANCY
      const adminOrganization = await Organization.findById(req.user.organization);
      if (adminOrganization && adminOrganization.name === 'REDDINGTON GLOBAL CONSULTANCY') {
        filter.organization = req.query.organization;
      }
    }

    // Role-based filtering
    if (req.user.role === 'agent1') {
      filter.createdBy = req.user._id;
      filter.adminProcessed = { $ne: true }; // Hide admin-processed leads
      console.log('Agent1 filter applied:', filter);
    } else if (req.user.role === 'agent2') {
      // Agent2 can see:
      // 1. Leads assigned to them
      // 2. Duplicate leads (for review)
      filter.$or = [
        { 
          assignedTo: req.user._id,
          adminProcessed: { $ne: true }
        },
        { 
          isDuplicate: true,
          adminProcessed: { $ne: true }
        }
      ];
      console.log('Agent2 filter applied:', filter);
    } else if (req.user.role === 'admin') {
      // Get admin's organization
      const adminOrganization = await Organization.findById(req.user.organization);
      
      if (adminOrganization && adminOrganization.name === 'REDDINGTON GLOBAL CONSULTANCY') {
        // REDDINGTON GLOBAL CONSULTANCY Admin can see all leads from all organizations
        console.log('REDDINGTON GLOBAL CONSULTANCY Admin filter applied: Can see all leads');
        // No filter restriction - can see all leads
      } else {
        // Other organization admins can only see leads from their own organization
        filter.organization = req.user.organization;
        console.log('Regular Admin filter applied: organization-restricted to', req.user.organization);
      }
      console.log('Admin filter applied: organization-restricted');
    } else if (req.user.role === 'superadmin') {
      // SuperAdmin can see all leads including duplicates from all organizations
      // No additional filters needed beyond query parameters
      console.log('SuperAdmin filter applied: No restrictions');
    }

    console.log('Final filter:', filter);
    console.log('User role:', req.user.role, 'User ID:', req.user._id);

    // Get leads with pagination
    const leads = await Lead.find(filter)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .populate('organization', 'name description')
      .populate('duplicateOf', 'leadId name email phone')
      .populate('duplicateDetectedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Lead.countDocuments(filter);

    console.log('Found leads:', leads.length, 'Total count:', total);

    res.status(200).json({
      success: true,
      data: {
        leads,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leads',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @desc    Get available Agent2 users based on organization rules
// @route   GET /api/leads/available-agents
// @access  Private (Agent1 only)
router.get('/available-agents', protect, async (req, res) => {
  try {
    if (req.user.role !== 'agent1') {
      return res.status(403).json({
        success: false,
        message: 'Only Agent1 can view available agents'
      });
    }

    // Get current user's organization
    const currentUserWithOrg = await User.findById(req.user._id).populate('organization');
    const mainOrgName = 'REDDINGTON GLOBAL CONSULTANCY';
    let availableAgents;
    
    if (currentUserWithOrg.organization.name === mainOrgName) {
      // Main organization Agent1 can see Agent2 users in same organization
      availableAgents = await User.find({
        role: 'agent2',
        organization: req.user.organization,
        isActive: true
      }).select('name email');
    } else {
      // Other organizations' Agent1 can only see Agent2 users from main organization
      const mainOrg = await Organization.findOne({ name: mainOrgName });
      if (!mainOrg) {
        return res.status(404).json({
          success: false,
          message: `Main organization "${mainOrgName}" not found`
        });
      }
      
      availableAgents = await User.find({
        role: 'agent2',
        organization: mainOrg._id,
        isActive: true
      }).select('name email');
    }

    res.status(200).json({
      success: true,
      data: { agents: availableAgents }
    });

  } catch (error) {
    console.error('Get available agents error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available agents',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @desc    Get single lead
// @route   GET /api/leads/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const lead = await Lead.findByLeadId(req.params.id)
      .populate('createdBy', 'name email organization')
      .populate('updatedBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email');

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Role-based access
    if (req.user.role === 'agent1' && lead.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this lead'
      });
    }

    // Organization-based access for admin
    if (req.user.role === 'admin') {
      if (lead.createdBy.organization.toString() !== req.user.organization.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view leads from other organizations'
        });
      }
    }
    // SuperAdmin and Agent2 can view any lead (existing behavior)

    res.status(200).json({
      success: true,
      data: { lead }
    });

  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lead',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @desc    Create new lead
// @route   POST /api/leads
// @access  Private (Agent1 only)
router.post('/', protect, createLeadValidation, handleValidationErrors, async (req, res) => {
  try {
    console.log('Create lead request body:', req.body);
    console.log('Create lead request user:', req.user ? req.user.role : 'No user');
    console.log('Create lead request user ID:', req.user ? req.user._id : 'No user ID');
    
    // Check if user has permission (agent1 or admin)
    if (req.user && !['agent1', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to create leads`
      });
    }
    
    const leadData = {
      ...req.body,
      source: req.body.source && req.body.source.trim() !== '' ? req.body.source : 'Personal Debt',
      createdBy: req.user._id,
      organization: req.user.organization
    };

    console.log('Creating lead with data:', leadData);

    const lead = await Lead.create(leadData);
    
    console.log('Lead created successfully:', lead._id);
    console.log('Saved lead data:', JSON.stringify(lead, null, 2));
    
    // Set duplicate detection user if it's a duplicate
    if (lead.isDuplicate) {
      lead.duplicateDetectedBy = req.user._id;
      await lead.save();
    }
    
    // Populate the created lead
    await lead.populate('createdBy', 'name email');
    if (lead.duplicateOf) {
      await lead.populate('duplicateOf', 'leadId name email phone');
    }

    // Emit real-time update
    if (req.io) {
      const eventData = {
        lead: lead,
        createdBy: req.user.name,
        isDuplicate: lead.isDuplicate,
        duplicateInfo: lead.isDuplicate ? {
          duplicateOf: lead.duplicateOf,
          duplicateReason: lead.duplicateReason
        } : null
      };
      
      req.io.emit('leadCreated', eventData);
      // Also emit to specific rooms
      req.io.to('admin').emit('leadCreated', eventData);
      req.io.to('superadmin').emit('leadCreated', eventData);
      req.io.to('agent2').emit('leadCreated', eventData);
      
      // Special notification for duplicates
      if (lead.isDuplicate) {
        req.io.to('admin').emit('duplicateLeadDetected', eventData);
        req.io.to('superadmin').emit('duplicateLeadDetected', eventData);
        req.io.to('agent2').emit('duplicateLeadDetected', eventData);
      }
    }

    res.status(201).json({
      success: true,
      message: lead.isDuplicate 
        ? `Lead created successfully but marked as duplicate (${lead.duplicateReason} match found)`
        : 'Lead created successfully',
      data: { 
        lead,
        isDuplicate: lead.isDuplicate,
        duplicateInfo: lead.isDuplicate ? {
          duplicateOf: lead.duplicateOf,
          duplicateReason: lead.duplicateReason,
          duplicateDetectedAt: lead.duplicateDetectedAt
        } : null
      }
    });

  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating lead',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @desc    Update lead status
// @route   PUT /api/leads/:id
// @access  Private (Agent1 for own leads, Agent2, Admin)
router.put('/:id', protect, updateLeadValidation, handleValidationErrors, async (req, res) => {
  try {
    console.log('Update request body:', req.body);
    console.log('Update request user:', req.user ? req.user.role : 'No user');
    console.log('Update request user ID:', req.user ? req.user._id : 'No user ID');
    console.log('Lead ID to update:', req.params.id);
    
    // Use findById for MongoDB _id or findByLeadId for custom leadId
    let lead;
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      // It's a MongoDB ObjectId
      lead = await Lead.findById(req.params.id).populate('createdBy', 'organization');
    } else {
      // It's a custom leadId
      lead = await Lead.findByLeadId(req.params.id).populate('createdBy', 'organization');
    }

    if (!lead) {
      console.log('Lead not found with ID:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    console.log('Found lead:', lead.leadId || lead._id);
    console.log('Lead createdBy:', lead.createdBy);
    console.log('Current user role:', req.user.role);
    console.log('Current user ID:', req.user._id);

    // Check permissions based on user role
    if (req.user.role === 'agent1') {
      console.log('User is agent1, checking if they created this lead...');
      // Agent1 can only update their own leads
      if (lead.createdBy._id.toString() !== req.user._id.toString()) {
        console.log('Agent1 trying to update lead they did not create');
        return res.status(403).json({
          success: false,
          message: 'Agent1 can only update leads they created'
        });
      }
      console.log('Agent1 authorized to update their own lead');
    } else if (req.user.role === 'admin') {
      console.log('User is admin, checking organization access...');
      // Get admin's organization
      const adminOrganization = await Organization.findById(req.user.organization);
      
      if (adminOrganization && adminOrganization.name === 'REDDINGTON GLOBAL CONSULTANCY') {
        // REDDINGTON GLOBAL CONSULTANCY Admin can update leads from all organizations
        console.log('REDDINGTON GLOBAL CONSULTANCY Admin authorized to update any lead');
      } else {
        // Other organization admins can only VIEW leads from their organization (no update access)
        return res.status(403).json({
          success: false,
          message: 'Only REDDINGTON GLOBAL CONSULTANCY admins can update leads'
        });
      }
    } else if (['agent2', 'superadmin'].includes(req.user.role)) {
      console.log('User is agent2/superadmin, authorized to update leads');
    } else {
      console.log('User role not authorized:', req.user.role);
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to update leads`
      });
    }

    // Define which fields each role can update
    let allowedFields = [];
    
    if (req.user.role === 'agent1') {
      // Agent1 can update basic lead information but not status fields
      allowedFields = [
        'name', 'email', 'phone', 'alternatePhone', 'debtCategory', 'debtTypes',
        'totalDebtAmount', 'numberOfCreditors', 'monthlyDebtPayment', 'creditScore', 'creditScoreRange',
        'address', 'city', 'state', 'zipcode', 'notes', 'company', 'source'
      ];
    } else if (req.user.role === 'admin') {
      // Check if admin is from REDDINGTON GLOBAL CONSULTANCY
      const adminOrganization = await Organization.findById(req.user.organization);
      
      if (adminOrganization && adminOrganization.name === 'REDDINGTON GLOBAL CONSULTANCY') {
        // REDDINGTON GLOBAL CONSULTANCY Admin can update ALL fields
        allowedFields = [
          // Basic lead information
          'name', 'email', 'phone', 'alternatePhone', 'debtCategory', 'debtTypes',
          'totalDebtAmount', 'numberOfCreditors', 'monthlyDebtPayment', 'creditScore', 'creditScoreRange',
          'address', 'city', 'state', 'zipcode', 'notes', 'company', 'source', 'category', 'completionPercentage',
          // Status fields
          'status', 'leadStatus', 'contactStatus', 'qualificationOutcome', 
          'callDisposition', 'engagementOutcome', 'disqualification',
          'followUpDate', 'followUpTime', 'followUpNotes', 'conversionValue',
          'leadProgressStatus', 'agent2LastAction', 'lastUpdatedBy', 'lastUpdatedAt',
          'qualificationStatus', 'assignmentNotes'
        ];
      } else {
        // Other organization admins have limited update access
        allowedFields = [
          'status', 'leadStatus', 'contactStatus', 'qualificationOutcome', 
          'callDisposition', 'engagementOutcome', 'disqualification',
          'followUpDate', 'followUpTime', 'followUpNotes', 'conversionValue',
          'leadProgressStatus', 'agent2LastAction', 'lastUpdatedBy', 'lastUpdatedAt',
          'qualificationStatus'
        ];
      }
    } else if (['agent2', 'superadmin'].includes(req.user.role)) {
      // Agent2 and superadmin can update all fields
      allowedFields = [
        // Basic lead information
        'name', 'email', 'phone', 'alternatePhone', 'debtCategory', 'debtTypes',
        'totalDebtAmount', 'numberOfCreditors', 'monthlyDebtPayment', 'creditScore', 'creditScoreRange',
        'address', 'city', 'state', 'zipcode', 'notes', 'company', 'source', 'category', 'completionPercentage',
        // Status fields
        'status', 'leadStatus', 'contactStatus', 'qualificationOutcome', 
        'callDisposition', 'engagementOutcome', 'disqualification',
        'followUpDate', 'followUpTime', 'followUpNotes', 'conversionValue',
        'leadProgressStatus', 'agent2LastAction', 'lastUpdatedBy', 'lastUpdatedAt',
        'qualificationStatus', 'assignmentNotes'
      ];
    }

    // Update allowed fields
    console.log('Allowed fields for', req.user.role, ':', allowedFields);
    console.log('Fields in request body:', Object.keys(req.body));
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        console.log(`Updating ${field} from "${lead[field]}" to:`, req.body[field]);
        lead[field] = req.body[field];
      }
    });

    // Set update tracking fields
    lead.lastUpdatedBy = req.user.name || req.user.email;
    lead.lastUpdatedAt = getEasternNow();

    // Mark as admin processed if updated by admin or superadmin
    if (['admin', 'superadmin'].includes(req.user.role)) {
      lead.adminProcessed = true;
      lead.adminProcessedAt = getEasternNow();
    }

    lead.updatedBy = req.user._id;
    await lead.save();

    console.log('Lead saved successfully');

    // Populate the updated lead
    await lead.populate(['createdBy updatedBy', 'name email']);

    // Emit real-time update
    if (req.io) {
      req.io.emit('leadUpdated', {
        lead: lead,
        updatedBy: req.user.name
      });
      // Also emit to specific rooms
      req.io.to('admin').emit('leadUpdated', {
        lead: lead,
        updatedBy: req.user.name
      });
      req.io.to('agent2').emit('leadUpdated', {
        lead: lead,
        updatedBy: req.user.name
      });
    }

    res.status(200).json({
      success: true,
      message: 'Lead updated successfully',
      data: { lead }
    });

  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating lead',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @desc    Delete lead
// @route   DELETE /api/leads/:id
// @access  Private (Admin and SuperAdmin)
router.delete('/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const lead = await Lead.findByLeadId(req.params.id).populate('createdBy');

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Check if admin can access this lead (organization-based access control)
    if (req.user.role === 'admin') {
      if (lead.createdBy.organization.toString() !== req.user.organization.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete leads from your organization'
        });
      }
    }
    // SuperAdmin can delete any lead (no additional check needed)

    await Lead.findOneAndDelete({ leadId: req.params.id });

    // Emit real-time update
    req.io.emit('leadDeleted', {
      leadId: req.params.id,
      deletedBy: req.user.name
    });
    // Also emit to specific rooms
    req.io.to('admin').emit('leadDeleted', {
      leadId: req.params.id,
      deletedBy: req.user.name
    });
    req.io.to('agent2').emit('leadDeleted', {
      leadId: req.params.id,
      deletedBy: req.user.name
    });

    res.status(200).json({
      success: true,
      message: 'Lead deleted successfully'
    });

  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting lead',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @desc    Assign lead to Agent2
// @route   POST /api/leads/:id/assign
// @access  Private (Agent1 only)
router.post('/:id/assign', protect, [
  body('assignedTo')
    .isMongoId()
    .withMessage('Valid Agent ID is required'),
  body('assignmentNotes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Assignment notes cannot exceed 500 characters')
], handleValidationErrors, async (req, res) => {
  try {
    if (req.user.role !== 'agent1') {
      return res.status(403).json({
        success: false,
        message: 'Only Agent1 can assign leads'
      });
    }

    const { assignedTo, assignmentNotes } = req.body;

    // Find the lead
    const lead = await Lead.findByLeadId(req.params.id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Check if Agent1 owns this lead
    if (lead.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only assign leads you created'
      });
    }

    // Check if lead is already assigned
    if (lead.assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Lead is already assigned'
      });
    }

    // Verify the assigned agent exists and is Agent2
    const assignedAgent = await User.findById(assignedTo).populate('organization');
    if (!assignedAgent) {
      return res.status(404).json({
        success: false,
        message: 'Assigned agent not found'
      });
    }

    if (assignedAgent.role !== 'agent2') {
      return res.status(400).json({
        success: false,
        message: 'Can only assign to Agent2 users'
      });
    }

    // Get current user's organization
    const currentUserWithOrg = await User.findById(req.user._id).populate('organization');
    const mainOrgName = 'REDDINGTON GLOBAL CONSULTANCY';
    
    // Check assignment rules based on organization
    if (currentUserWithOrg.organization.name === mainOrgName) {
      // Main organization Agent1 can only assign to Agent2 in same organization
      if (assignedAgent.organization._id.toString() !== req.user.organization.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Can only assign to agents in the same organization'
        });
      }
    } else {
      // Other organizations' Agent1 can only assign to Agent2 of main organization
      if (assignedAgent.organization.name !== mainOrgName) {
        return res.status(400).json({
          success: false,
          message: `Agent1 from other organizations can only assign leads to Agent2 of ${mainOrgName}`
        });
      }
    }

    // Assign the lead
    lead.assignedTo = assignedTo;
    lead.assignedBy = req.user._id;
    lead.assignedAt = getEasternNow();
    lead.assignmentNotes = assignmentNotes || '';
    lead.updatedBy = req.user._id;

    await lead.save();

    // Populate the updated lead
    await lead.populate(['createdBy updatedBy assignedTo assignedBy', 'name email']);

    // Emit real-time update
    if (req.io) {
      req.io.emit('leadAssigned', {
        lead: lead,
        assignedBy: req.user.name,
        assignedTo: assignedAgent.name
      });
      // Emit to specific rooms
      req.io.to('admin').emit('leadAssigned', {
        lead: lead,
        assignedBy: req.user.name,
        assignedTo: assignedAgent.name
      });
      req.io.to(`user_${assignedTo}`).emit('leadAssigned', {
        lead: lead,
        assignedBy: req.user.name,
        assignedTo: assignedAgent.name
      });
    }

    res.status(200).json({
      success: true,
      message: 'Lead assigned successfully',
      data: { lead }
    });

  } catch (error) {
    console.error('Assign lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning lead',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @desc    Unassign lead (remove assignment)
// @route   POST /api/leads/:id/unassign
// @access  Private (Agent1 only - for their own leads)
router.post('/:id/unassign', protect, async (req, res) => {
  try {
    if (req.user.role !== 'agent1') {
      return res.status(403).json({
        success: false,
        message: 'Only Agent1 can unassign leads'
      });
    }

    const lead = await Lead.findByLeadId(req.params.id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Check if Agent1 owns this lead
    if (lead.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only unassign leads you created'
      });
    }

    if (!lead.assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Lead is not assigned'
      });
    }

    // Store the previous assignment info for notification
    const previousAssignedTo = lead.assignedTo;

    // Unassign the lead
    lead.assignedTo = null;
    lead.assignedBy = null;
    lead.assignedAt = null;
    lead.assignmentNotes = '';
    lead.updatedBy = req.user._id;

    await lead.save();

    // Populate the updated lead
    await lead.populate(['createdBy updatedBy', 'name email']);

    // Emit real-time update
    if (req.io) {
      req.io.emit('leadUnassigned', {
        lead: lead,
        unassignedBy: req.user.name
      });
      // Emit to specific rooms
      req.io.to('admin').emit('leadUnassigned', {
        lead: lead,
        unassignedBy: req.user.name
      });
      req.io.to(`user_${previousAssignedTo}`).emit('leadUnassigned', {
        lead: lead,
        unassignedBy: req.user.name
      });
    }

    res.status(200).json({
      success: true,
      message: 'Lead unassigned successfully',
      data: { lead }
    });

  } catch (error) {
    console.error('Unassign lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unassigning lead',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @desc    Get dashboard statistics
// @route   GET /api/leads/dashboard/stats
// @access  Private (All authenticated users)
router.get('/dashboard/stats', protect, async (req, res) => {
  try {
    const { role, _id: userId } = req.user;
    
    let filter = {};
    
    // Apply filters based on user role
    if (role === 'agent1') {
      filter = { assignedAgent: userId, status: { $in: ['new', 'contacted', 'qualified'] } };
    } else if (role === 'agent2') {
      filter = { assignedAgent: userId, status: { $in: ['follow-up', 'converted', 'closed'] } };
    }
    // Admin sees all data (no filter applied)

    // Get basic statistics
    let stats;
    if (role === 'superadmin') {
      // SuperAdmin sees all data from all organizations
      stats = await Lead.getStatistics();
      
      // Get active agents count for superadmin
      const User = require('../models/User');
      const activeAgents = await User.countDocuments({ 
        role: { $in: ['agent1', 'agent2'] },
        isActive: { $ne: false } // Count users who are not explicitly inactive
      });
      stats.activeAgents = activeAgents;
    } else if (role === 'admin') {
      // Admin sees only data from their organization
      const userOrganizationIds = await User.find({ 
        organization: req.user.organization 
      }).distinct('_id');
      
      const orgFilter = { createdBy: { $in: userOrganizationIds } };
      
      const [total, newLeads, qualified, followUp, converted, closed] = await Promise.all([
        Lead.countDocuments(orgFilter),
        Lead.countDocuments({ ...orgFilter, status: 'new' }),
        Lead.countDocuments({ ...orgFilter, status: 'qualified' }),
        Lead.countDocuments({ ...orgFilter, status: 'follow-up' }),
        Lead.countDocuments({ ...orgFilter, status: 'converted' }),
        Lead.countDocuments({ ...orgFilter, status: 'closed' })
      ]);

      // Get active agents count from admin's organization only
      const activeAgents = await User.countDocuments({ 
        organization: req.user.organization,
        role: { $in: ['agent1', 'agent2'] },
        isActive: { $ne: false }
      });

      stats = {
        totalLeads: total,
        newLeads,
        qualified,
        followUp,
        converted,
        closed,
        conversionRate: total > 0 ? ((converted / total) * 100).toFixed(2) : 0,
        activeAgents
      };
    } else {
      // Get filtered stats for agents
      const [total, newLeads, qualified, followUp, converted, closed] = await Promise.all([
        Lead.countDocuments(filter),
        Lead.countDocuments({ ...filter, status: 'new' }),
        Lead.countDocuments({ ...filter, status: 'qualified' }),
        Lead.countDocuments({ ...filter, status: 'follow-up' }),
        Lead.countDocuments({ ...filter, status: 'converted' }),
        Lead.countDocuments({ ...filter, status: 'closed' })
      ]);

      stats = {
        totalLeads: total,
        newLeads,
        qualified,
        followUp,
        converted,
        closed,
        conversionRate: total > 0 ? ((converted / total) * 100).toFixed(2) : 0
      };
    }

    // Get additional time-based statistics using Eastern Time
    const { today, thisWeek, thisMonth } = getEasternTimeRanges();

    const timeFilters = [
      { createdAt: { $gte: today }, ...filter },
      { createdAt: { $gte: thisWeek }, ...filter },
      { createdAt: { $gte: thisMonth }, ...filter }
    ];

    const [todayStats, weekStats, monthStats] = await Promise.all([
      Lead.countDocuments(timeFilters[0]),
      Lead.countDocuments(timeFilters[1]),
      Lead.countDocuments(timeFilters[2])
    ]);

    // Get follow-up leads for today
    const { todayEnd } = getEasternTimeRanges();
    
    const todayFollowUps = await Lead.countDocuments({
      followUpDate: {
        $gte: today,
        $lt: todayEnd
      },
      ...filter
    });

    const response = {
      ...stats,
      todayLeads: todayStats,
      weekLeads: weekStats,
      monthLeads: monthStats,
      todayFollowUps,
      userRole: role,
      lastUpdated: formatEasternTime(getEasternNow())
    };

    res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @desc    Get upcoming follow-ups
// @route   GET /api/leads/follow-ups
// @access  Private (Agent2, Admin)
router.get('/dashboard/follow-ups', protect, authorize('agent2', 'admin'), async (req, res) => {
  try {
    const { today } = getEasternTimeRanges();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const followUps = await Lead.find({
      status: 'follow-up',
      followUpDate: { $gte: today, $lte: nextWeek }
    })
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .sort({ followUpDate: 1, followUpTime: 1 });

    res.status(200).json({
      success: true,
      data: { followUps }
    });

  } catch (error) {
    console.error('Get follow-ups error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching follow-ups',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

module.exports = router;
