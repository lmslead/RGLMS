import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Users, 
  TrendingUp, 
  Calendar
} from 'lucide-react';
import axios from '../utils/axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { getEasternNow, formatEasternTimeForDisplay, getEasternStartOfDay, getEasternEndOfDay } from '../utils/dateUtils';

const Agent1Dashboard = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningLead, setAssigningLead] = useState(null);
  const [availableAgents, setAvailableAgents] = useState([]);
  const [assignmentData, setAssignmentData] = useState({
    assignedTo: '',
    assignmentNotes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  
  // Error state for form validation
  const [formErrors, setFormErrors] = useState({
    phone: '',
    alternatePhone: ''
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

  // Add a map of debt types by category
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

  const [formData, setFormData] = useState({
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
    notes: ''
  });
  useEffect(() => {
    fetchLeads();
    
    // Listen for real-time updates
    const handleRefresh = () => fetchLeads();
    window.addEventListener('refreshLeads', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshLeads', handleRefresh);
    };
  }, []);

  const fetchLeads = async () => {
    try {
      // Add cache-busting parameter to force fresh data
      const timestamp = new Date().getTime();
      const response = await axios.get(`/api/leads?page=1&limit=10&_t=${timestamp}`);
      console.log('Fetch leads response:', response.data);
      const leadsData = response.data?.data?.leads;
      const validLeads = Array.isArray(leadsData) ? leadsData : [];
      console.log('Valid leads found:', validLeads.length, validLeads);
      setLeads(validLeads);
      
      // Calculate stats
      const total = validLeads.length;
      const hot = validLeads.filter(lead => lead.category === 'hot').length;
      const warm = validLeads.filter(lead => lead.category === 'warm').length;
      const cold = validLeads.filter(lead => lead.category === 'cold').length;
      
      console.log('Stats updated:', { totalLeads: total, hotLeads: hot, warmLeads: warm, coldLeads: cold });
    } catch (error) {
      console.error('Error fetching leads:', error);
      console.error('Error response:', error.response);
      toast.error('Failed to fetch leads');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Handle phone number input with automatic +1 prefix and validation
  const handlePhoneInputChange = (e) => {
    const { name, value } = e.target;
    // Remove all non-digits
    let cleanValue = value.replace(/\D/g, '');
    
    // Clear any existing errors for this field
    setFormErrors(prev => ({
      ...prev,
      [name]: ''
    }));
    
    // Validate phone number length
    if (cleanValue.length > 10) {
      cleanValue = cleanValue.slice(0, 10);
    }
    
    // Show error if phone number is incomplete (less than 10 digits) and field is not empty
    if (cleanValue.length > 0 && cleanValue.length < 10) {
      setFormErrors(prev => ({
        ...prev,
        [name]: 'Phone number must be exactly 10 digits'
      }));
    }
    
    // Store as +1 + 10 digits for backend, but display only the 10 digits
    const formattedValue = cleanValue.length > 0 ? `+1${cleanValue}` : '';
    
    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
  };

  // Display phone number without +1 prefix for user input
  const getDisplayPhone = (phoneValue) => {
    if (!phoneValue) return '';
    if (phoneValue.startsWith('+1')) {
      return phoneValue.slice(2); // Remove +1 prefix for display
    }
    return phoneValue.replace(/\D/g, ''); // Remove non-digits if any
  };

  // Validate phone number on blur
  const handlePhoneBlur = (e) => {
    const { name, value } = e.target;
    const cleanValue = value.replace(/\D/g, '');
    
    if (cleanValue.length > 0 && cleanValue.length < 10) {
      setFormErrors(prev => ({
        ...prev,
        [name]: 'Phone number must be exactly 10 digits'
      }));
    } else if (cleanValue.length === 10) {
      // Clear error if phone number is valid
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate all form fields before submission
  const validateForm = () => {
    const errors = { phone: '', alternatePhone: '' };
    let isValid = true;

    // Validate primary phone if provided
    if (formData.phone) {
      const phoneDigits = getDisplayPhone(formData.phone);
      if (phoneDigits.length !== 10) {
        errors.phone = 'Phone number must be exactly 10 digits';
        isValid = false;
      }
    }

    // Validate alternate phone if provided
    if (formData.alternatePhone) {
      const altPhoneDigits = getDisplayPhone(formData.alternatePhone);
      if (altPhoneDigits.length !== 10) {
        errors.alternatePhone = 'Phone number must be exactly 10 digits';
        isValid = false;
      }
    }

    setFormErrors(errors);
    return isValid;
  };

  // Auto-progression functionality - double space to move to next field
  const [lastSpaceTime, setLastSpaceTime] = useState(null);
  const [spaceCount, setSpaceCount] = useState(0);

  const handleKeyDown = (e) => {
    if (e.key === ' ') {
      const currentTime = Date.now();
      
      // If this is within 500ms of the last space press, increment count
      if (lastSpaceTime && (currentTime - lastSpaceTime) < 500) {
        setSpaceCount(prev => prev + 1);
        
        // If this is the second space in quick succession, move to next field
        if (spaceCount === 1) {
          e.preventDefault(); // Prevent the second space from being entered
          moveToNextField(e.target);
          setSpaceCount(0);
          setLastSpaceTime(null);
          return;
        }
      } else {
        setSpaceCount(1);
      }
      
      setLastSpaceTime(currentTime);
    } else {
      // Reset space tracking if any other key is pressed
      setSpaceCount(0);
      setLastSpaceTime(null);
    }
  };

  const moveToNextField = (currentField) => {
    // Get all form inputs, selects, and textareas
    const formElements = Array.from(currentField.closest('form').querySelectorAll(
      'input:not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]):not([readonly])'
    ));
    
    const currentIndex = formElements.indexOf(currentField);
    
    if (currentIndex >= 0 && currentIndex < formElements.length - 1) {
      const nextField = formElements[currentIndex + 1];
      nextField.focus();
      
      // If it's a select, open it
      if (nextField.tagName === 'SELECT') {
        nextField.click();
      }
    }
  };


  // New: category change (clears selected types)
  const handleDebtCategoryChange = (e) => {
    const next = e.target.value;
    setFormData((prev) => ({
      ...prev,
      debtCategory: next,
      debtTypes: []
    }));
  };

  // Toggle individual debt type selection (checkbox)
  const handleDebtTypeToggle = (type) => {
    setFormData((prev) => {
      const exists = prev.debtTypes.includes(type);
      return {
        ...prev,
        debtTypes: exists
          ? prev.debtTypes.filter(t => t !== type)
          : [...prev.debtTypes, type]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }
    
    setSubmitting(true);

    try {
      console.log('Form submission started');
      console.log('Form data:', formData);
      console.log('Auth token:', localStorage.getItem('token') ? 'Present' : 'Missing');
      console.log('User role:', user?.role);
      
      // Build complete form data
      const cleanFormData = {
        name: formData.name.trim(),
      };

      // Include category and selected types
      if (formData.debtCategory) {
        cleanFormData.debtCategory = formData.debtCategory;
      }
      if (Array.isArray(formData.debtTypes) && formData.debtTypes.length > 0) {
        cleanFormData.debtTypes = formData.debtTypes;
        
        // Map debt types to valid source values
        const debtTypeToSource = {
          'Credit Cards': 'Credit Card Debt',
          'Mortgage Loans': 'Mortgage Debt',
          'Auto Loans': 'Auto Loans',
          'Student Loans (private loan)': 'Student Loans',
          'Medical Bills': 'Medical Debt',
          'Personal Loans': 'Personal Loans',
          'Payday Loans': 'Payday Loans',
          'Secured Personal Loans': 'Secured Debt',
          'Home Equity Loans': 'Home Equity Loans (HELOCs)',
          'Title Loans': 'Secured Debt',
          'Instalment Loans (Unsecured)': 'Installment Debt',
          'Utility Bills': 'Personal Debt',
          'Store/Charge Cards': 'Credit Card Debt',
          'Overdraft Balances': 'Personal Debt',
          'Business Loans (unsecured)': 'Personal Debt',
          'Collection Accounts': 'Personal Debt'
        };
        
        const firstDebtType = formData.debtTypes[0];
        cleanFormData.source = debtTypeToSource[firstDebtType] || 'Personal Debt';
      } else {
        cleanFormData.source = {
          secured: 'Secured Debt',
          unsecured: 'Unsecured Debt'
        }[formData.debtCategory] || 'Personal Debt';
      }

      // Add contact information
      if (formData.email && formData.email.trim() !== '') {
        cleanFormData.email = formData.email.trim();
      }
      if (formData.phone && formData.phone.trim() !== '') {
        cleanFormData.phone = formData.phone.trim();
      }
      if (formData.alternatePhone && formData.alternatePhone.trim() !== '') {
        cleanFormData.alternatePhone = formData.alternatePhone.trim();
      }

      // Add debt information
      if (formData.totalDebtAmount && formData.totalDebtAmount !== '' && !isNaN(formData.totalDebtAmount)) {
        cleanFormData.totalDebtAmount = parseFloat(formData.totalDebtAmount);
      }
      if (formData.numberOfCreditors && formData.numberOfCreditors !== '' && !isNaN(formData.numberOfCreditors)) {
        cleanFormData.numberOfCreditors = parseInt(formData.numberOfCreditors, 10);
      }
      if (formData.monthlyDebtPayment && formData.monthlyDebtPayment !== '' && !isNaN(formData.monthlyDebtPayment)) {
        cleanFormData.monthlyDebtPayment = parseFloat(formData.monthlyDebtPayment);
      }
      if (formData.creditScore && formData.creditScore !== '' && !isNaN(formData.creditScore)) {
        cleanFormData.creditScore = parseInt(formData.creditScore, 10);
      }
      if (formData.creditScoreRange && formData.creditScoreRange.trim() !== '') {
        cleanFormData.creditScoreRange = formData.creditScoreRange.trim();
      }
      if (formData.notes && formData.notes.trim() !== '') {
        cleanFormData.notes = formData.notes.trim();
      }

      // Add address information
      if (formData.address && formData.address.trim() !== '') {
        cleanFormData.address = formData.address.trim();
      }
      if (formData.city && formData.city.trim() !== '') {
        cleanFormData.city = formData.city.trim();
      }
      if (formData.state && formData.state.trim() !== '') {
        cleanFormData.state = formData.state.trim();
      }
      if (formData.zipcode && formData.zipcode.trim() !== '') {
        cleanFormData.zipcode = formData.zipcode.trim();
      }

      // Add creator information
      cleanFormData.lastUpdatedBy = user?.name || 'Agent1';

      console.log('Agent1 sending create request with cleaned data:', cleanFormData);
      console.log('Axios defaults:', { baseURL: axios.defaults.baseURL, timeout: axios.defaults.timeout });
      console.log('Making request to:', '/api/leads');

      const response = await axios.post('/api/leads', cleanFormData);
      console.log('Lead creation response:', response);
      console.log('Lead creation response data:', response.data);
      
      // Check if lead is a duplicate
      if (response.data.isDuplicate) {
        const duplicateInfo = response.data.duplicateInfo;
        const reasonText = {
          'email': 'email address',
          'phone': 'phone number', 
          'both': 'email and phone number'
        }[duplicateInfo.duplicateReason] || 'contact information';
        
        toast.success(
          `Lead created but marked as duplicate due to matching ${reasonText}!`,
          { duration: 6000, icon: '⚠️' }
        );
      } else {
        toast.success('Lead added successfully!');
      }

      setFormData({
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
        notes: ''
      });
      
      // Clear form errors
      setFormErrors({
        phone: '',
        alternatePhone: ''
      });
      
      setShowForm(false);

      fetchLeads();
    } catch (error) {
      console.error('Error creating lead:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to create lead');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit lead functionality
  const handleEditLead = async (e) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }
    
    setSubmitting(true);

    try {
      console.log('Edit lead submission started');
      console.log('Edit form data:', formData);
      console.log('Editing lead ID:', editingLead.leadId);
      
      // Build complete form data for editing
      const cleanFormData = {
        name: formData.name.trim(),
      };

      // Include category and selected types
      if (formData.debtCategory) {
        cleanFormData.debtCategory = formData.debtCategory;
      }
      if (Array.isArray(formData.debtTypes) && formData.debtTypes.length > 0) {
        cleanFormData.debtTypes = formData.debtTypes;
        
        // Map debt types to valid source values
        const debtTypeToSource = {
          'Credit Cards': 'Credit Card Debt',
          'Mortgage Loans': 'Mortgage Debt',
          'Auto Loans': 'Auto Loans',
          'Student Loans (private loan)': 'Student Loans',
          'Medical Bills': 'Medical Debt',
          'Personal Loans': 'Personal Loans',
          'Payday Loans': 'Payday Loans',
          'Secured Personal Loans': 'Secured Debt',
          'Home Equity Loans': 'Home Equity Loans (HELOCs)',
          'Title Loans': 'Secured Debt',
          'Instalment Loans (Unsecured)': 'Installment Debt',
          'Utility Bills': 'Personal Debt',
          'Store/Charge Cards': 'Credit Card Debt',
          'Overdraft Balances': 'Personal Debt',
          'Business Loans (unsecured)': 'Personal Debt',
          'Collection Accounts': 'Personal Debt'
        };
        
        const firstDebtType = formData.debtTypes[0];
        cleanFormData.source = debtTypeToSource[firstDebtType] || 'Personal Debt';
      } else {
        cleanFormData.source = {
          secured: 'Secured Debt',
          unsecured: 'Unsecured Debt'
        }[formData.debtCategory] || 'Personal Debt';
      }

      // Add contact information
      if (formData.email && formData.email.trim() !== '') {
        cleanFormData.email = formData.email.trim();
      }
      if (formData.phone && formData.phone.trim() !== '') {
        cleanFormData.phone = formData.phone.trim();
      }
      if (formData.alternatePhone && formData.alternatePhone.trim() !== '') {
        cleanFormData.alternatePhone = formData.alternatePhone.trim();
      }

      // Add debt information
      if (formData.totalDebtAmount && formData.totalDebtAmount !== '' && !isNaN(formData.totalDebtAmount)) {
        cleanFormData.totalDebtAmount = parseFloat(formData.totalDebtAmount);
      }
      if (formData.numberOfCreditors && formData.numberOfCreditors !== '' && !isNaN(formData.numberOfCreditors)) {
        cleanFormData.numberOfCreditors = parseInt(formData.numberOfCreditors, 10);
      }
      if (formData.monthlyDebtPayment && formData.monthlyDebtPayment !== '' && !isNaN(formData.monthlyDebtPayment)) {
        cleanFormData.monthlyDebtPayment = parseFloat(formData.monthlyDebtPayment);
      }
      if (formData.creditScore && formData.creditScore !== '' && !isNaN(formData.creditScore)) {
        cleanFormData.creditScore = parseInt(formData.creditScore, 10);
      }
      if (formData.creditScoreRange && formData.creditScoreRange.trim() !== '') {
        cleanFormData.creditScoreRange = formData.creditScoreRange.trim();
      }
      if (formData.notes && formData.notes.trim() !== '') {
        cleanFormData.notes = formData.notes.trim();
      }

      // Add address information
      if (formData.address && formData.address.trim() !== '') {
        cleanFormData.address = formData.address.trim();
      }
      if (formData.city && formData.city.trim() !== '') {
        cleanFormData.city = formData.city.trim();
      }
      if (formData.state && formData.state.trim() !== '') {
        cleanFormData.state = formData.state.trim();
      }
      if (formData.zipcode && formData.zipcode.trim() !== '') {
        cleanFormData.zipcode = formData.zipcode.trim();
      }

      // Add updater information
      cleanFormData.lastUpdatedBy = user?.name || 'Agent1';

      console.log('Agent1 sending edit request with cleaned data:', cleanFormData);
      
      const response = await axios.put(`/api/leads/${editingLead.leadId}`, cleanFormData);
      console.log('Lead update response:', response);
      toast.success('Lead updated successfully!');

      // Reset form and close modal
      setFormData({
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
        notes: ''
      });
      
      // Clear form errors
      setFormErrors({
        phone: '',
        alternatePhone: ''
      });
      
      setShowEditModal(false);
      setEditingLead(null);

      fetchLeads();
    } catch (error) {
      console.error('Error updating lead:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to update lead');
    } finally {
      setSubmitting(false);
    }
  };

  // Open edit modal with lead data
  const openEditModal = (lead) => {
    setEditingLead(lead);
    setFormData({
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
      notes: lead.notes || ''
    });
    
    // Clear any existing form errors
    setFormErrors({
      phone: '',
      alternatePhone: ''
    });
    
    setShowEditModal(true);
  };

  // Assignment functions
  const fetchAvailableAgents = async () => {
    try {
      const response = await axios.get('/api/leads/available-agents');
      setAvailableAgents(response.data.data.agents);
    } catch (error) {
      console.error('Error fetching available agents:', error);
      toast.error('Failed to fetch available agents');
    }
  };

  const openAssignModal = async (lead) => {
    setAssigningLead(lead);
    setAssignmentData({
      assignedTo: '',
      assignmentNotes: ''
    });
    setShowAssignModal(true);
    await fetchAvailableAgents();
  };

  const handleAssignmentSubmit = async (e) => {
    e.preventDefault();
    if (!assigningLead || !assignmentData.assignedTo) {
      toast.error('Please select an agent to assign');
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(`/api/leads/${assigningLead.leadId}/assign`, assignmentData);
      
      toast.success('Lead assigned successfully!');
      setShowAssignModal(false);
      setAssigningLead(null);
      setAssignmentData({ assignedTo: '', assignmentNotes: '' });
      
      // Refresh leads to show updated assignment status
      await fetchLeads();
    } catch (error) {
      console.error('Error assigning lead:', error);
      toast.error(error.response?.data?.message || 'Failed to assign lead');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassignLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to unassign this lead?')) {
      return;
    }

    try {
      await axios.post(`/api/leads/${leadId}/unassign`);
      toast.success('Lead unassigned successfully!');
      await fetchLeads();
    } catch (error) {
      console.error('Error unassigning lead:', error);
      toast.error(error.response?.data?.message || 'Failed to unassign lead');
    }
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

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status]}`}>
        {status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    );
  };

  // Calculate stats for display - showing today's leads only for agents (Eastern Time)
  const todayStart = getEasternStartOfDay();
  const todayEnd = getEasternEndOfDay();
  
  const todaysLeads = leads.filter(lead => {
    const leadDate = new Date(lead.createdAt || lead.dateCreated);
    return leadDate >= todayStart && leadDate <= todayEnd;
  });
  
  const filteredStats = {
    totalLeads: todaysLeads.length,
    hotLeads: todaysLeads.filter(lead => lead.category === 'hot').length,
    warmLeads: todaysLeads.filter(lead => lead.category === 'warm').length,
    coldLeads: todaysLeads.filter(lead => lead.category === 'cold').length
  };

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}</h1>
          <p className="text-gray-600">Manage your leads and track your progress</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add New Lead
        </button>
      </div>

      {/* Today's Lead Summary for Agent1 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Today's Lead Activity</h3>
          <p className="text-sm text-gray-600">Showing leads created today only - Agents see daily data reset</p>
          <div className="mt-4 text-2xl font-bold text-primary-600">
            {todaysLeads.length} leads created today
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-primary-100">
              <Users className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Leads</p>
              <p className="text-2xl font-bold text-gray-900">{filteredStats.totalLeads}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100">
              <TrendingUp className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Hot Leads</p>
              <p className="text-2xl font-bold text-gray-900">{filteredStats.hotLeads}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Warm Leads</p>
              <p className="text-2xl font-bold text-gray-900">{filteredStats.warmLeads}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Cold Leads</p>
              <p className="text-2xl font-bold text-gray-900">{filteredStats.coldLeads}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Leads */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Leads</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lead Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Debt Types
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Financial Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duplicate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assignment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {todaysLeads.map((lead) => (
                <tr key={lead.leadId || lead._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                      <div className="text-sm text-gray-500">{lead.company}</div>
                      {lead.leadId && (
                        <div className="text-xs text-primary-600 font-mono">ID: {lead.leadId}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{maskEmail(lead.email)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{maskPhone(lead.phone)}</div>
                    {lead.alternatePhone && (
                      <div className="text-xs text-gray-500">Alt: {maskPhone(lead.alternatePhone)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
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
                        : (lead.source || (lead.debtCategory ? ({
                              secured: 'Secured Debt',
                              unsecured: 'Unsecured Debt'
                            }[lead.debtCategory]) : '—'))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {lead.totalDebtAmount && (
                        <div>Debt: {maskAmount(lead.totalDebtAmount)}</div>
                      )}
                      {lead.numberOfCreditors && (
                        <div className="text-xs text-gray-500">Creditors: {lead.numberOfCreditors}</div>
                      )}
                      {lead.monthlyDebtPayment && (
                        <div className="text-xs text-gray-500">Monthly: {maskAmount(lead.monthlyDebtPayment)}</div>
                      )}
                      {lead.creditScoreRange && (
                        <div className="text-xs text-gray-500">Credit: ***-***</div>
                      )}
                      {!lead.totalDebtAmount && !lead.numberOfCreditors && !lead.monthlyDebtPayment && !lead.creditScoreRange && '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getCategoryBadge(lead.category, lead.completionPercentage)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(lead.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {lead.isDuplicate ? (
                      <div className="text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Duplicate
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          Phone Match
                        </div>
                        {lead.duplicateOf && (
                          <div className="text-xs text-gray-400">
                            Original: {lead.duplicateOf.leadId}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Original
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatEasternTimeForDisplay(lead.createdAt, { includeTime: false })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {lead.assignedTo ? (
                      <div className="text-sm">
                        <div className="text-green-600 font-medium">
                          Assigned to: {lead.assignedTo.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Updated by: {lead.lastUpdatedBy || 'Unknown'}
                        </div>
                        {lead.assignmentNotes && (
                          <div className="text-xs text-gray-400 mt-1">
                            {lead.assignmentNotes}
                          </div>
                        )}
                        <button
                          onClick={() => handleUnassignLead(lead.leadId || lead._id)}
                          className="text-xs text-red-600 hover:text-red-800 mt-1"
                        >
                          Unassign
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openAssignModal(lead)}
                        className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                      >
                        Assign
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openEditModal(lead)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan="10" className="px-6 py-8 text-center text-gray-500">
                    No leads found. Create your first lead to get started!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Lead Modal - Modern Redesigned */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div 
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={() => setShowForm(false)}
              ></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
              <form onSubmit={handleSubmit}>
                {/* Header */}
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-white">Add New Lead</h3>
                      <p className="text-primary-100 text-sm">Complete lead information form</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="text-white hover:text-primary-200 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>



                {/* Form Content - Two Column Layout */}
                <div className="bg-white p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Left Column - Personal & Contact Information */}
                    <div className="space-y-5">
                      <div className="border-b border-gray-200 pb-2 mb-4">
                        <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                          <svg className="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Personal Information
                        </h4>
                      </div>

                      {/* Name */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                        <input
                          type="text"
                          name="name"
                          required
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                          value={formData.name}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                          placeholder="Enter full name"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                        <input
                          type="email"
                          name="email"
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                          value={formData.email}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                          placeholder="Enter email address"
                        />
                      </div>

                      {/* Phone Numbers */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Primary Phone</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 sm:text-sm">+1</span>
                            </div>
                            <input
                              type="tel"
                              name="phone"
                              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white ${
                                formErrors.phone 
                                  ? 'border-red-300 focus:ring-red-500' 
                                  : 'border-gray-200 focus:ring-primary-500'
                              }`}
                              value={getDisplayPhone(formData.phone)}
                              onChange={handlePhoneInputChange}
                              onBlur={handlePhoneBlur}
                              onKeyDown={handleKeyDown}
                              placeholder="Enter 10 digits (e.g. 2345678901)"
                              maxLength="10"
                            />
                          </div>
                          {formErrors.phone && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Alternate Phone</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 sm:text-sm">+1</span>
                            </div>
                            <input
                              type="tel"
                              name="alternatePhone"
                              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white ${
                                formErrors.alternatePhone 
                                  ? 'border-red-300 focus:ring-red-500' 
                                  : 'border-gray-200 focus:ring-primary-500'
                              }`}
                              value={getDisplayPhone(formData.alternatePhone)}
                              onChange={handlePhoneInputChange}
                              onBlur={handlePhoneBlur}
                              onKeyDown={handleKeyDown}
                              placeholder="Enter 10 digits (optional)"
                              maxLength="10"
                            />
                          </div>
                          {formErrors.alternatePhone && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.alternatePhone}</p>
                          )}
                        </div>
                      </div>                      {/* Address */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Street Address</label>
                        <input
                          type="text"
                          name="address"
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                          value={formData.address}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                          placeholder="Enter street address"
                        />
                      </div>

                      {/* City, State, Zipcode */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                          <input
                            type="text"
                            name="city"
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                            value={formData.city}
                            onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                            placeholder="City"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
                          <input
                            type="text"
                            name="state"
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                            value={formData.state}
                            onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                            placeholder="State"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">ZIP Code</label>
                          <input
                            type="text"
                            name="zipcode"
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                            value={formData.zipcode}
                            onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                            placeholder="ZIP"
                          />
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Notes</label>
                        <textarea
                          name="notes"
                          rows="3"
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white resize-none"
                          value={formData.notes}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                          placeholder="Any additional information..."
                        ></textarea>
                      </div>
                    </div>

                    {/* Right Column - Financial & Debt Information */}
                    <div className="space-y-5">
                      <div className="border-b border-gray-200 pb-2 mb-4">
                        <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                          <svg className="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          Financial Information
                        </h4>
                      </div>

                      {/* Financial Fields */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Total Debt Amount</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                            <input
                              type="number"
                              name="totalDebtAmount"
                              min="0"
                              step="0.01"
                              className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                              value={formData.totalDebtAmount}
                              onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Creditors</label>
                          <input
                            type="number"
                            name="numberOfCreditors"
                            min="0"
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                            value={formData.numberOfCreditors}
                            onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                            placeholder="Number"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Monthly Payment</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                            <input
                              type="number"
                              name="monthlyDebtPayment"
                              min="0"
                              step="0.01"
                              className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                              value={formData.monthlyDebtPayment}
                              onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Credit Score</label>
                          <input
                            type="number"
                            name="creditScore"
                            min="0"
                            max="900"
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                            value={formData.creditScore || ""}
                            onChange={e => {
                              let val = e.target.value.replace(/[^\d]/g, "");
                              if (val.length > 3) val = val.slice(0, 3);
                              if (parseInt(val, 10) > 900) val = "900";
                              
                              setFormData({ ...formData, creditScore: val });
                            }}
                            placeholder="0-900"
                          />
                        </div>
                      </div>

                      {/* Credit Score Range */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Credit Score Range</label>
                        <select
                          name="creditScoreRange"
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                          value={formData.creditScoreRange}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                        >
                          <option value="">Select credit range</option>
                          <option value="300-549">Poor (300-549)</option>
                          <option value="550-649">Fair (550-649)</option>
                          <option value="650-699">Good (650-699)</option>
                          <option value="700-749">Very Good (700-749)</option>
                          <option value="750-850">Excellent (750-850)</option>
                        </select>
                      </div>

                      {/* Debt Type Selection - Improved Design */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Debt Category</label>
                        <select
                          name="debtCategory"
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white mb-3"
                          value={formData.debtCategory}
                          onChange={handleDebtCategoryChange}
                        >
                          <option value="unsecured">Unsecured Debt</option>
                          <option value="secured">Secured Debt</option>
                        </select>

                        {/* Selected Debt Types Display */}
                        {formData.debtTypes.length > 0 && (
                          <div className="mb-3">
                            <div className="flex flex-wrap gap-2">
                              {formData.debtTypes.map((type) => (
                                <span
                                  key={type}
                                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700"
                                >
                                  {type}
                                  <button
                                    type="button"
                                    onClick={() => handleDebtTypeToggle(type)}
                                    className="ml-2 text-primary-500 hover:text-primary-700"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Debt Type Options */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                            Select {formData.debtCategory} debt types:
                          </label>
                          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                            {DEBT_TYPES_BY_CATEGORY[formData.debtCategory].map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => handleDebtTypeToggle(type)}
                                className={`text-left px-3 py-2 rounded-md text-sm transition-all duration-200 ${
                                  formData.debtTypes.includes(type)
                                    ? 'bg-primary-600 text-white shadow-sm'
                                    : 'bg-white text-gray-700 hover:bg-primary-50 hover:text-primary-700 border border-gray-200'
                                }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Adding Lead...
                      </span>
                    ) : (
                      'Add Lead'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {showEditModal && editingLead && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div 
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingLead(null);
                }}
              ></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
              <form onSubmit={handleEditLead}>
                {/* Header */}
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-white">Edit Lead: {editingLead.name}</h3>
                      <p className="text-primary-100 text-sm">Update lead information</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingLead(null);
                      }}
                      className="text-white hover:text-primary-200 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>



                {/* Form Content - Two Column Layout */}
                <div className="bg-white p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Left Column - Personal & Contact Information */}
                    <div className="space-y-5">
                      <div className="border-b border-gray-200 pb-2 mb-4">
                        <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                          <svg className="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Personal Information
                        </h4>
                      </div>

                      {/* Name */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                        <input
                          type="text"
                          name="name"
                          required
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                          value={formData.name}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                          placeholder="Enter full name"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                        <input
                          type="email"
                          name="email"
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                          value={formData.email}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                          placeholder="Enter email address"
                        />
                      </div>

                      {/* Phone Numbers */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Primary Phone</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 sm:text-sm">+1</span>
                            </div>
                            <input
                              type="tel"
                              name="phone"
                              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white ${
                                formErrors.phone 
                                  ? 'border-red-300 focus:ring-red-500' 
                                  : 'border-gray-200 focus:ring-primary-500'
                              }`}
                              value={getDisplayPhone(formData.phone)}
                              onChange={handlePhoneInputChange}
                              onBlur={handlePhoneBlur}
                              onKeyDown={handleKeyDown}
                              placeholder="Enter 10 digits (e.g. 2345678901)"
                              maxLength="10"
                            />
                          </div>
                          {formErrors.phone && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Alternate Phone</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 sm:text-sm">+1</span>
                            </div>
                            <input
                              type="tel"
                              name="alternatePhone"
                              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white ${
                                formErrors.alternatePhone 
                                  ? 'border-red-300 focus:ring-red-500' 
                                  : 'border-gray-200 focus:ring-primary-500'
                              }`}
                              value={getDisplayPhone(formData.alternatePhone)}
                              onChange={handlePhoneInputChange}
                              onBlur={handlePhoneBlur}
                              onKeyDown={handleKeyDown}
                              placeholder="Enter 10 digits (optional)"
                              maxLength="10"
                            />
                          </div>
                          {formErrors.alternatePhone && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.alternatePhone}</p>
                          )}
                        </div>
                      </div>                      {/* Address */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Street Address</label>
                        <input
                          type="text"
                          name="address"
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                          value={formData.address}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                          placeholder="Enter street address"
                        />
                      </div>

                      {/* City, State, Zipcode */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                          <input
                            type="text"
                            name="city"
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                            value={formData.city}
                            onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                            placeholder="City"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
                          <input
                            type="text"
                            name="state"
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                            value={formData.state}
                            onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                            placeholder="State"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">ZIP Code</label>
                          <input
                            type="text"
                            name="zipcode"
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                            value={formData.zipcode}
                            onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                            placeholder="ZIP"
                          />
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Notes</label>
                        <textarea
                          name="notes"
                          rows="3"
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white resize-none"
                          value={formData.notes}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                          placeholder="Any additional information..."
                        ></textarea>
                      </div>
                    </div>

                    {/* Right Column - Financial & Debt Information */}
                    <div className="space-y-5">
                      <div className="border-b border-gray-200 pb-2 mb-4">
                        <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                          <svg className="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          Financial Information
                        </h4>
                      </div>

                      {/* Financial Fields */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Total Debt Amount</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                            <input
                              type="number"
                              name="totalDebtAmount"
                              min="0"
                              step="0.01"
                              className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                              value={formData.totalDebtAmount}
                              onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Creditors</label>
                          <input
                            type="number"
                            name="numberOfCreditors"
                            min="0"
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                            value={formData.numberOfCreditors}
                            onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                            placeholder="Number"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Monthly Payment</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                            <input
                              type="number"
                              name="monthlyDebtPayment"
                              min="0"
                              step="0.01"
                              className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                              value={formData.monthlyDebtPayment}
                              onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Credit Score</label>
                          <input
                            type="number"
                            name="creditScore"
                            min="0"
                            max="900"
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                            value={formData.creditScore || ""}
                            onChange={e => {
                              let val = e.target.value.replace(/[^\d]/g, "");
                              if (val.length > 3) val = val.slice(0, 3);
                              if (parseInt(val, 10) > 900) val = "900";
                              
                              setFormData({ ...formData, creditScore: val });
                            }}
                            placeholder="0-900"
                          />
                        </div>
                      </div>

                      {/* Credit Score Range */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Credit Score Range</label>
                        <select
                          name="creditScoreRange"
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                          value={formData.creditScoreRange}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                        >
                          <option value="">Select credit range</option>
                          <option value="300-549">Poor (300-549)</option>
                          <option value="550-649">Fair (550-649)</option>
                          <option value="650-699">Good (650-699)</option>
                          <option value="700-749">Very Good (700-749)</option>
                          <option value="750-850">Excellent (750-850)</option>
                        </select>
                      </div>

                      {/* Debt Type Selection */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Debt Category</label>
                        <select
                          name="debtCategory"
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white mb-3"
                          value={formData.debtCategory}
                          onChange={handleDebtCategoryChange}
                        >
                          <option value="unsecured">Unsecured Debt</option>
                          <option value="secured">Secured Debt</option>
                        </select>

                        {/* Selected Debt Types Display */}
                        {formData.debtTypes.length > 0 && (
                          <div className="mb-3">
                            <div className="flex flex-wrap gap-2">
                              {formData.debtTypes.map((type) => (
                                <span
                                  key={type}
                                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700"
                                >
                                  {type}
                                  <button
                                    type="button"
                                    onClick={() => handleDebtTypeToggle(type)}
                                    className="ml-2 text-primary-500 hover:text-primary-700"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Debt Type Options */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                            Select {formData.debtCategory} debt types:
                          </label>
                          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                            {DEBT_TYPES_BY_CATEGORY[formData.debtCategory].map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => handleDebtTypeToggle(type)}
                                className={`text-left px-3 py-2 rounded-md text-sm transition-all duration-200 ${
                                  formData.debtTypes.includes(type)
                                    ? 'bg-primary-600 text-white shadow-sm'
                                    : 'bg-white text-gray-700 hover:bg-primary-50 hover:text-primary-700 border border-gray-200'
                                }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingLead(null);
                    }}
                    className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating...
                      </span>
                    ) : (
                      'Update Lead'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && assigningLead && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div 
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={() => setShowAssignModal(false)}
              ></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleAssignmentSubmit}>
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-white">Assign Lead</h3>
                      <p className="text-blue-100 text-sm">Assign "{assigningLead.name}" to Agent2</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(false)}
                      className="text-blue-100 hover:text-white focus:outline-none"
                    >
                      <span className="sr-only">Close</span>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="px-6 py-6">
                  {/* Select Agent */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Select Agent2 <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      value={assignmentData.assignedTo}
                      onChange={(e) => setAssignmentData({
                        ...assignmentData,
                        assignedTo: e.target.value
                      })}
                    >
                      <option value="">Choose an agent...</option>
                      {availableAgents.map((agent) => (
                        <option key={agent._id} value={agent._id}>
                          {agent.name} ({agent.email})
                        </option>
                      ))}
                    </select>
                    {availableAgents.length === 0 && (
                      <p className="text-sm text-gray-500 mt-2">
                        No available Agent2 users in your organization.
                      </p>
                    )}
                  </div>

                  {/* Assignment Notes */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Assignment Notes (Optional)
                    </label>
                    <textarea
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Add any notes for the assigned agent..."
                      value={assignmentData.assignmentNotes}
                      onChange={(e) => setAssignmentData({
                        ...assignmentData,
                        assignmentNotes: e.target.value
                      })}
                      maxLength={500}
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      {assignmentData.assignmentNotes.length}/500 characters
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !assignmentData.assignedTo}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {submitting ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Assigning...
                      </span>
                    ) : (
                      'Assign Lead'
                    )}
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

export default Agent1Dashboard;
