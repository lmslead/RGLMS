const mongoose = require('mongoose');
const { getEasternNow, getEasternStartOfDay, getEasternEndOfDay, formatEasternTime } = require('../utils/timeFilters');

const leadSchema = new mongoose.Schema({
  // Custom Lead ID
  leadId: {
    type: String,
    unique: true,
    sparse: true // Allow multiple documents without leadId during creation
  },
  
  // Basic Information
  name: {
    type: String,
    required: [true, 'Lead name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // allow missing/undefined
        const str = String(v).trim();
        if (str === '') return true; // treat empty as not provided
        // Accept either +1XXXXXXXXXX or just XXXXXXXXXX format
        return /^(\+1)?\d{10}$/.test(str.replace(/[\s\-\(\)]/g, ''));
      },
      message: 'Phone number must be 10 digits with optional +1 prefix (e.g., +12345678901 or 2345678901)'
    }
  },
  alternatePhone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // allow missing/undefined
        const str = String(v).trim();
        if (str === '') return true; // treat empty as not provided
        // Accept either +1XXXXXXXXXX or just XXXXXXXXXX format
        return /^(\+1)?\d{10}$/.test(str.replace(/[\s\-\(\)]/g, ''));
      },
      message: 'Alternate phone number must be 10 digits with optional +1 prefix (e.g., +12345678901 or 2345678901)'
    }
  },
  
  // Debt Information
  debtCategory: {
    type: String,
    enum: ['secured', 'unsecured'],
    default: 'unsecured'
  },
  debtTypes: [{
    type: String,
    enum: [
      // Secured Debt Types
      'Mortgage Loans', 'Auto Loans', 'Secured Personal Loans', 'Home Equity Loans', 'Title Loans',
      // Unsecured Debt Types
      'Credit Cards', 'Instalment Loans (Unsecured)', 'Medical Bills', 'Utility Bills', 'Payday Loans',
      'Student Loans (private loan)', 'Store/Charge Cards', 'Overdraft Balances', 'Business Loans (unsecured)', 'Collection Accounts'
    ]
  }],
  totalDebtAmount: {
    type: Number,
    min: [0, 'Total debt amount cannot be negative']
  },
  numberOfCreditors: {
    type: Number,
    min: [0, 'Number of creditors cannot be negative']
  },
  monthlyDebtPayment: {
    type: Number,
    min: [0, 'Monthly debt payment cannot be negative']
  },
  creditScore: {
    type: Number,
    min: [0, 'Credit score cannot be negative'],
    max: [900, 'Credit score cannot exceed 900'],
    validate: {
      validator: function(v) {
        return !v || (Number.isInteger(v) && v >= 0 && v <= 900);
      },
      message: 'Credit score must be a whole number between 0 and 900'
    }
  },
  creditScoreRange: {
    type: String,
    enum: ['300-549', '550-649', '650-699', '700-749', '750-850']
  },
  
  // Lead Details (Legacy)
  budget: {
    type: Number,
    min: [0, 'Budget cannot be negative']
  },
  source: {
    type: String,
    enum: [
      'Personal Debt', 'Secured Debt', 'Unsecured Debt', 'Revolving Debt', 
      'Installment Debt', 'Credit Card Debt', 'Mortgage Debt', 'Student Loans',
      'Auto Loans', 'Personal Loans', 'Medical Debt', 'Home Equity Loans (HELOCs)',
      'Payday Loans', 'Buy Now, Pay Later (BNPL) loans'
    ],
    default: 'Personal Debt'
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  jobTitle: {
    type: String,
    trim: true,
    maxlength: [100, 'Job title cannot exceed 100 characters']
  },
  location: {
    type: String,
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters']
  },
  requirements: {
    type: String,
    maxlength: [1000, 'Requirements cannot exceed 1000 characters']
  },
  notes: {
    type: String,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  },

  // Address Information
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters']
  },
  city: {
    type: String,
    trim: true,
    maxlength: [100, 'City cannot exceed 100 characters']
  },
  state: {
    type: String,
    trim: true,
    maxlength: [50, 'State cannot exceed 50 characters']
  },
  zipcode: {
    type: String,
    trim: true,
    maxlength: [20, 'Zipcode cannot exceed 20 characters']
  },

  // Lead Categorization (Auto-calculated)
  category: {
    type: String,
    enum: ['hot', 'warm', 'cold'],
    default: 'cold'
  },
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // Lead Status (Updated by Agent 2)
  status: {
    type: String,
    enum: ['new', 'interested', 'not-interested', 'successful', 'follow-up'],
    default: 'new'
  },
  
  // Agent 2 Status Fields
  leadStatus: {
    type: String,
    enum: ['Warm Transfer – Pre-Qualified', 'Cold Transfer – Unqualified', 'From Internal Dept.', 'Test / Training Call']
  },
  contactStatus: {
    type: String,
    enum: ['Connected & Engaged', 'Connected – Requested Callback', 'No Answer', 'Wrong Number', 'Call Dropped']
  },
  qualificationOutcome: {
    type: String,
    enum: ['Qualified – Meets Criteria', 'Pre-Qualified – Docs Needed', 'Disqualified – Debt Too Low', 'Disqualified – Secured Debt Only', 'Disqualified – Non-Service State', 'Disqualified – No Hardship', 'Disqualified – Active with Competitor']
  },
  callDisposition: {
    type: String,
    enum: ['Appointment Scheduled', 'Immediate Enrollment', 'Info Provided – Awaiting Decision', 'Nurture – Not Ready', 'Declined Services', 'DNC']
  },
  engagementOutcome: {
    type: String,
    enum: ['Proceeding with Program', 'Callback Needed', 'Hung Up', 'Info Only – Follow-up Needed', 'Not Interested', 'DNC']
  },
  disqualification: {
    type: String,
    enum: ['Debt Too Low', 'Secured Debt Only', 'No Debt', 'Wrong Number / Bad Contact']
  },
  
  // Agent 2 Unified Progress Status (New field)
  leadProgressStatus: {
    type: String,
    enum: [
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
    ]
  },
  
  // Lead Qualification Status (for admin filtering)
  qualificationStatus: {
    type: String,
    enum: ['qualified', 'unqualified', 'pending'],
    default: 'pending'
  },
  
  // Agent 2 Tracking Fields
  agent2LastAction: {
    type: String
  },
  lastUpdatedBy: {
    type: String
  },
  lastUpdatedAt: {
    type: Date
  },
  
  // Follow-up Information
  followUpDate: {
    type: Date
  },
  followUpTime: {
    type: String
  },
  followUpNotes: {
    type: String,
    maxlength: [500, 'Follow-up notes cannot exceed 500 characters']
  },

  // Tracking Information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Organization Association
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  
  // Assignment Information
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: {
    type: Date
  },
  assignmentNotes: {
    type: String,
    maxlength: [500, 'Assignment notes cannot exceed 500 characters']
  },
  
  // Priority (derived from category)
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low'
  },

  // Conversion tracking
  convertedAt: {
    type: Date
  },
  conversionValue: {
    type: Number,
    min: 0
  },
  
  // Admin processing flag
  adminProcessed: {
    type: Boolean,
    default: false
  },
  adminProcessedAt: {
    type: Date
  },
  
  // Duplicate detection fields
  isDuplicate: {
    type: Boolean,
    default: false
  },
  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  duplicateReason: {
    type: String,
    enum: ['email', 'phone', 'both'],
    required: function() {
      return this.isDuplicate;
    }
  },
  duplicateDetectedAt: {
    type: Date
  },
  duplicateDetectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better performance
leadSchema.index({ leadId: 1 }, { unique: true });
leadSchema.index({ createdBy: 1 });
leadSchema.index({ organization: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ assignedBy: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ category: 1 });
leadSchema.index({ qualificationStatus: 1 });
leadSchema.index({ leadProgressStatus: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ followUpDate: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ isDuplicate: 1 });
leadSchema.index({ duplicateOf: 1 });

// Function to generate unique lead ID using Eastern Time
const generateLeadId = async function() {
  const currentDate = getEasternNow();
  const year = currentDate.getFullYear().toString().slice(-2);
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  
  // Get count of leads created today in Eastern Time
  const startOfDay = getEasternStartOfDay(currentDate);
  const endOfDay = getEasternEndOfDay(currentDate);
  
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const todayLeadsCount = await this.constructor.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });
    
    const sequence = String(todayLeadsCount + 1 + attempts).padStart(4, '0');
    const leadId = `LEAD${year}${month}${sequence}`;
    
    // Check if this leadId already exists
    const existingLead = await this.constructor.findOne({ leadId });
    if (!existingLead) {
      return leadId;
    }
    
    attempts++;
  }
  
  // Fallback: use timestamp-based sequence
  const timestamp = Date.now().toString().slice(-4);
  return `LEAD${year}${month}${timestamp}`;
};

// Pre-save middleware to generate leadId and calculate completion percentage and category
leadSchema.pre('save', async function(next) {
  // Generate leadId for new documents
  if (this.isNew && !this.leadId) {
    try {
      this.leadId = await generateLeadId.call(this);
    } catch (error) {
      return next(error);
    }
  }

  const requiredFields = [
    'name', 'email', 'phone', 'totalDebtAmount', 'debtCategory', 
    'numberOfCreditors', 'monthlyDebtPayment', 'creditScoreRange'
  ];
  
  let filledFields = 0;
  requiredFields.forEach(field => {
    if (this[field] && this[field] !== '') {
      filledFields++;
    }
  });

  this.completionPercentage = Math.round((filledFields / requiredFields.length) * 100);

  // Categorize based on completion percentage
  if (this.completionPercentage >= 80) {
    this.category = 'hot';
    this.priority = 'high';
  } else if (this.completionPercentage >= 50) {
    this.category = 'warm';
    this.priority = 'medium';
  } else {
    this.category = 'cold';
    this.priority = 'low';
  }

  // Set conversion date if status changed to successful
  if (this.status === 'successful' && !this.convertedAt) {
    this.convertedAt = getEasternNow();
  }

  // Normalize phone numbers to include +1 prefix
  if (this.phone) {
    let phone = String(this.phone).trim().replace(/[\s\-\(\)]/g, '');
    if (phone && !phone.startsWith('+1') && phone.length === 10) {
      this.phone = '+1' + phone;
    }
  }
  
  if (this.alternatePhone) {
    let altPhone = String(this.alternatePhone).trim().replace(/[\s\-\(\)]/g, '');
    if (altPhone && !altPhone.startsWith('+1') && altPhone.length === 10) {
      this.alternatePhone = '+1' + altPhone;
    }
  }

  // Duplicate detection for new leads - Phone number only
  if (this.isNew && this.phone) {
    const duplicateQuery = { $and: [
      { _id: { $ne: this._id } }, // Exclude current document
      { phone: this.phone } // Only check phone number for duplicates
    ]};
    
    const existingLead = await this.constructor.findOne(duplicateQuery);
    
    if (existingLead) {
      this.isDuplicate = true;
      this.duplicateOf = existingLead._id;
      this.duplicateDetectedAt = getEasternNow();
      this.duplicateReason = 'phone'; // Always phone since we only check phone
    }
  }

  // Note: qualificationStatus and leadProgressStatus are now independent fields
  // They must be set manually and are not automatically linked to each other

  next();
});

// Static method to find lead by leadId
leadSchema.statics.findByLeadId = function(leadId) {
  return this.findOne({ leadId: leadId });
};

// Static method to get statistics
leadSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalLeads: { $sum: 1 },
        hotLeads: {
          $sum: { $cond: [{ $eq: ['$category', 'hot'] }, 1, 0] }
        },
        warmLeads: {
          $sum: { $cond: [{ $eq: ['$category', 'warm'] }, 1, 0] }
        },
        coldLeads: {
          $sum: { $cond: [{ $eq: ['$category', 'cold'] }, 1, 0] }
        },
        interestedLeads: {
          $sum: { $cond: [{ $eq: ['$status', 'interested'] }, 1, 0] }
        },
        successfulLeads: {
          $sum: { $cond: [{ $eq: ['$status', 'successful'] }, 1, 0] }
        },
        followUpLeads: {
          $sum: { $cond: [{ $eq: ['$status', 'follow-up'] }, 1, 0] }
        },
        qualifiedLeads: {
          $sum: { $cond: [{ $eq: ['$qualificationStatus', 'qualified'] }, 1, 0] }
        },
        unqualifiedLeads: {
          $sum: { $cond: [{ $eq: ['$qualificationStatus', 'unqualified'] }, 1, 0] }
        },
        pendingLeads: {
          $sum: { $cond: [{ $eq: ['$qualificationStatus', 'pending'] }, 1, 0] }
        }
      }
    }
  ]);

  const result = stats[0] || {
    totalLeads: 0,
    hotLeads: 0,
    warmLeads: 0,
    coldLeads: 0,
    interestedLeads: 0,
    successfulLeads: 0,
    followUpLeads: 0,
    qualifiedLeads: 0,
    unqualifiedLeads: 0,
    pendingLeads: 0
  };

  // Calculate conversion rate
  result.conversionRate = result.totalLeads > 0 
    ? ((result.successfulLeads / result.totalLeads) * 100).toFixed(2)
    : 0;

  // Calculate qualification rate
  result.qualificationRate = result.totalLeads > 0 
    ? ((result.qualifiedLeads / result.totalLeads) * 100).toFixed(2)
    : 0;

  return result;
};

// Instance method to get category color
leadSchema.methods.getCategoryColor = function() {
  const colors = {
    hot: '#ef4444', // red-500
    warm: '#eab308', // yellow-500
    cold: '#3b82f6'  // blue-500
  };
  return colors[this.category] || colors.cold;
};

module.exports = mongoose.model('Lead', leadSchema);
