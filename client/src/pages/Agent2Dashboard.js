import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { 
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search
} from 'lucide-react';
import axios from '../utils/axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatEasternTimeForDisplay, getEasternNow, getEasternStartOfDay, getEasternEndOfDay } from '../utils/dateUtils';

// Unified Lead Progress Status options for Agent 2
const agent2LeadProgressOptions = [
  "Appointment Scheduled",
  "Immediate Enrollment",
  "Info Provided – Awaiting Decision",
  "Nurture – Not Ready",
  "Qualified – Meets Criteria",
  "Pre-Qualified – Docs Needed",
  "Disqualified – Debt Too Low",
  "Disqualified – Secured Debt Only",
  "Disqualified – Non-Service State",
  "Disqualified – Active with Competitor",
  "Callback Needed",
  "Hung Up",
  "Not Interested",
  "DNC (Do Not Contact)"
];

// Debt types by category mapping (same as Agent1)
const DEBT_TYPES_BY_CATEGORY = {
  secured: [
    'Mortgage Loans',
    'Auto Loans',
    'Secured Personal Loans',
    'Home Equity Loans',
    'Title Loans'
  ],
  unsecured: [
    'Credit Cards',
    'Instalment Loans (Unsecured)',
    'Medical Bills',
    'Utility Bills',
    'Payday Loans',
    'Student Loans (private loan)',
    'Store/Charge Cards',
    'Overdraft Balances',
    'Business Loans (unsecured)',
    'Collection Accounts'
  ]
};

// Credit score ranges
const CREDIT_SCORE_RANGES = [
  '300-549',
  '550-649', 
  '650-699',
  '700-749',
  '750-850'
];

const Agent2Dashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Form data for comprehensive lead editing
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    alternatePhone: '',
    debtCategory: 'unsecured',
    debtTypes: [],
    totalDebtAmount: '',
    numberOfCreditors: '',
    monthlyDebtPayment: '',
    creditScore: '',
    creditScoreRange: '',
    address: '',
    city: '',
    state: '',
    zipcode: '',
    notes: '',
    requirements: ''
  });

  // Form errors for validation
  const [formErrors, setFormErrors] = useState({
    phone: '',
    alternatePhone: '',
    email: ''
  });

  // Utility functions to mask sensitive data
  const maskEmail = (email) => {
    if (!email) return '—';
    const [username, domain] = email.split('@');
    if (username.length <= 2) return `${username}***@${domain}`;
    return `${username.substring(0, 2)}***@${domain}`;
  };

  const maskPhone = (phone) => {
    if (!phone) return '—';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length <= 4) return '***-****';
    return `***-***-${cleaned.slice(-4)}`;
  };

  const maskAmount = (amount) => {
    if (!amount) return '—';
    const amountStr = amount.toString();
    if (amountStr.length <= 3) return '$***';
    return `$${amountStr.substring(0, 1)}***`;
  };

  
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    search: '',
    duplicateStatus: ''
  });

  const [updateData, setUpdateData] = useState({
    leadProgressStatus: '',
    followUpDate: '',
    followUpTime: '',
    followUpNotes: '',
    conversionValue: '',
    qualificationStatus: ''
  });

  useEffect(() => {
    fetchLeads();
    
    // Listen for real-time updates
    const handleRefresh = () => fetchLeads();
    window.addEventListener('refreshLeads', handleRefresh);

    // Socket.IO event listeners for real-time updates
    if (socket) {
      const handleLeadUpdated = (data) => {
        console.log('Lead updated via socket in Agent2:', data);
        toast.success(`Lead updated successfully`, {
          duration: 2000,
          icon: '🔄'
        });
        fetchLeads(); // Refresh the leads list
      };

      const handleLeadCreated = (data) => {
        console.log('New lead created via socket in Agent2:', data);
        toast.success(`New lead available`, {
          duration: 2000,
          icon: '✅'
        });
        fetchLeads(); // Refresh the leads list
      };

      socket.on('leadUpdated', handleLeadUpdated);
      socket.on('leadCreated', handleLeadCreated);

      // Cleanup socket listeners
      return () => {
        window.removeEventListener('refreshLeads', handleRefresh);
        socket.off('leadUpdated', handleLeadUpdated);
        socket.off('leadCreated', handleLeadCreated);
      };
    }
    
    return () => {
      window.removeEventListener('refreshLeads', handleRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, socket]);

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '50');
      
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      if (filters.duplicateStatus) params.append('duplicateStatus', filters.duplicateStatus);
      if (filters.qualificationStatus) params.append('qualificationStatus', filters.qualificationStatus);

      const response = await axios.get(`/api/leads?${params.toString()}`);
      const leadsData = response.data?.data?.leads;
      setLeads(Array.isArray(leadsData) ? leadsData : []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to fetch leads');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLead = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      // Clean the update data to remove empty strings
      const cleanUpdateData = {};
      
      if (updateData.leadProgressStatus && updateData.leadProgressStatus !== '') {
        cleanUpdateData.leadProgressStatus = updateData.leadProgressStatus;
        // Add metadata for admin tracking
        cleanUpdateData.lastUpdatedBy = user?.name || 'Agent2';
        cleanUpdateData.lastUpdatedAt = getEasternNow().toISOString();
        cleanUpdateData.agent2LastAction = updateData.leadProgressStatus;
      }

      // Add qualification status - independent from leadProgressStatus
      if (updateData.qualificationStatus && updateData.qualificationStatus !== '') {
        cleanUpdateData.qualificationStatus = updateData.qualificationStatus;
        cleanUpdateData.lastUpdatedBy = user?.name || 'Agent2';
        cleanUpdateData.lastUpdatedAt = getEasternNow().toISOString();
      }
      
      // Only add optional fields if they have values
      if (updateData.followUpDate && updateData.followUpDate !== '') {
        cleanUpdateData.followUpDate = updateData.followUpDate;
      }
      if (updateData.followUpTime && updateData.followUpTime !== '') {
        cleanUpdateData.followUpTime = updateData.followUpTime;
      }
      if (updateData.followUpNotes && updateData.followUpNotes !== '') {
        cleanUpdateData.followUpNotes = updateData.followUpNotes;
      }
      if (updateData.conversionValue && updateData.conversionValue !== '') {
        cleanUpdateData.conversionValue = parseFloat(updateData.conversionValue);
      }
      
      console.log('Update form data:', updateData);
      console.log('Sending update request with cleaned data:', cleanUpdateData);
      console.log('Selected lead ID:', selectedLead.leadId);
      console.log('Selected lead _id:', selectedLead._id);
      
      // Check if we have any data to update
      if (Object.keys(cleanUpdateData).length === 0) {
        toast.error('Please select at least one field to update');
        return;
      }
      
      // Use MongoDB _id instead of leadId for consistency with backend
      const leadIdToUse = selectedLead._id || selectedLead.leadId;
      console.log('Using lead ID for API call:', leadIdToUse);
      
      const response = await axios.put(`/api/leads/${leadIdToUse}`, cleanUpdateData);
      console.log('Update response:', response.data);
      
      toast.success('Lead updated successfully!');
      
      // Refresh leads data first
      await fetchLeads();
      
      // Update the selected lead with new data to show immediately in view modal
      const updatedLead = { ...selectedLead, ...cleanUpdateData };
      setSelectedLead(updatedLead);
      
      // Close modal after a short delay to ensure data is refreshed
      setTimeout(() => {
        setShowUpdateModal(false);
        setUpdateData({
          leadProgressStatus: '',
          followUpDate: '',
          followUpTime: '',
          followUpNotes: '',
          conversionValue: '',
          qualificationStatus: ''
        });
      }, 500);
    } catch (error) {
      console.error('Error updating lead:', error);
      console.error('Error response:', error.response);
      toast.error(error.response?.data?.message || 'Failed to update lead');
    } finally {
      setUpdating(false);
    }
  };

  // Phone number validation function
  const validatePhone = (phone, fieldName) => {
    if (!phone || phone.trim() === '') {
      return ''; // Empty is valid
    }

    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length !== 11 || !cleaned.startsWith('1')) {
      return `${fieldName} must be in format +1 followed by 10 digits`;
    }

    return '';
  };

  // Email validation function
  const validateEmail = (email) => {
    if (!email || email.trim() === '') {
      return '';
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }

    return '';
  };

  // Open comprehensive edit modal
  const openEditModal = (lead) => {
    setSelectedLead(lead);
    
    // Populate form with existing lead data
    setEditFormData({
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      alternatePhone: lead.alternatePhone || '',
      debtCategory: lead.debtCategory || 'unsecured',
      debtTypes: Array.isArray(lead.debtTypes) ? lead.debtTypes : [],
      totalDebtAmount: lead.totalDebtAmount || '',
      numberOfCreditors: lead.numberOfCreditors || '',
      monthlyDebtPayment: lead.monthlyDebtPayment || '',
      creditScore: lead.creditScore || '',
      creditScoreRange: lead.creditScoreRange || '',
      address: lead.address || '',
      city: lead.city || '',
      state: lead.state || '',
      zipcode: lead.zipcode || '',
      notes: lead.notes || '',
      requirements: lead.requirements || ''
    });

    // Clear any existing errors
    setFormErrors({
      phone: '',
      alternatePhone: '',
      email: ''
    });

    setShowEditModal(true);
  };

  // Handle comprehensive lead update
  const handleComprehensiveEdit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    const errors = {};
    
    if (!editFormData.name.trim()) {
      toast.error('Lead name is required');
      return;
    }

    // Validate phone numbers
    if (editFormData.phone) {
      const phoneError = validatePhone(editFormData.phone, 'Phone');
      if (phoneError) {
        errors.phone = phoneError;
      }
    }

    if (editFormData.alternatePhone) {
      const altPhoneError = validatePhone(editFormData.alternatePhone, 'Alternate phone');
      if (altPhoneError) {
        errors.alternatePhone = altPhoneError;
      }
    }

    // Validate email
    if (editFormData.email) {
      const emailError = validateEmail(editFormData.email);
      if (emailError) {
        errors.email = emailError;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setUpdating(true);

    try {
      // Prepare clean data
      const cleanUpdateData = {
        name: editFormData.name.trim()
      };

      // Add optional fields if they have values
      if (editFormData.email && editFormData.email.trim()) {
        cleanUpdateData.email = editFormData.email.trim();
      }
      
      if (editFormData.phone && editFormData.phone.trim()) {
        // Format phone number
        const cleaned = editFormData.phone.replace(/\D/g, '');
        cleanUpdateData.phone = `+${cleaned}`;
      }
      
      if (editFormData.alternatePhone && editFormData.alternatePhone.trim()) {
        // Format alternate phone number
        const cleaned = editFormData.alternatePhone.replace(/\D/g, '');
        cleanUpdateData.alternatePhone = `+${cleaned}`;
      }

      // Add debt information
      cleanUpdateData.debtCategory = editFormData.debtCategory;
      cleanUpdateData.debtTypes = editFormData.debtTypes;

      if (editFormData.totalDebtAmount && !isNaN(editFormData.totalDebtAmount)) {
        cleanUpdateData.totalDebtAmount = parseFloat(editFormData.totalDebtAmount);
      }

      if (editFormData.numberOfCreditors && !isNaN(editFormData.numberOfCreditors)) {
        cleanUpdateData.numberOfCreditors = parseInt(editFormData.numberOfCreditors, 10);
      }

      if (editFormData.monthlyDebtPayment && !isNaN(editFormData.monthlyDebtPayment)) {
        cleanUpdateData.monthlyDebtPayment = parseFloat(editFormData.monthlyDebtPayment);
      }

      if (editFormData.creditScore && !isNaN(editFormData.creditScore)) {
        cleanUpdateData.creditScore = parseInt(editFormData.creditScore, 10);
      }

      if (editFormData.creditScoreRange) {
        cleanUpdateData.creditScoreRange = editFormData.creditScoreRange;
      }

      // Add address information
      if (editFormData.address && editFormData.address.trim()) {
        cleanUpdateData.address = editFormData.address.trim();
      }
      if (editFormData.city && editFormData.city.trim()) {
        cleanUpdateData.city = editFormData.city.trim();
      }
      if (editFormData.state && editFormData.state.trim()) {
        cleanUpdateData.state = editFormData.state.trim();
      }
      if (editFormData.zipcode && editFormData.zipcode.trim()) {
        cleanUpdateData.zipcode = editFormData.zipcode.trim();
      }

      // Add notes
      if (editFormData.notes && editFormData.notes.trim()) {
        cleanUpdateData.notes = editFormData.notes.trim();
      }
      if (editFormData.requirements && editFormData.requirements.trim()) {
        cleanUpdateData.requirements = editFormData.requirements.trim();
      }

      // Add tracking info
      cleanUpdateData.lastUpdatedBy = user?.name || 'Agent2';
      cleanUpdateData.lastUpdatedAt = getEasternNow().toISOString();

      console.log('Sending comprehensive update:', cleanUpdateData);

      const response = await axios.put(`/api/leads/${selectedLead.leadId}`, cleanUpdateData);
      console.log('Edit response:', response.data);

      toast.success('Lead details updated successfully!');
      
      // Refresh leads data
      await fetchLeads();
      
      // Close modal
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error(error.response?.data?.message || 'Failed to update lead details');
    } finally {
      setUpdating(false);
    }
  };

  const openUpdateModal = (lead) => {
    setSelectedLead(lead);
    setUpdateData({
      leadProgressStatus: lead.leadProgressStatus || lead.agent2LastAction || '',
      followUpDate: lead.followUpDate ? new Date(lead.followUpDate).toISOString().split('T')[0] : '',
      followUpTime: lead.followUpTime || '',
      followUpNotes: lead.followUpNotes || '',
      conversionValue: lead.conversionValue || '',
      qualificationStatus: lead.qualificationStatus || ''
    });
    setShowUpdateModal(true);
  };

  const openViewModal = (lead) => {
    setSelectedLead(lead);
    setShowViewModal(true);
    // Log the lead data to debug
    console.log('Opening view modal for lead:', lead);
    console.log('Lead Progress Status:', lead.leadProgressStatus);
    console.log('Agent2 Last Action:', lead.agent2LastAction);
  };

  const getCategoryBadge = (category, completionPercentage) => {
    const badges = {
      hot: 'bg-red-100 text-red-800 border-red-200',
      warm: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      cold: 'bg-blue-100 text-blue-800 border-blue-200'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badges[category]}`}>
        {category.charAt(0).toUpperCase() + category.slice(1)} ({completionPercentage}%)
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const badges = {
      new: 'bg-gray-100 text-gray-800',
      interested: 'bg-green-100 text-green-800',
      'not-interested': 'bg-red-100 text-red-800',
      successful: 'bg-emerald-100 text-emerald-800',
      'follow-up': 'bg-blue-100 text-blue-800'
    };

    const icons = {
      new: AlertCircle,
      interested: CheckCircle,
      'not-interested': XCircle,
      successful: CheckCircle,
      'follow-up': Clock
    };

    const Icon = icons[status];

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status]}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    );
  };

  const getLeadStats = () => {
    // Agent2 sees only today's assigned leads - daily reset (Eastern Time)
    const todayStart = getEasternStartOfDay();
    const todayEnd = getEasternEndOfDay();
    
    const todaysLeads = leads.filter(lead => {
      const leadDate = new Date(lead.assignedAt || lead.createdAt);
      return leadDate >= todayStart && leadDate <= todayEnd;
    });
    
    const total = todaysLeads.length;
    const newLeads = todaysLeads.filter(lead => lead.status === 'new').length;
    const interested = todaysLeads.filter(lead => lead.status === 'interested').length;
    const successful = todaysLeads.filter(lead => lead.status === 'successful').length;
    const followUp = todaysLeads.filter(lead => lead.status === 'follow-up').length;

    return { total, newLeads, interested, successful, followUp, todaysLeads };
  };

  const stats = getLeadStats();

  if (loading) {
    return <LoadingSpinner message="Loading leads..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
          <p className="text-gray-600">Follow up on leads and update their status</p>
        </div>
      </div>

      {/* Today's Assigned Leads Summary for Agent2 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Today's Assigned Leads</h3>
          <p className="text-sm text-gray-600">Agent2 views only today's assigned leads - Daily data reset for agents</p>
          <div className="mt-4 text-2xl font-bold text-green-600">
            {stats.todaysLeads?.length || 0} leads assigned today
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-gray-100">
              <AlertCircle className="h-5 w-5 text-gray-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">New</p>
              <p className="text-xl font-bold text-gray-900">{stats.newLeads}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Interested</p>
              <p className="text-xl font-bold text-gray-900">{stats.interested}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-emerald-100">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Successful</p>
              <p className="text-xl font-bold text-gray-900">{stats.successful}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Follow Up</p>
              <p className="text-xl font-bold text-gray-900">{stats.followUp}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        {/* Duplicate Status Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setFilters({...filters, duplicateStatus: ''})}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filters.duplicateStatus === '' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All Leads
          </button>
          <button
            onClick={() => setFilters({...filters, duplicateStatus: 'duplicates'})}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filters.duplicateStatus === 'duplicates' 
                ? 'bg-red-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            🔄 Duplicate Leads
          </button>
          <button
            onClick={() => setFilters({...filters, duplicateStatus: 'unique'})}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filters.duplicateStatus === 'unique' 
                ? 'bg-green-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            ✅ Unique Leads
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search leads..."
                className="pl-10 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="">All Categories</option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Qualification Status</label>
            <select
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              value={filters.qualificationStatus}
              onChange={(e) => setFilters({ ...filters, qualificationStatus: e.target.value })}
            >
              <option value="">All Qualification</option>
              <option value="qualified">Qualified</option>
              <option value="unqualified">Disqualified</option>
              <option value="pending">Not Interested</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ status: '', category: '', search: '', duplicateStatus: '', qualificationStatus: '' })}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors duration-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">All Leads ({leads.length})</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lead Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Debt Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Debt Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duplicate Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qualification Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.todaysLeads?.map((lead) => (
                <tr key={lead.leadId || lead._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                      <div className="text-sm text-gray-500">
                        {lead.debtCategory ? `${lead.debtCategory.charAt(0).toUpperCase() + lead.debtCategory.slice(1)} Debt` : 'N/A'}
                      </div>
                      {lead.leadId && (
                        <div className="text-xs text-primary-600 font-mono">ID: {lead.leadId}</div>
                      )}
                      <div className="text-xs text-gray-400">
                        Created by: {lead.createdBy?.name}
                      </div>
                      {lead.lastUpdatedBy && (
                        <div className="text-xs text-green-600">
                          Updated by: {lead.lastUpdatedBy}
                        </div>
                      )}
                      {lead.assignmentNotes && (
                        <div className="text-xs text-gray-500 mt-1">
                          Note: {lead.assignmentNotes}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{maskEmail(lead.email)}</div>
                    <div className="text-sm text-gray-500">{maskPhone(lead.phone)}</div>
                    {lead.alternatePhone && (
                      <div className="text-xs text-gray-400">Alt: {maskPhone(lead.alternatePhone)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getCategoryBadge(lead.category, lead.completionPercentage)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lead.totalDebtAmount ? maskAmount(lead.totalDebtAmount) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {Array.isArray(lead.debtTypes) && lead.debtTypes.length > 0 
                      ? (
                        <div className="space-y-1">
                          {lead.debtTypes.map((debtType, index) => (
                            <div key={index} className="text-sm text-gray-900">
                              {debtType}
                            </div>
                          ))}
                        </div>
                      )
                      : (lead.source || 'N/A')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {lead.isDuplicate ? (
                      <div>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          🔄 Duplicate
                        </span>
                        {lead.duplicateReason && (
                          <div className="text-xs text-gray-500 mt-1">
                            Phone Match
                          </div>
                        )}
                        {lead.duplicateOf && (
                          <div className="text-xs text-blue-600 mt-1">
                            Original: {lead.duplicateOf.leadId || lead.duplicateOf}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        ✅ Unique
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      lead.qualificationStatus === 'qualified' ? 'bg-green-100 text-green-800' :
                      lead.qualificationStatus === 'unqualified' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {lead.qualificationStatus === 'qualified' ? '✅ Qualified' :
                       lead.qualificationStatus === 'unqualified' ? '❌ Disqualified' :
                       '⏳ Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openViewModal(lead)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => openEditModal(lead)}
                      className="text-green-600 hover:text-green-900 mr-3"
                    >
                      Edit Details
                    </button>
                    <button
                      onClick={() => openUpdateModal(lead)}
                      className="text-primary-600 hover:text-primary-900 mr-3"
                    >
                      Update Status
                    </button>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No leads found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Lead Details Modal */}
      {showViewModal && selectedLead && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div 
                className="absolute inset-0 bg-gray-500 opacity-75"
                onClick={() => setShowViewModal(false)}
              ></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Lead Details: {selectedLead.name}</h3>
                    <p className="text-sm text-gray-500">Complete lead information</p>
                  </div>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Personal Information</h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Name:</span>
                        <span className="ml-2 text-sm text-gray-900">{selectedLead.name || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Email:</span>
                        <span className="ml-2 text-sm text-gray-900">{selectedLead.email || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Phone:</span>
                        <span className="ml-2 text-sm text-gray-900">{selectedLead.phone || 'N/A'}</span>
                      </div>
                      {selectedLead.alternatePhone && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">Alternate Phone:</span>
                          <span className="ml-2 text-sm text-gray-900">{selectedLead.alternatePhone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Address Information</h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Address:</span>
                        <span className="ml-2 text-sm text-gray-900">{selectedLead.address || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">City:</span>
                        <span className="ml-2 text-sm text-gray-900">{selectedLead.city || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">State:</span>
                        <span className="ml-2 text-sm text-gray-900">{selectedLead.state || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Zipcode:</span>
                        <span className="ml-2 text-sm text-gray-900">{selectedLead.zipcode || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Location:</span>
                        <span className="ml-2 text-sm text-gray-900">{selectedLead.location || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Debt Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Debt Information</h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Debt Category:</span>
                        <span className="ml-2 text-sm text-gray-900 capitalize">
                          {selectedLead.debtCategory || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Debt Types:</span>
                        <div className="ml-2 text-sm text-gray-900">
                          {Array.isArray(selectedLead.debtTypes) && selectedLead.debtTypes.length > 0 
                            ? (
                              <div className="space-y-1">
                                {selectedLead.debtTypes.map((debtType, index) => (
                                  <div key={index}>
                                    {debtType}
                                  </div>
                                ))}
                              </div>
                            )
                            : selectedLead.source || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Total Debt Amount:</span>
                        <span className="ml-2 text-sm text-gray-900">
                          {selectedLead.totalDebtAmount ? `$${selectedLead.totalDebtAmount.toLocaleString()}` : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Number of Creditors:</span>
                        <span className="ml-2 text-sm text-gray-900">{selectedLead.numberOfCreditors || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Monthly Debt Payment:</span>
                        <span className="ml-2 text-sm text-gray-900">
                          {selectedLead.monthlyDebtPayment ? `$${selectedLead.monthlyDebtPayment.toLocaleString()}` : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Credit Score Range:</span>
                        <span className="ml-2 text-sm text-gray-900">{selectedLead.creditScoreRange || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Category:</span>
                        <span className="ml-2">{getCategoryBadge(selectedLead.category, selectedLead.completionPercentage)}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Status:</span>
                        <span className="ml-2">{getStatusBadge(selectedLead.status)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Additional Information</h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Created By:</span>
                        <span className="ml-2 text-sm text-gray-900">{selectedLead.createdBy?.name || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Created At:</span>
                        <span className="ml-2 text-sm text-gray-900">
                          {selectedLead.createdAt ? formatEasternTimeForDisplay(selectedLead.createdAt, { includeTime: false }) : 'N/A'}
                        </span>
                      </div>
                      {selectedLead.lastUpdatedBy && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">Last Updated By:</span>
                          <span className="ml-2 text-sm text-gray-900">{selectedLead.lastUpdatedBy}</span>
                        </div>
                      )}
                      {selectedLead.lastUpdatedAt && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">Last Updated:</span>
                          <span className="ml-2 text-sm text-gray-900">
                            {formatEasternTimeForDisplay(selectedLead.lastUpdatedAt)}
                          </span>
                        </div>
                      )}
                      {selectedLead.agent2LastAction && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">Agent 2 Last Action:</span>
                          <span className="ml-2 text-sm font-semibold text-blue-700">
                            {selectedLead.agent2LastAction}
                          </span>
                        </div>
                      )}
                      {selectedLead.followUpDate && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">Follow-up Date:</span>
                          <span className="ml-2 text-sm text-gray-900">
                            {formatEasternTimeForDisplay(selectedLead.followUpDate, { includeTime: false })}
                            {selectedLead.followUpTime && ` at ${selectedLead.followUpTime}`}
                          </span>
                        </div>
                      )}
                      {selectedLead.conversionValue && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">Conversion Value:</span>
                          <span className="ml-2 text-sm text-gray-900">
                            ${selectedLead.conversionValue.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lead Progress Status - Prominent Display for Agent 2 */}
                {selectedLead.leadProgressStatus && (
                  <div className="mt-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Current Lead Progress Status</h4>
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <CheckCircle className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-blue-800">
                            Status: <span className="font-bold">{selectedLead.leadProgressStatus}</span>
                          </p>
                          {selectedLead.lastUpdatedAt && (
                            <p className="text-xs text-blue-600 mt-1">
                              Updated: {formatEasternTimeForDisplay(selectedLead.lastUpdatedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Agent2 Status Fields */}
                {(selectedLead.leadProgressStatus || selectedLead.leadStatus || selectedLead.contactStatus || selectedLead.qualificationOutcome || 
                  selectedLead.callDisposition || selectedLead.engagementOutcome || selectedLead.disqualification) && (
                  <div className="mt-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Agent Status Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedLead.leadProgressStatus && (
                        <div className="bg-blue-50 p-3 rounded-lg col-span-2">
                          <span className="text-sm font-medium text-gray-600">Lead Progress Status:</span>
                          <span className="ml-2 text-sm text-gray-900 font-semibold">
                            {selectedLead.leadProgressStatus}
                          </span>
                        </div>
                      )}
                      {selectedLead.leadStatus && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <span className="text-sm font-medium text-gray-600">Lead Status:</span>
                          <span className="ml-2 text-sm text-gray-900 capitalize">
                            {selectedLead.leadStatus.replace('-', ' ')}
                          </span>
                        </div>
                      )}
                      {selectedLead.contactStatus && (
                        <div className="bg-green-50 p-3 rounded-lg">
                          <span className="text-sm font-medium text-gray-600">Contact Status:</span>
                          <span className="ml-2 text-sm text-gray-900 capitalize">
                            {selectedLead.contactStatus.replace('-', ' ')}
                          </span>
                        </div>
                      )}
                      {selectedLead.qualificationOutcome && (
                        <div className="bg-yellow-50 p-3 rounded-lg">
                          <span className="text-sm font-medium text-gray-600">Qualification:</span>
                          <span className="ml-2 text-sm text-gray-900 capitalize">
                            {selectedLead.qualificationOutcome.replace('-', ' ')}
                          </span>
                        </div>
                      )}
                      {selectedLead.callDisposition && (
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <span className="text-sm font-medium text-gray-600">Call Disposition:</span>
                          <span className="ml-2 text-sm text-gray-900 capitalize">
                            {selectedLead.callDisposition.replace('-', ' ')}
                          </span>
                        </div>
                      )}
                      {selectedLead.engagementOutcome && (
                        <div className="bg-indigo-50 p-3 rounded-lg">
                          <span className="text-sm font-medium text-gray-600">Engagement:</span>
                          <span className="ml-2 text-sm text-gray-900 capitalize">
                            {selectedLead.engagementOutcome.replace('-', ' ')}
                          </span>
                        </div>
                      )}
                      {selectedLead.disqualification && (
                        <div className="bg-red-50 p-3 rounded-lg">
                          <span className="text-sm font-medium text-gray-600">Disqualification:</span>
                          <span className="ml-2 text-sm text-gray-900 capitalize">
                            {selectedLead.disqualification.replace('-', ' ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes Section */}
                {(selectedLead.requirements || selectedLead.followUpNotes) && (
                  <div className="mt-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Notes</h4>
                    {selectedLead.requirements && (
                      <div className="bg-gray-50 p-4 rounded-lg mb-3">
                        <span className="text-sm font-medium text-gray-600 block mb-1">Initial Notes:</span>
                        <p className="text-sm text-gray-900">{selectedLead.requirements}</p>
                      </div>
                    )}
                    {selectedLead.followUpNotes && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <span className="text-sm font-medium text-gray-600 block mb-1">Follow-up Notes:</span>
                        <p className="text-sm text-gray-900">{selectedLead.followUpNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-6 py-3 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    openEditModal(selectedLead);
                  }}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Edit Lead Details
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    openUpdateModal(selectedLead);
                  }}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Update Status
                </button>
                <button
                  onClick={async () => {
                    await fetchLeads();
                    // Find and update the selected lead with fresh data
                    const updatedLeads = await axios.get(`/api/leads`);
                    const freshLead = updatedLeads.data?.data?.leads?.find(l => (l.leadId || l._id) === (selectedLead.leadId || selectedLead._id));
                    if (freshLead) {
                      setSelectedLead(freshLead);
                      console.log('Refreshed lead data:', freshLead);
                    }
                  }}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Lead Modal */}
      {showUpdateModal && selectedLead && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div 
                className="absolute inset-0 bg-gray-500 opacity-75"
                onClick={() => setShowUpdateModal(false)}
              ></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleUpdateLead}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Update Lead: {selectedLead.name}</h3>
                    <p className="text-sm text-gray-500">{selectedLead.company}</p>
                  </div>

                  {/* Current Lead Status Information */}
                  {selectedLead.leadProgressStatus && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Current Status Information</h4>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">Progress Status:</span>{' '}
                          <span className="text-indigo-600">{selectedLead.leadProgressStatus}</span>
                        </div>
                        {selectedLead.qualificationStatus && (
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">Qualification:</span>{' '}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              selectedLead.qualificationStatus === 'qualified' ? 'bg-green-100 text-green-800' :
                              selectedLead.qualificationStatus === 'unqualified' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {selectedLead.qualificationStatus === 'qualified' ? 'Qualified' :
                               selectedLead.qualificationStatus === 'unqualified' ? 'Disqualified' :
                               'Pending'}
                            </span>
                          </div>
                        )}
                        {selectedLead.followUpDate && (
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">Follow-up Date:</span>{' '}
                            <span className="text-gray-600">{formatEasternTimeForDisplay(selectedLead.followUpDate, { includeTime: false })}</span>
                            {selectedLead.followUpTime && (
                              <span className="text-gray-600"> at {selectedLead.followUpTime}</span>
                            )}
                          </div>
                        )}
                        {selectedLead.followUpNotes && (
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">Last Notes:</span>{' '}
                            <span className="text-gray-600">{selectedLead.followUpNotes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Unified Lead Progress Status Dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Lead Progress Status *</label>
                      <select
                        name="leadProgressStatus"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        value={updateData.leadProgressStatus}
                        onChange={(e) => setUpdateData({ ...updateData, leadProgressStatus: e.target.value })}
                      >
                        <option value="">Select Lead Progress Status</option>
                        {agent2LeadProgressOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    {/* Qualification Status Dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Qualification Status</label>
                      <select
                        name="qualificationStatus"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        value={updateData.qualificationStatus}
                        onChange={(e) => setUpdateData({ ...updateData, qualificationStatus: e.target.value })}
                      >
                        <option value="">Select Qualification Status</option>
                        <option value="qualified">Qualified</option>
                        <option value="unqualified">Disqualified</option>
                        <option value="pending">Not Interested</option>
                      </select>
                    </div>

                    {/* Follow-up Date (show only if status requires follow-up) */}
                    {(updateData.leadProgressStatus === 'Callback Needed' || updateData.leadProgressStatus === 'Nurture – Not Ready') && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Follow-up Date</label>
                          <input
                            type="date"
                            name="followUpDate"
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            value={updateData.followUpDate}
                            onChange={(e) => setUpdateData({ ...updateData, followUpDate: e.target.value })}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Follow-up Time</label>
                          <input
                            type="time"
                            name="followUpTime"
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            value={updateData.followUpTime}
                            onChange={(e) => setUpdateData({ ...updateData, followUpTime: e.target.value })}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Follow-up Notes</label>
                          <textarea
                            name="followUpNotes"
                            rows="3"
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            value={updateData.followUpNotes}
                            onChange={(e) => setUpdateData({ ...updateData, followUpNotes: e.target.value })}
                            placeholder="Add notes for follow-up..."
                          ></textarea>
                        </div>
                      </>
                    )}

                    {/* Conversion Value (show only if status is successful) */}
                    {updateData.leadProgressStatus === 'Immediate Enrollment' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Conversion Value</label>
                        <input
                          type="number"
                          name="conversionValue"
                          min="0"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          value={updateData.conversionValue}
                          onChange={(e) => setUpdateData({ ...updateData, conversionValue: e.target.value })}
                          placeholder="Enter conversion value"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={updating}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {updating ? 'Updating...' : 'Update Lead'}
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setShowUpdateModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Lead Edit Modal */}
      {showEditModal && selectedLead && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div 
                className="absolute inset-0 bg-gray-500 opacity-75"
                onClick={() => setShowEditModal(false)}
              ></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <form onSubmit={handleComprehensiveEdit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900">Edit Lead Details: {selectedLead.name}</h3>
                    <p className="text-sm text-gray-500">Update all lead information as needed after contact</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Information Section */}
                    <div className="space-y-4">
                      <h4 className="text-md font-semibold text-gray-900 border-b border-gray-200 pb-2">
                        Personal Information
                      </h4>
                      
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Name *</label>
                        <input
                          type="text"
                          required
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          value={editFormData.name}
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                          placeholder="Full name"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                          type="email"
                          className={`mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                            formErrors.email ? 'border-red-500' : 'border-gray-300'
                          }`}
                          value={editFormData.email}
                          onChange={(e) => {
                            setEditFormData({ ...editFormData, email: e.target.value });
                            if (formErrors.email) {
                              setFormErrors({ ...formErrors, email: '' });
                            }
                          }}
                          placeholder="email@example.com"
                        />
                        {formErrors.email && (
                          <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                        )}
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <input
                          type="tel"
                          className={`mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                            formErrors.phone ? 'border-red-500' : 'border-gray-300'
                          }`}
                          value={editFormData.phone}
                          onChange={(e) => {
                            setEditFormData({ ...editFormData, phone: e.target.value });
                            if (formErrors.phone) {
                              setFormErrors({ ...formErrors, phone: '' });
                            }
                          }}
                          placeholder="+12345678901"
                        />
                        {formErrors.phone && (
                          <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>
                        )}
                      </div>

                      {/* Alternate Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Alternate Phone</label>
                        <input
                          type="tel"
                          className={`mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                            formErrors.alternatePhone ? 'border-red-500' : 'border-gray-300'
                          }`}
                          value={editFormData.alternatePhone}
                          onChange={(e) => {
                            setEditFormData({ ...editFormData, alternatePhone: e.target.value });
                            if (formErrors.alternatePhone) {
                              setFormErrors({ ...formErrors, alternatePhone: '' });
                            }
                          }}
                          placeholder="+12345678901"
                        />
                        {formErrors.alternatePhone && (
                          <p className="text-red-500 text-sm mt-1">{formErrors.alternatePhone}</p>
                        )}
                      </div>
                    </div>

                    {/* Address Information Section */}
                    <div className="space-y-4">
                      <h4 className="text-md font-semibold text-gray-900 border-b border-gray-200 pb-2">
                        Address Information
                      </h4>

                      {/* Address */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <input
                          type="text"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          value={editFormData.address}
                          onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                          placeholder="Street address"
                        />
                      </div>

                      {/* City */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">City</label>
                        <input
                          type="text"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          value={editFormData.city}
                          onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                          placeholder="City"
                        />
                      </div>

                      {/* State */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">State</label>
                        <input
                          type="text"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          value={editFormData.state}
                          onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                          placeholder="State"
                        />
                      </div>

                      {/* Zipcode */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Zipcode</label>
                        <input
                          type="text"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          value={editFormData.zipcode}
                          onChange={(e) => setEditFormData({ ...editFormData, zipcode: e.target.value })}
                          placeholder="12345"
                        />
                      </div>
                    </div>

                    {/* Debt Information Section */}
                    <div className="space-y-4">
                      <h4 className="text-md font-semibold text-gray-900 border-b border-gray-200 pb-2">
                        Debt Information
                      </h4>

                      {/* Debt Category */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Debt Category</label>
                        <select
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          value={editFormData.debtCategory}
                          onChange={(e) => {
                            setEditFormData({ ...editFormData, debtCategory: e.target.value, debtTypes: [] });
                          }}
                        >
                          <option value="unsecured">Unsecured</option>
                          <option value="secured">Secured</option>
                        </select>
                      </div>

                      {/* Debt Types */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Debt Types</label>
                        <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                          {DEBT_TYPES_BY_CATEGORY[editFormData.debtCategory].map((type) => (
                            <label key={type} className="flex items-center">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                                checked={editFormData.debtTypes.includes(type)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditFormData({
                                      ...editFormData,
                                      debtTypes: [...editFormData.debtTypes, type]
                                    });
                                  } else {
                                    setEditFormData({
                                      ...editFormData,
                                      debtTypes: editFormData.debtTypes.filter(t => t !== type)
                                    });
                                  }
                                }}
                              />
                              <span className="ml-2 text-sm text-gray-700">{type}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Total Debt Amount */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Total Debt Amount</label>
                        <input
                          type="number"
                          min="0"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          value={editFormData.totalDebtAmount}
                          onChange={(e) => setEditFormData({ ...editFormData, totalDebtAmount: e.target.value })}
                          placeholder="50000"
                        />
                      </div>

                      {/* Number of Creditors */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Number of Creditors</label>
                        <input
                          type="number"
                          min="0"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          value={editFormData.numberOfCreditors}
                          onChange={(e) => setEditFormData({ ...editFormData, numberOfCreditors: e.target.value })}
                          placeholder="5"
                        />
                      </div>
                    </div>

                    {/* Financial Information Section */}
                    <div className="space-y-4">
                      <h4 className="text-md font-semibold text-gray-900 border-b border-gray-200 pb-2">
                        Financial Information
                      </h4>

                      {/* Monthly Debt Payment */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Monthly Debt Payment</label>
                        <input
                          type="number"
                          min="0"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          value={editFormData.monthlyDebtPayment}
                          onChange={(e) => setEditFormData({ ...editFormData, monthlyDebtPayment: e.target.value })}
                          placeholder="1200"
                        />
                      </div>

                      {/* Credit Score */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Credit Score</label>
                        <input
                          type="number"
                          min="300"
                          max="850"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          value={editFormData.creditScore}
                          onChange={(e) => setEditFormData({ ...editFormData, creditScore: e.target.value })}
                          placeholder="650"
                        />
                      </div>

                      {/* Credit Score Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Credit Score Range</label>
                        <select
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          value={editFormData.creditScoreRange}
                          onChange={(e) => setEditFormData({ ...editFormData, creditScoreRange: e.target.value })}
                        >
                          <option value="">Select range</option>
                          {CREDIT_SCORE_RANGES.map(range => (
                            <option key={range} value={range}>{range}</option>
                          ))}
                        </select>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Notes</label>
                        <textarea
                          rows="3"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          value={editFormData.notes}
                          onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                          placeholder="Additional notes about the lead..."
                        />
                      </div>

                      {/* Requirements */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Requirements</label>
                        <textarea
                          rows="3"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          value={editFormData.requirements}
                          onChange={(e) => setEditFormData({ ...editFormData, requirements: e.target.value })}
                          placeholder="Specific requirements or preferences..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={updating}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {updating ? 'Updating...' : 'Update Lead Details'}
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agent2Dashboard;
