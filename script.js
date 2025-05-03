document.addEventListener('DOMContentLoaded', function() {
    // State management
    const state = {
        currentRole: null,
        isAuthenticated: false,
        currentUser: null,
        users: [],
        employees: [],
        transactions: [],
        statistics: {
            totalUSDTBalance: 0,
            totalAFGBalance: 0,
            userCount: 0,
            employeeCount: 0
        }
    };
    
    // DOM elements
    const roleButtons = document.querySelectorAll('.role-btn');
    const loginForm = document.getElementById('login-form');
    const logoutBtns = document.querySelectorAll('#logout-btn, #emp-logout-btn, #user-logout-btn');
    const navLinks = document.querySelectorAll('.nav-link');
    const transactionModal = document.getElementById('transaction-modal');
    const userDetailsModal = document.getElementById('user-details-modal');
    const employeeTransactionModal = document.getElementById('employee-transaction-modal');
    const closeModal = document.querySelector('.close-modal');
    const closeUserModal = document.querySelector('.close-user-modal');
    const closeEmpTransactionModal = document.querySelector('.close-emp-transaction-modal');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    const transactionForm = document.getElementById('transaction-form');
    const employeeTransactionForm = document.getElementById('employee-transaction-form');
    const depositBtn = document.getElementById('deposit-btn');
    const withdrawBtn = document.getElementById('withdraw-btn');
    const transferBtn = document.getElementById('transfer-btn');
    const createAccountForm = document.getElementById('create-account-form');
    const accountSettingsForm = document.getElementById('account-settings-form');
    const searchBtn = document.getElementById('search-btn');
    const applyFiltersBtn = document.getElementById('apply-filters');
    
    // Check for existing data in local storage
    checkExistingSession();
    
    // Role selection
    roleButtons.forEach(button => {
        button.addEventListener('click', function() {
            roleButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            state.currentRole = this.getAttribute('data-role');
        });
    });
    
    // Login form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!state.currentRole) {
            showToast('error', 'Please select a role first!');
            return;
        }
        
        // Authentication
        authenticate(username, password, state.currentRole);
    });
    
    // Logout
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            logout();
        });
    });
    
    // Navigation
    navLinks.forEach(link => {
        if (!link.id.includes('logout')) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const section = this.getAttribute('data-section');
                showSection(section, this.closest('.sidebar').parentElement.id);
            });
        }
    });
    
    // Transaction buttons
    depositBtn?.addEventListener('click', () => showTransactionModal('deposit'));
    withdrawBtn?.addEventListener('click', () => showTransactionModal('withdrawal'));
    transferBtn?.addEventListener('click', () => showTransactionModal('transfer'));
    
    // Close modals
    closeModal?.addEventListener('click', () => {
        transactionModal.classList.add('hidden');
    });
    
    closeUserModal?.addEventListener('click', () => {
        userDetailsModal.classList.add('hidden');
    });
    
    closeEmpTransactionModal?.addEventListener('click', () => {
        employeeTransactionModal.classList.add('hidden');
    });
    
    closeModalBtn?.addEventListener('click', () => {
        employeeTransactionModal.classList.add('hidden');
    });
    
    // Transaction form submission
    transactionForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        const type = transactionModal.getAttribute('data-type');
        const amount = parseFloat(document.getElementById('transaction-amount').value);
        const details = document.getElementById('transaction-details').value;
        let receiver = '';
        
        if (type === 'transfer') {
            receiver = document.getElementById('receiver-account').value;
        }
        
        createTransaction(type, amount, receiver, details);
        transactionModal.classList.add('hidden');
    });
    
    // Employee transaction form submission
    employeeTransactionForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        const type = employeeTransactionModal.getAttribute('data-type');
        const userId = parseInt(employeeTransactionModal.getAttribute('data-user-id'));
        const amount = parseFloat(document.getElementById('emp-transaction-amount').value);
        const details = document.getElementById('emp-transaction-details').value || 
                       `${capitalizeFirstLetter(type)} - processed by employee`;
        
        handleEmployeeTransaction(userId, type, amount, details);
        employeeTransactionModal.classList.add('hidden');
    });
    
    // Create account form submission
    createAccountForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('user-name').value;
        const address = document.getElementById('user-address').value;
        const phone = document.getElementById('user-phone').value;
        const jobDetails = document.getElementById('user-job').value || '';
        const accountType = document.getElementById('account-type').value;
        const balance = parseFloat(document.getElementById('initial-deposit').value);
        const password = document.getElementById('user-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        // Basic validation
        if (password !== confirmPassword) {
            showToast('error', 'Passwords do not match!');
            return;
        }
        
        if (!name || !phone || !balance || isNaN(balance)) {
            showToast('error', 'Please fill all required fields correctly!');
            return;
        }
        
        const userData = {
            name,
            address,
            phone,
            jobDetails,
            accountType,
            balance,
            password,
            accountNumber: generateAccountNumber(),
            role: 'user'
        };
        
        createUser(userData);
        this.reset();
    });
    
    // Account settings form submission
    accountSettingsForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('settings-name').value;
        const address = document.getElementById('settings-address').value;
        const phone = document.getElementById('settings-phone').value;
        const password = document.getElementById('settings-password').value;
        
        // Only include non-empty fields
        const updatedData = {};
        if (name) updatedData.name = name;
        if (address) updatedData.address = address;
        if (phone) updatedData.phone = phone;
        if (password) updatedData.password = password;
        
        if (Object.keys(updatedData).length === 0) {
            showToast('warning', 'No changes were made!');
            return;
        }
        
        updateUser(state.currentUser.id, updatedData);
        this.reset();
    });
    
    // User search
    searchBtn?.addEventListener('click', function() {
        const searchValue = document.getElementById('user-search').value.toLowerCase();
        searchUsers(searchValue);
    });
    
    // Transaction filters
    applyFiltersBtn?.addEventListener('click', function() {
        const type = document.getElementById('transaction-type').value;
        const fromDate = document.getElementById('date-from').value;
        const toDate = document.getElementById('date-to').value;
        
        filterTransactions(type, fromDate, toDate);
    });
    
    // Load from local storage and initialize if empty
    function checkExistingSession() {
        const savedState = localStorage.getItem('bankState');
        
        if (savedState) {
            // Load saved state
            const parsedState = JSON.parse(savedState);
            Object.assign(state, parsedState);
            
            if (state.isAuthenticated && state.currentUser) {
                showDashboard(state.currentRole);
            }
        } else {
            // Initialize with sample data
            initSampleData();
            saveToLocalStorage();
        }
    }
    
    // Initialize the app with sample data
    function initSampleData() {
        // Add admin user
        state.users.push({
            id: 1,
            name: "Admin",
            address: "Bank Headquarters",
            phone: "0705295884",
            jobDetails: "System Administrator",
            accountNumber: 1000,
            balance: 0,
            password: "admin",
            accountType: "ADMIN",
            role: "admin",
            status: "active"
        });
        
        // Add employee
        state.employees.push({
            id: 1,
            name: "Employee",
            employeeID: "EMP-2025-001",
            branch: "Main Branch",
            accessLevel: "Teller",
            status: "active",
            password: "employee"
        });
        
        // Add sample users
        state.users.push({
            id: 2,
            name: "Ahmad",
            address: "123 Main St",
            phone: "+937000001",
            jobDetails: "Software Developer",
            accountNumber: 1001,
            balance: 5000,
            password: "ahmad",
            accountType: "USDT",
            role: "user",
            status: "active"
        });
        
        state.users.push({
            id: 3,
            name: "Mahmmod",
            address: "456 Oak Ave",
            phone: "+9370000002",
            jobDetails: "Doctor",
            accountNumber: 1002,
            balance: 8000,
            password: "mahmmod",
            accountType: "AFG",
            role: "user",
            status: "active"
        });
        
        // Add sample transactions
        state.transactions.push({
            id: 1,
            userId: 2,
            type: "deposit",
            amount: 1000,
            date: "2025-04-15",
            details: "Initial deposit",
            balanceAfter: 1000
        });
        
        state.transactions.push({
            id: 2,
            userId: 2,
            type: "deposit",
            amount: 4000,
            date: "2025-04-20",
            details: "Salary deposit",
            balanceAfter: 5000
        });
        
        state.transactions.push({
            id: 3,
            userId: 3,
            type: "deposit",
            amount: 10000,
            date: "2025-04-10",
            details: "Initial deposit",
            balanceAfter: 10000
        });
        
        state.transactions.push({
            id: 4,
            userId: 3,
            type: "withdrawal",
            amount: 2000,
            date: "2025-04-22",
            details: "Rent payment",
            balanceAfter: 8000
        });
        
        // Calculate statistics
        updateStatistics();
    }
    
    // Save state to local storage
    function saveToLocalStorage() {
        localStorage.setItem('bankState', JSON.stringify(state));
    }
    
    // Authentication function
    function authenticate(username, password, role) {
        let authenticated = false;
        let user = null;
        
        if (role === 'admin') {
            user = state.users.find(u => u.role === 'admin' && u.name === username && u.password === password);
            if (user) authenticated = true;
        } else if (role === 'employee') {
            const employee = state.employees.find(e => e.name === username && e.password === password);
            if (employee) { 
                authenticated = true;
                user = employee;
            }
        } else if (role === 'user') {
            user = state.users.find(u => u.role === 'user' && u.name === username && u.password === password);
            if (user) authenticated = true;
        }
        
        // Check if the user account is locked
        if (authenticated && user && user.status === 'locked') {
            showToast('error', 'This account has been locked. Please contact an administrator.');
            authenticated = false;
        }
        
        if (authenticated) {
            state.isAuthenticated = true;
            state.currentUser = user;
            showDashboard(role);
            showToast('success', 'Logged in successfully!');
            saveToLocalStorage();
        } else {
            if (!user) {
                showToast('error', 'Invalid credentials!');
            }
        }
    }
    
    // Logout function
    function logout() {
        state.isAuthenticated = false;
        state.currentUser = null;
        state.currentRole = null;
        
        document.getElementById('login-section').classList.remove('hidden');
        document.getElementById('admin-section').classList.add('hidden');
        document.getElementById('employee-section').classList.add('hidden');
        document.getElementById('user-section').classList.add('hidden');
        
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        roleButtons.forEach(btn => btn.classList.remove('active'));
        
        showToast('success', 'Logged out successfully!');
        saveToLocalStorage();
    }
    
    // Show dashboard based on role
    function showDashboard(role) {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('admin-section').classList.add('hidden');
        document.getElementById('employee-section').classList.add('hidden');
        document.getElementById('user-section').classList.add('hidden');
        
        if (role === 'admin') {
            document.getElementById('admin-section').classList.remove('hidden');
            showSection('bank-details', 'admin-section');
            renderBankDetails();
        } else if (role === 'employee') {
            document.getElementById('employee-section').classList.remove('hidden');
            showSection('create-account', 'employee-section');
        } else if (role === 'user') {
            document.getElementById('user-section').classList.remove('hidden');
            showSection('dashboard', 'user-section');
            renderUserDashboard();
        }
    }
    
    // Show a specific section
    function showSection(section, parentId) {
        const parent = document.getElementById(parentId);
        if (!parent) return;
        
        const contentAreas = parent.querySelectorAll('.content-area');
        contentAreas.forEach(area => area.classList.add('hidden'));
        
        const sectionToShow = document.getElementById(`${section}-content`);
        if (sectionToShow) {
            sectionToShow.classList.remove('hidden');
        }
        
        // Update data for the section
        if (section === 'bank-details') {
            renderBankDetails();
        } else if (section === 'user-management') {
            renderUserManagement();
        } else if (section === 'employee-management') {
            renderEmployeeManagement();
        } else if (section === 'dashboard') {
            renderUserDashboard();
        } else if (section === 'transactions') {
            renderTransactionHistory();
        } else if (section === 'account-settings') {
            renderAccountSettings();
        } else if (section === 'user-lookup') {
            // Clear previous search results
            document.getElementById('search-results-list').innerHTML = '';
            document.getElementById('no-results').classList.add('hidden');
        }
    }
    
    // Render bank details for admin
    function renderBankDetails() {
        updateStatistics();
        document.getElementById('total-usdt').textContent = formatCurrency(state.statistics.totalUSDTBalance, 'USDT');
        document.getElementById('total-afg').textContent = formatCurrency(state.statistics.totalAFGBalance, 'AFG');
        document.getElementById('user-count').textContent = state.statistics.userCount;
        document.getElementById('employee-count').textContent = state.statistics.employeeCount;
        
        // Recent activity (10 most recent transactions)
        const recentActivity = [...state.transactions]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);
        
        const activityList = document.getElementById('activity-list');
        activityList.innerHTML = '';
        
        recentActivity.forEach(activity => {
            const user = state.users.find(u => u.id === activity.userId);
            const userName = user ? user.name : 'Unknown User';
            const li = document.createElement('li');
            li.innerHTML = `
                <p><strong>${formatDate(activity.date)}</strong> - ${userName} ${activity.type} ${formatCurrency(activity.amount, user?.accountType || 'USDT')}</p>
                <p class="activity-details">${activity.details}</p>
            `;
            activityList.appendChild(li);
        });
    }
    
    // Render user management for admin
    function renderUserManagement() {
        const userList = document.getElementById('user-list');
        userList.innerHTML = '';
        
        state.users
            .filter(user => user.role === 'user')
            .forEach(user => {
                const isLocked = user.status === 'locked';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.name}</td>
                    <td>${user.accountNumber}</td>
                    <td>${formatCurrency(user.balance, user.accountType)}</td>
                    <td>${user.accountType}</td>
                    <td>
                        <button class="view-user-btn" data-id="${user.id}">View</button>
                        <button class="lock-user-btn ${isLocked ? 'secondary-btn' : ''}" data-id="${user.id}">
                            ${isLocked ? 'Unlock' : 'Lock'}
                        </button>
                    </td>
                `;
                userList.appendChild(tr);
            });
        
        // Add event listeners for buttons
        document.querySelectorAll('.view-user-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = parseInt(this.getAttribute('data-id'));
                viewUserDetails(userId);
            });
        });
        
        document.querySelectorAll('.lock-user-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = parseInt(this.getAttribute('data-id'));
                lockUserAccount(userId);
            });
        });
    }
    
    // Render employee management for admin
    function renderEmployeeManagement() {
        const employeeList = document.getElementById('employee-list');
        employeeList.innerHTML = '';
        
        state.employees.forEach(employee => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${employee.id}</td>
                <td>${employee.name}</td>
                <td>${employee.employeeID}</td>
                <td>${employee.branch}</td>
                <td>${employee.accessLevel}</td>
                <td>${employee.status}</td>
                <td>
                    <button class="edit-employee-btn" data-id="${employee.id}">Edit</button>
                    <button class="delete-employee-btn" data-id="${employee.id}">Delete</button>
                </td>
            `;
            employeeList.appendChild(tr);
        });
        
        // Add event listeners for buttons
        document.querySelectorAll('.edit-employee-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const empId = parseInt(this.getAttribute('data-id'));
                editEmployee(empId);
            });
        });
        
        document.querySelectorAll('.delete-employee-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const empId = parseInt(this.getAttribute('data-id'));
                deleteEmployee(empId);
            });
        });
    }
    
    // Render user dashboard
    function renderUserDashboard() {
        if (!state.currentUser) return;
        
        document.getElementById('user-balance').textContent = formatCurrency(state.currentUser.balance, state.currentUser.accountType);
        document.getElementById('user-account-number').textContent = state.currentUser.accountNumber;
        document.getElementById('user-account-type').textContent = state.currentUser.accountType;
        
        // Recent transactions (5 most recent)
        const recentTransactions = getUserTransactions(state.currentUser.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
        
        const transactionsList = document.getElementById('recent-transactions-list');
        transactionsList.innerHTML = '';
        
        if (recentTransactions.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="4" class="text-center">No transactions yet</td>`;
            transactionsList.appendChild(tr);
        } else {
            recentTransactions.forEach(transaction => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatDate(transaction.date)}</td>
                    <td>${capitalizeFirstLetter(transaction.type)}</td>
                    <td>${formatCurrency(transaction.amount, state.currentUser.accountType)}</td>
                    <td>${transaction.details}</td>
                `;
                transactionsList.appendChild(tr);
            });
        }
    }
    
    // Render transaction history for user
    function renderTransactionHistory() {
        if (!state.currentUser) return;
        
        const transactions = getUserTransactions(state.currentUser.id);
        const transactionsList = document.getElementById('transactions-list');
        transactionsList.innerHTML = '';
        
        if (transactions.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="6" class="text-center">No transactions found</td>`;
            transactionsList.appendChild(tr);
        } else {
            transactions.forEach(transaction => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatDate(transaction.date)}</td>
                    <td>${capitalizeFirstLetter(transaction.type)}</td>
                    <td>${formatCurrency(transaction.amount, state.currentUser.accountType)}</td>
                    <td>${transaction.receiver || '-'}</td>
                    <td>${formatCurrency(transaction.balanceAfter, state.currentUser.accountType)}</td>
                    <td>${transaction.details}</td>
                `;
                transactionsList.appendChild(tr);
            });
        }
    }
    
    // Filter transactions
    function filterTransactions(type, fromDate, toDate) {
        if (!state.currentUser) return;
        
        let filteredTransactions = getUserTransactions(state.currentUser.id);
        
        // Filter by type if specified
        if (type && type !== 'all') {
            filteredTransactions = filteredTransactions.filter(t => t.type === type);
        }
        
        // Filter by date range if specified
        if (fromDate) {
            const fromDateTime = new Date(fromDate).getTime();
            filteredTransactions = filteredTransactions.filter(t => new Date(t.date).getTime() >= fromDateTime);
        }
        
        if (toDate) {
            const toDateTime = new Date(toDate).getTime() + (24 * 60 * 60 * 1000 - 1); // End of the day
            filteredTransactions = filteredTransactions.filter(t => new Date(t.date).getTime() <= toDateTime);
        }
        
        const transactionsList = document.getElementById('transactions-list');
        transactionsList.innerHTML = '';
        
        if (filteredTransactions.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="6" class="text-center">No transactions found with the selected filters</td>`;
            transactionsList.appendChild(tr);
        } else {
            filteredTransactions.forEach(transaction => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatDate(transaction.date)}</td>
                    <td>${capitalizeFirstLetter(transaction.type)}</td>
                    <td>${formatCurrency(transaction.amount, state.currentUser.accountType)}</td>
                    <td>${transaction.receiver || '-'}</td>
                    <td>${formatCurrency(transaction.balanceAfter, state.currentUser.accountType)}</td>
                    <td>${transaction.details}</td>
                `;
                transactionsList.appendChild(tr);
            });
        }
    }
    
    // Render account settings form
    function renderAccountSettings() {
        if (!state.currentUser) return;
        
        document.getElementById('settings-name').value = state.currentUser.name;
        document.getElementById('settings-address').value = state.currentUser.address;
        document.getElementById('settings-phone').value = state.currentUser.phone;
        document.getElementById('settings-password').value = '';
    }
    
    // Show transaction modal
    function showTransactionModal(type) {
        const modalTitle = document.getElementById('modal-title');
        const receiverGroup = document.getElementById('receiver-group');
        const currencySymbol = document.querySelector('.currency-symbol');
        
        if (type === 'deposit') {
            modalTitle.textContent = 'Deposit Funds';
            receiverGroup.classList.add('hidden');
        } else if (type === 'withdrawal') {
            modalTitle.textContent = 'Withdraw Funds';
            receiverGroup.classList.add('hidden');
        } else if (type === 'transfer') {
            modalTitle.textContent = 'Transfer Funds';
            receiverGroup.classList.remove('hidden');
        }
        
        // Set currency symbol based on account type
        if (state.currentUser) {
            currencySymbol.textContent = state.currentUser.accountType === 'USDT' ? '$' : '₳';
        }
        
        // Reset form
        document.getElementById('transaction-amount').value = '';
        document.getElementById('receiver-account').value = '';
        document.getElementById('transaction-details').value = '';
        
        // Set data-type attribute for form submission
        transactionModal.setAttribute('data-type', type);
        
        // Show modal
        transactionModal.classList.remove('hidden');
    }
    
    // Create transaction
    function createTransaction(type, amount, receiver = '', details = '') {
        if (!state.currentUser) return { success: false, message: 'Not authenticated' };
        
        if (amount <= 0) {
            showToast('error', 'Amount must be greater than zero!');
            return { success: false, message: 'Invalid amount' };
        }
        
        // For withdrawals and transfers, check if user has enough balance
        if ((type === 'withdrawal' || type === 'transfer') && amount > state.currentUser.balance) {
            showToast('error', 'Insufficient balance!');
            return { success: false, message: 'Insufficient balance' };
        }
        
        // For transfers, check if receiver exists
        let receiverUser = null;
        if (type === 'transfer') {
            if (!receiver) {
                showToast('error', 'Receiver account number is required!');
                return { success: false, message: 'Receiver not specified' };
            }
            
            receiverUser = state.users.find(u => u.accountNumber === parseInt(receiver));
            if (!receiverUser) {
                showToast('error', 'Receiver account not found!');
                return { success: false, message: 'Receiver not found' };
            }
            
            if (receiverUser.id === state.currentUser.id) {
                showToast('error', 'Cannot transfer to your own account!');
                return { success: false, message: 'Self transfer not allowed' };
            }
        }
        
        // Generate a new transaction id
        const transactionId = state.transactions.length > 0 
            ? Math.max(...state.transactions.map(t => t.id)) + 1 
            : 1;
        
        // Update current user's balance
        let newBalance = state.currentUser.balance;
        
        if (type === 'deposit') {
            newBalance += amount;
        } else if (type === 'withdrawal' || type === 'transfer') {
            newBalance -= amount;
        }
        
        // Create the transaction
        const transaction = {
            id: transactionId,
            userId: state.currentUser.id,
            type: type,
            amount: amount,
            date: getCurrentDate(),
            details: details || capitalizeFirstLetter(type),
            balanceAfter: newBalance,
            receiver: type === 'transfer' ? receiver : null
        };
        
        state.transactions.push(transaction);
        
        // Update current user's balance
        const userIndex = state.users.findIndex(u => u.id === state.currentUser.id);
        if (userIndex !== -1) {
            state.users[userIndex].balance = newBalance;
            state.currentUser = state.users[userIndex]; // Update currentUser reference
        }
        
        // If it's a transfer, add deposit transaction for the receiver
        if (type === 'transfer' && receiverUser) {
            const receiverNewBalance = receiverUser.balance + amount;
            
            // Create deposit transaction for receiver
            const receiverTransaction = {
                id: transactionId + 1,
                userId: receiverUser.id,
                type: 'deposit',
                amount: amount,
                date: getCurrentDate(),
                details: `Transfer from account #${state.currentUser.accountNumber}`,
                balanceAfter: receiverNewBalance,
                receiver: null
            };
            
            state.transactions.push(receiverTransaction);
            
            // Update receiver's balance
            const receiverIndex = state.users.findIndex(u => u.id === receiverUser.id);
            if (receiverIndex !== -1) {
                state.users[receiverIndex].balance = receiverNewBalance;
            }
        }
        
        // Update statistics
        updateStatistics();
        
        // Refresh UI
        if (state.currentRole === 'user') {
            renderUserDashboard();
        }
        
        showToast('success', `${capitalizeFirstLetter(type)} processed successfully!`);
        saveToLocalStorage();
        
        return { success: true, message: 'Transaction successful' };
    }
    
    // Handle employee transaction for a user
    function handleEmployeeTransaction(userId, type, amount, details) {
        const user = state.users.find(u => u.id === userId);
        if (!user) {
            showToast('error', 'User not found!');
            return { success: false, message: 'User not found' };
        }
        
        if (amount <= 0) {
            showToast('error', 'Amount must be greater than zero!');
            return { success: false, message: 'Invalid amount' };
        }
        
        // For withdrawals, check if user has enough balance
        if (type === 'withdrawal' && amount > user.balance) {
            showToast('error', 'Insufficient balance!');
            return { success: false, message: 'Insufficient balance' };
        }
        
        // Generate a new transaction id
        const transactionId = state.transactions.length > 0 
            ? Math.max(...state.transactions.map(t => t.id)) + 1 
            : 1;
        
        // Update user's balance
        let newBalance = user.balance;
        
        if (type === 'deposit') {
            newBalance += amount;
        } else if (type === 'withdrawal') {
            newBalance -= amount;
        }
        
        // Create the transaction
        const transaction = {
            id: transactionId,
            userId: user.id,
            type: type,
            amount: amount,
            date: getCurrentDate(),
            details: details || `${capitalizeFirstLetter(type)} processed by employee`,
            balanceAfter: newBalance
        };
        
        state.transactions.push(transaction);
        
        // Update user's balance
        const userIndex = state.users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
            state.users[userIndex].balance = newBalance;
            
            // Update search results to reflect new balance
            refreshSearchResults();
        }
        
        // Update statistics
        updateStatistics();
        
        showToast('success', `${capitalizeFirstLetter(type)} processed successfully!`);
        saveToLocalStorage();
        
        return { success: true, message: 'Transaction successful' };
    }
    
    // Create user
    function createUser(userData) {
        const userId = state.users.length > 0 
            ? Math.max(...state.users.map(u => u.id)) + 1 
            : 1;
        
        const newUser = {
            id: userId,
            status: 'active',
            ...userData
        };
        
        state.users.push(newUser);
        updateStatistics();
        showToast('success', 'Account created successfully!');
        saveToLocalStorage();
        
        return { success: true, message: 'User created' };
    }
    
    // Update user
    function updateUser(userId, userData) {
        const userIndex = state.users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            showToast('error', 'User not found!');
            return { success: false, message: 'User not found' };
        }
        
        // Update user data
        state.users[userIndex] = { 
            ...state.users[userIndex], 
            ...userData 
        };
        
        // Update currentUser reference if it's the logged in user
        if (state.currentUser && state.currentUser.id === userId) {
            state.currentUser = state.users[userIndex];
        }
        
        showToast('success', 'Account updated successfully!');
        saveToLocalStorage();
        
        return { success: true, message: 'User updated' };
    }
    
    // Search users
    function searchUsers(query) {
        if (!query) {
            // Clear results and show no-results message
            document.getElementById('search-results-list').innerHTML = '';
            document.getElementById('no-results').classList.add('hidden');
            return;
        }
        
        const results = state.users.filter(user => 
            user.role === 'user' &&
            (user.name.toLowerCase().includes(query) || 
             user.accountNumber.toString().includes(query) ||
             user.phone.toLowerCase().includes(query))
        );
        
        const searchResultsList = document.getElementById('search-results-list');
        const noResults = document.getElementById('no-results');
        
        searchResultsList.innerHTML = '';
        
        if (results.length === 0) {
            noResults.classList.remove('hidden');
        } else {
            noResults.classList.add('hidden');
            
            results.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div class="user-info-row">
                            <div class="user-avatar-tiny">
                                <i class="fas fa-user"></i>
                            </div>
                            <div>
                                <div class="user-name">${user.name}</div>
                                <div class="user-phone">${user.phone}</div>
                            </div>
                        </div>
                    </td>
                    <td>${user.accountNumber}</td>
                    <td>${formatCurrency(user.balance, user.accountType)}</td>
                    <td>
                        <span class="account-type ${user.accountType === 'USDT' ? 'usdt' : 'afg'}">${user.accountType}</span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="view-customer-btn" data-id="${user.id}">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="emp-deposit-btn" data-id="${user.id}">
                                <i class="fas fa-arrow-down"></i> Deposit
                            </button>
                            <button class="emp-withdraw-btn" data-id="${user.id}">
                                <i class="fas fa-arrow-up"></i> Withdraw
                            </button>
                        </div>
                    </td>
                `;
                searchResultsList.appendChild(tr);
            });
            
            // Add event listeners for buttons
            document.querySelectorAll('.view-customer-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const userId = parseInt(this.getAttribute('data-id'));
                    viewUserDetails(userId);
                });
            });
            
            document.querySelectorAll('.emp-deposit-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const userId = parseInt(this.getAttribute('data-id'));
                    showEmployeeTransactionModal(userId, 'deposit');
                });
            });
            
            document.querySelectorAll('.emp-withdraw-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const userId = parseInt(this.getAttribute('data-id'));
                    showEmployeeTransactionModal(userId, 'withdrawal');
                });
            });
        }
    }
    
    // Refresh search results
    function refreshSearchResults() {
        const searchValue = document.getElementById('user-search').value.toLowerCase();
        if (searchValue) {
            searchUsers(searchValue);
        }
    }
    
    // Get user transactions
    function getUserTransactions(userId) {
        return state.transactions.filter(t => t.userId === userId);
    }
    
    // View user details
    function viewUserDetails(userId) {
        const user = state.users.find(u => u.id === userId);
        if (!user) return;
        
        // Populate user details
        document.getElementById('detail-user-name').textContent = user.name;
        document.getElementById('detail-account-number').textContent = `Account #${user.accountNumber}`;
        document.getElementById('detail-account-type').textContent = user.accountType;
        document.getElementById('detail-balance').textContent = formatCurrency(user.balance, user.accountType);
        document.getElementById('detail-phone').textContent = user.phone;
        document.getElementById('detail-address').textContent = user.address || 'N/A';
        
        // Populate transactions
        const transactions = getUserTransactions(userId)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
        
        const transactionsList = document.getElementById('detail-transactions-list');
        transactionsList.innerHTML = '';
        
        if (transactions.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="4" class="text-center">No transactions</td>`;
            transactionsList.appendChild(tr);
        } else {
            transactions.forEach(transaction => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatDate(transaction.date)}</td>
                    <td>${capitalizeFirstLetter(transaction.type)}</td>
                    <td>${formatCurrency(transaction.amount, user.accountType)}</td>
                    <td>${formatCurrency(transaction.balanceAfter, user.accountType)}</td>
                `;
                transactionsList.appendChild(tr);
            });
        }
        
        // Set up action buttons
        const detailDepositBtn = document.getElementById('detail-deposit-btn');
        const detailWithdrawBtn = document.getElementById('detail-withdraw-btn');
        
        detailDepositBtn.onclick = () => {
            userDetailsModal.classList.add('hidden');
            showEmployeeTransactionModal(userId, 'deposit');
        };
        
        detailWithdrawBtn.onclick = () => {
            userDetailsModal.classList.add('hidden');
            showEmployeeTransactionModal(userId, 'withdrawal');
        };
        
        // Show modal
        userDetailsModal.classList.remove('hidden');
    }
    
    // Show employee transaction modal
    function showEmployeeTransactionModal(userId, type) {
        const user = state.users.find(u => u.id === userId);
        if (!user) return;
        
        const modalTitle = document.getElementById('emp-transaction-title');
        const currencySymbol = document.getElementById('emp-currency-symbol');
        
        if (type === 'deposit') {
            modalTitle.textContent = 'Deposit Funds';
        } else if (type === 'withdrawal') {
            modalTitle.textContent = 'Withdraw Funds';
        }
        
        // Set currency symbol based on account type
        currencySymbol.textContent = user.accountType === 'USDT' ? '$' : '₳';
        
        // Set user info
        document.getElementById('emp-user-name').textContent = user.name;
        document.getElementById('emp-account-details').textContent = 
            `Account #${user.accountNumber} - Balance: ${formatCurrency(user.balance, user.accountType)}`;
        
        // Reset form
        document.getElementById('emp-transaction-amount').value = '';
        document.getElementById('emp-transaction-details').value = '';
        
        // Set data attributes for form submission
        employeeTransactionModal.setAttribute('data-type', type);
        employeeTransactionModal.setAttribute('data-user-id', userId);
        
        // Show modal
        employeeTransactionModal.classList.remove('hidden');
    }
    
    // Lock user account
    function lockUserAccount(userId) {
        const userIndex = state.users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            showToast('error', 'User not found!');
            return;
        }
        
        const user = state.users[userIndex];
        const newStatus = user.status === 'locked' ? 'active' : 'locked';
        
        state.users[userIndex] = { 
            ...user, 
            status: newStatus 
        };
        
        showToast('success', `Account ${newStatus === 'locked' ? 'locked' : 'unlocked'} successfully!`);
        renderUserManagement();
        saveToLocalStorage();
    }
    
    // Edit employee
    function editEmployee(empId) {
        // This would typically show a form modal for editing
        // For simplicity, we'll just show a toast
        showToast('info', 'Employee edit functionality not implemented in this demo.');
    }
    
    // Delete employee
    function deleteEmployee(empId) {
        if (confirm('Are you sure you want to delete this employee?')) {
            const empIndex = state.employees.findIndex(e => e.id === empId);
            
            if (empIndex === -1) {
                showToast('error', 'Employee not found!');
                return;
            }
            
            state.employees.splice(empIndex, 1);
            updateStatistics();
            renderEmployeeManagement();
            showToast('success', 'Employee deleted successfully!');
            saveToLocalStorage();
        }
    }
    
    // Update statistics
    function updateStatistics() {
        // Count users (excluding admin)
        const userCount = state.users.filter(u => u.role === 'user').length;
        
        // Total balances by currency
        const balances = state.users.reduce((acc, user) => {
            if (user.accountType === 'USDT') {
                acc.usdtBalance += user.balance;
            } else if (user.accountType === 'AFG') {
                acc.afgBalance += user.balance;
            }
            return acc;
        }, { usdtBalance: 0, afgBalance: 0 });
        
        state.statistics = {
            totalUSDTBalance: balances.usdtBalance,
            totalAFGBalance: balances.afgBalance,
            userCount: userCount,
            employeeCount: state.employees.length
        };
    }
    
    // Helper function: Show toast message
    function showToast(type, message) {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = '';
        switch(type) {
            case 'success':
                icon = '<i class="fas fa-check-circle"></i>';
                break;
            case 'error':
                icon = '<i class="fas fa-exclamation-circle"></i>';
                break;
            case 'warning':
                icon = '<i class="fas fa-exclamation-triangle"></i>';
                break;
            case 'info':
                icon = '<i class="fas fa-info-circle"></i>';
                break;
        }
        
        toast.innerHTML = `${icon} <span>${message}</span>`;
        toastContainer.appendChild(toast);
        
        // Auto remove toast after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
    
    // Helper function: Generate account number
    function generateAccountNumber() {
        // Find the highest existing account number and increment by 1
        const maxAccountNumber = state.users.length > 0
            ? Math.max(...state.users.map(u => u.accountNumber))
            : 1000;
        
        return maxAccountNumber + 1;
    }
    
    // Helper function: Get current date in ISO format
    function getCurrentDate() {
        return new Date().toISOString().split('T')[0];
    }
    
    // Helper function: Format date
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }
    
    // Helper function: Format currency
    function formatCurrency(amount, currencyType = 'USDT') {
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyType === 'USDT' ? 'USD' : 'AFN',
            minimumFractionDigits: 2
        });
        
        // Replace $ with USDT symbol if needed
        if (currencyType === 'USDT') {
            return formatter.format(amount);
        } else {
            return '₳' + formatter.format(amount).slice(1);
        }
    }
    
    // Helper function: Capitalize first letter
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
});