const token = localStorage.getItem('token');
const role = localStorage.getItem('role');

if (!token) {
    window.location.href = '/login.html';
} else if (role === 'admin') {
    window.location.href = '/admin.html';
}

// DOM Elements
const dashboardList = document.getElementById('dashboard-list');
const fullList = document.getElementById('full-list');
const balance = document.getElementById('balance');
const money_plus = document.getElementById('money-plus');
const money_minus = document.getElementById('money-minus');
const form = document.getElementById('form');
const text = document.getElementById('text');
const amount = document.getElementById('amount');
const category = document.getElementById('category');
const dateInput = document.getElementById('date');
const editId = document.getElementById('edit-id');
const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit');
const logoutBtn = document.getElementById('logout-btn');

// Set today's date as default
if(dateInput) dateInput.valueAsDate = new Date();

// Search & Filter Elements
const searchInput = document.getElementById('search');
const filterCategory = document.getElementById('filter-category');
const filterDate = document.getElementById('filter-date');

// Month Navigation Elements
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const monthDisplay = document.getElementById('current-month-display');
const monthSelector = document.getElementById('month-selector');
const dashPrevMonthBtn = document.getElementById('dash-prev-month');
const dashNextMonthBtn = document.getElementById('dash-next-month');
const dashMonthDisplay = document.getElementById('dash-current-month-display');

// Nav Logic
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page-section');

let transactions = [];
let userBudget = 0;
let monthlyBudgets = {};
let categoryBudgets = {};
let currentSelectedMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
let monthlySummaries = {};
let predictionData = {};

navItems.forEach(btn => {
    btn.addEventListener('click', () => {
        navItems.forEach(n => n.classList.remove('active'));
        btn.classList.add('active');
        
        const target = btn.getAttribute('data-target');
        pages.forEach(p => {
            p.classList.remove('active');
            if(p.id === target) p.classList.add('active');
        });

        if(target === 'reports-page') renderReports();
        if(target === 'profile-page') fetchProfile();
    });
});

if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = '/login.html';
    });
}

// Fetch API
async function getTransactions() {
    try {
        const res = await fetch('/api/transactions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if(data.success) {
            transactions = data.data;
            updateMonthSelector();
            fetchSummary();
            init();
        }
    } catch (err) { console.error(err); }
}

async function fetchSummary() {
    try {
        const res = await fetch('/api/transactions/summary', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if(data.success) {
            monthlySummaries = data.data.monthlyData;
            predictionData = data.data.prediction;
            
            // Dashboard prediction
            if(document.getElementById('predicted-expense')) {
                document.getElementById('predicted-expense').innerText = `₹${predictionData.currentMonthProjection}`;
            }
            if(document.getElementById('prediction-confidence')) {
                document.getElementById('prediction-confidence').innerText = predictionData.confidence;
            }

            updateMonthlyStats();
            renderTrendChart();
            renderPredictionAnalysis();
            renderUpcomingForecast();
        }
    } catch (err) { console.error(err); }
}

function renderPredictionAnalysis() {
    const list = document.getElementById('analysis-list');
    const container = document.getElementById('prediction-analysis');
    if(!list || !predictionData.analysis) return;

    container.style.display = 'block';
    const analysis = predictionData.analysis;
    
    list.innerHTML = `
        <li>
            <small style="display:block; opacity:0.6;">This Month Projection</small>
            <span style="font-weight:700; color: var(--accent-color);">₹${predictionData.currentMonthProjection}</span>
        </li>
        <li>
            <small style="display:block; opacity:0.6;">Recent Trend Factor</small>
            <span style="font-weight:600; color: ${analysis.trendFactor > 0 ? 'var(--danger-color)' : 'var(--success-color)'};">
                ${analysis.trendFactor > 0 ? '+' : ''}₹${analysis.trendFactor}
            </span>
        </li>
        <li>
            <small style="display:block; opacity:0.6;">Average (Last 3 Months)</small>
            <span style="font-weight:600;">₹${analysis.averageExpense}</span>
        </li>
        <li>
            <small style="display:block; opacity:0.6;">Confidence Level</small>
            <span style="font-weight:600; color: var(--accent-color);">${predictionData.confidence}</span>
        </li>
    `;
}

function renderUpcomingForecast() {
    const container = document.getElementById('upcoming-forecast-container');
    if(!container || !predictionData.upcoming) return;
    
    container.innerHTML = '';
    predictionData.upcoming.forEach(p => {
        const date = new Date(p.month + '-01');
        const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        const card = document.createElement('div');
        card.style.cssText = 'padding: 15px; background: rgba(255,255,255,0.03); border-radius: 12px; border-top: 3px solid var(--accent-color);';
        card.innerHTML = `
            <h5 style="margin-bottom: 10px; font-size: 0.9rem; opacity: 0.8;">${monthName}</h5>
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <div style="display: flex; justify-content: space-between;">
                    <small>Est. Expense</small>
                    <span style="font-weight: 700; color: var(--danger-color);">₹${p.estimatedExpense}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <small>Est. Income</small>
                    <span style="font-weight: 700; color: var(--success-color);">₹${p.estimatedIncome}</span>
                </div>
                <div style="border-top: 1px solid var(--border-color); margin-top: 5px; padding-top: 5px; display: flex; justify-content: space-between;">
                    <small>Est. Savings</small>
                    <span style="font-weight: 800; color: var(--accent-color);">₹${p.estimatedSavings}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function updateMonthSelector() {
    if(!monthSelector) return;
    
    // Get unique months from transactions
    const months = [...new Set(transactions.map(t => new Date(t.createdAt).toISOString().slice(0, 7)))];
    months.sort().reverse();
    
    monthSelector.innerHTML = '';
    months.forEach(m => {
        const date = new Date(m + '-01');
        const option = document.createElement('option');
        option.value = m;
        option.innerText = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        monthSelector.appendChild(option);
    });
    
    if (months.length > 0 && !months.includes(currentSelectedMonth)) {
        currentSelectedMonth = months[0];
    }
    monthSelector.value = currentSelectedMonth;
    updateMonthDisplay();
}

function updateMonthDisplay() {
    const date = new Date(currentSelectedMonth + '-01');
    const formattedDate = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    if(monthDisplay) monthDisplay.innerText = formattedDate;
    if(dashMonthDisplay) dashMonthDisplay.innerText = formattedDate;
    
    // Update budget input for the selected month if on profile page
    if(document.getElementById('budget-month-input')) {
        document.getElementById('budget-month-input').value = currentSelectedMonth;
        document.getElementById('budget-input').value = monthlyBudgets[currentSelectedMonth] || userBudget || 0;
    }
}

function updateMonthlyStats() {
    const stat = monthlySummaries[currentSelectedMonth] || { income: 0, expense: 0 };
    const savings = stat.income - stat.expense;
    const savingsRate = stat.income > 0 ? ((savings / stat.income) * 100).toFixed(1) : 0;

    document.getElementById('monthly-income-stat').innerText = `₹${stat.income.toFixed(2)}`;
    document.getElementById('monthly-expense-stat').innerText = `₹${stat.expense.toFixed(2)}`;
    document.getElementById('monthly-savings-stat').innerText = `₹${savings.toFixed(2)}`;
    document.getElementById('monthly-savings-rate-stat').innerText = `${savingsRate}%`;
}

if(prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
        const date = new Date(currentSelectedMonth + '-01');
        date.setMonth(date.getMonth() - 1);
        currentSelectedMonth = date.toISOString().slice(0, 7);
        monthSelector.value = currentSelectedMonth;
        updateMonthDisplay();
        updateMonthlyStats();
        init();
    });
}

if(nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
        navigateMonth(1);
    });
}

if(dashPrevMonthBtn) {
    dashPrevMonthBtn.addEventListener('click', () => {
        navigateMonth(-1);
    });
}

if(dashNextMonthBtn) {
    dashNextMonthBtn.addEventListener('click', () => {
        navigateMonth(1);
    });
}

function navigateMonth(step) {
    const date = new Date(currentSelectedMonth + '-01');
    date.setMonth(date.getMonth() + step);
    currentSelectedMonth = date.toISOString().slice(0, 7);
    if(monthSelector) monthSelector.value = currentSelectedMonth;
    updateMonthDisplay();
    updateMonthlyStats();
    init();
}

if(monthSelector) {
    monthSelector.addEventListener('change', (e) => {
        currentSelectedMonth = e.target.value;
        updateMonthDisplay();
        updateMonthlyStats();
        init();
    });
}

async function fetchProfile() {
    try {
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if(data.success) {
            document.getElementById('profile-name').innerText = data.data.name;
            document.getElementById('profile-email').innerText = data.data.email;
            document.getElementById('profile-role').innerText = data.data.role;
            userBudget = data.data.monthlyBudget || 0;
            monthlyBudgets = data.data.monthlyBudgets || {};
            categoryBudgets = data.data.categoryBudgets || {};
            
            document.getElementById('budget-month-input').value = currentSelectedMonth;
            document.getElementById('budget-input').value = monthlyBudgets[currentSelectedMonth] || userBudget || 0;
            
            updateCategoryBudgetsList();
            updateValues(); // Re-check budget alert
        }
    } catch (err) { console.error(err); }
}

function updateCategoryBudgetsList() {
    const list = document.getElementById('category-budgets-list');
    if(!list) return;
    list.innerHTML = '';
    
    for (const [cat, limit] of Object.entries(categoryBudgets)) {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; justify-content: space-between; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; font-size: 0.9rem;';
        item.innerHTML = `
            <span>${cat}</span>
            <span style="font-weight: 600;">₹${limit}</span>
        `;
        list.appendChild(item);
    }
}

const saveCategoryBudgetBtn = document.getElementById('save-category-budget-btn');
if(saveCategoryBudgetBtn) {
    saveCategoryBudgetBtn.addEventListener('click', async () => {
        const category = document.getElementById('budget-category-select').value;
        const budget = document.getElementById('category-budget-input').value;
        if(!budget) return alert('Enter a limit');
        
        try {
            const res = await fetch('/api/auth/category-budget', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ category, budget: +budget })
            });
            const data = await res.json();
            if(data.success) {
                categoryBudgets = data.data.categoryBudgets;
                alert(`Limit set for ${category} successfully!`);
                updateCategoryBudgetsList();
                renderReports();
            }
        } catch (err) { console.error(err); }
    });
}

const saveBudgetBtn = document.getElementById('save-budget-btn');
if(saveBudgetBtn) {
    saveBudgetBtn.addEventListener('click', async () => {
        const budgetInput = document.getElementById('budget-input').value;
        const monthInput = document.getElementById('budget-month-input').value;
        if(!monthInput) return alert('Please select a month');

        try {
            const res = await fetch('/api/auth/budget', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ budget: +budgetInput, month: monthInput })
            });
            const data = await res.json();
            if(data.success) {
                userBudget = data.data.monthlyBudget;
                monthlyBudgets = data.data.monthlyBudgets;
                alert(`Budget for ${monthInput} updated successfully!`);
                updateValues();
            }
        } catch (err) { console.error(err); }
    });
}

// Add transaction
if(form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!text.value || !amount.value || !category.value) return alert('Fill all fields');

        const transactionData = { 
            text: text.value, 
            amount: +amount.value, 
            category: category.value,
            createdAt: dateInput.value || new Date()
        };

        try {
            const isEdit = editId.value !== '';
            const url = isEdit ? `/api/transactions/${editId.value}` : '/api/transactions';
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(transactionData)
            });
            const data = await res.json();
            if(data.success) {
                if(isEdit) {
                    transactions = transactions.map(t => t._id === editId.value ? data.data : t);
                    resetForm();
                } else {
                    transactions.unshift(data.data);
                }
                init();
                text.value = ''; amount.value = ''; category.value = '';
                dateInput.valueAsDate = new Date();
                // Auto switch to Dashboard after adding
                document.querySelector('[data-target="dashboard-page"]').click();
            } else {
                alert(data.error);
            }
        } catch (err) { console.error(err); }
    });
}

function editTransaction(id) {
    const transaction = transactions.find(t => t._id === id);
    if(!transaction) return;

    text.value = transaction.text;
    amount.value = transaction.amount;
    category.value = transaction.category;
    dateInput.value = new Date(transaction.createdAt).toISOString().split('T')[0];
    editId.value = id;
    
    submitBtn.innerHTML = 'Update Transaction <i class="fas fa-save"></i>';
    cancelEditBtn.style.display = 'block';
    
    document.querySelector('[data-target="add-page"]').click();
}

if(cancelEditBtn) {
    cancelEditBtn.addEventListener('click', resetForm);
}

function resetForm() {
    editId.value = '';
    text.value = '';
    amount.value = '';
    category.value = '';
    dateInput.valueAsDate = new Date();
    submitBtn.innerHTML = 'Add Transaction <i class="fas fa-plus"></i>';
    cancelEditBtn.style.display = 'none';
}

// Remove transaction
async function removeTransaction(id) {
    if(!confirm("Are you sure you want to delete this?")) return;
    try {
        const res = await fetch(`/api/transactions/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if((await res.json()).success) {
            transactions = transactions.filter(t => t._id !== id);
            init();
            if(document.getElementById('reports-page').classList.contains('active')) renderReports();
        }
    } catch (err) { console.error(err); }
}

// DOM Rendering
function createTransactionEl(transaction) {
    const sign = transaction.amount < 0 ? '-' : '+';
    const li = document.createElement('li');
    li.classList.add(transaction.amount < 0 ? 'minus' : 'plus');
    li.innerHTML = `
        <div class="info">
            <span>${transaction.text}</span>
            <small>
                <i class="fas fa-tag"></i> ${transaction.category} 
                &nbsp;&bull;&nbsp; <i class="fas fa-calendar"></i> ${new Date(transaction.createdAt).toLocaleDateString()}
                &nbsp;&bull;&nbsp; <span style="color: ${transaction.amount < 0 ? 'var(--danger-color)' : 'var(--success-color)'}; font-weight: 600;">${transaction.amount < 0 ? 'Expense' : 'Income'}</span>
            </small>
        </div>
        <div class="amount-action">
            <span class="amount">${sign}₹${Math.abs(transaction.amount).toFixed(2)}</span>
            <div class="actions">
                <button class="action-btn edit-btn" onclick="editTransaction('${transaction._id}')"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" onclick="removeTransaction('${transaction._id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `;
    return li;
}

function updateValues() {
    if(!balance) return;

    // Filter transactions for the selected month
    const monthlyTransactions = transactions.filter(t => new Date(t.createdAt).toISOString().slice(0, 7) === currentSelectedMonth);
    
    const amounts = monthlyTransactions.map(t => t.amount);
    const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0).toFixed(2);
    const expense = (amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) * -1).toFixed(2);
    const monthlySavings = (parseFloat(income) - parseFloat(expense)).toFixed(2);

    balance.innerText = `₹${monthlySavings}`;
    money_plus.innerText = `+₹${income}`;
    money_minus.innerText = `-₹${expense}`;

    // Budget Alert Logic
    const alertBox = document.getElementById('budget-alert');
    const alertText = document.getElementById('budget-alert-text');
    
    // Get budget for the current selected month
    const currentBudget = monthlyBudgets[currentSelectedMonth] || userBudget || 0;

    if (currentBudget > 0 && parseFloat(expense) >= currentBudget) {
        const alertKey = `budgetAlert_${currentSelectedMonth}_${currentBudget}`;
        if (!window.sessionStorage.getItem(alertKey)) {
            const date = new Date(currentSelectedMonth + '-01');
            const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            alert(`⚠️ BUDGET EXCEEDED for ${monthName}!\nYou have exceeded your monthly limit of ₹${currentBudget}.`);
            window.sessionStorage.setItem(alertKey, 'true');
        }
    }

    if (currentBudget > 0 && alertBox && alertText) {
        if (parseFloat(expense) >= currentBudget) {
            alertBox.style.display = 'block';
            alertText.innerText = `You have exceeded your budget for ${currentSelectedMonth} (₹${currentBudget})!`;
        } else if (parseFloat(expense) >= currentBudget * 0.8) {
            alertBox.style.display = 'block';
            alertText.innerText = `Warning: You have reached ${((parseFloat(expense) / currentBudget) * 100).toFixed(1)}% of your budget for ${currentSelectedMonth} (₹${currentBudget}).`;
        } else {
            alertBox.style.display = 'none';
        }
    } else if (alertBox) {
        alertBox.style.display = 'none';
    }

    // Category Budget Pop-up Check
    const catExpenses = {};
    monthlyTransactions.filter(t => t.amount < 0).forEach(t => {
        catExpenses[t.category] = (catExpenses[t.category] || 0) + Math.abs(t.amount);
    });

    for (const [cat, limit] of Object.entries(categoryBudgets)) {
        if (limit > 0 && (catExpenses[cat] || 0) > limit) {
            const alertKey = `catAlert_${cat}_${currentSelectedMonth}_${limit}`;
            if (!window.sessionStorage.getItem(alertKey)) {
                alert(`🚨 CATEGORY LIMIT EXCEEDED in ${currentSelectedMonth}!\nYou spent ₹${catExpenses[cat].toFixed(2)} on ${cat}, exceeding your ₹${limit} limit.`);
                window.sessionStorage.setItem(alertKey, 'true');
            }
        }
    }
}

function renderReports() {
    const container = document.getElementById('reports-container');
    container.innerHTML = '';
    
    // Group expenses by category
    const expenses = transactions.filter(t => t.amount < 0);
    const totalExpense = expenses.reduce((acc, t) => acc + Math.abs(t.amount), 0);
    
    if (totalExpense === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No expenses recorded yet.</p>';
        return;
    }

    const categories = {};
    expenses.forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + Math.abs(t.amount);
    });

    for (let cat in categories) {
        const amount = categories[cat];
        const limit = categoryBudgets[cat] || 0;
        const percentage = limit > 0 ? Math.min(100, (amount / limit) * 100).toFixed(1) : ((amount / totalExpense) * 100).toFixed(1);
        
        const isOverBudget = limit > 0 && amount > limit;

        const div = document.createElement('div');
        div.className = 'category-bar';
        div.innerHTML = `
            <div class="category-info">
                <span>${cat} ${limit > 0 ? `<small style="opacity: 0.7;">(Limit: ₹${limit})</small>` : ''}</span>
                <span style="color: ${isOverBudget ? 'var(--danger-color)' : 'inherit'}">₹${amount.toFixed(2)} (${percentage}%)</span>
            </div>
            <div class="progress-bg">
                <div class="progress-fill" style="width: ${percentage}%; background: ${isOverBudget ? 'var(--danger-color)' : 'var(--accent-color)'}"></div>
            </div>
        `;
        container.appendChild(div);
    }
}

function init() {
    if(dashboardList) dashboardList.innerHTML = '';
    if(fullList) fullList.innerHTML = '';
    
    // Filter transactions for the full list
    let filtered = transactions.filter(t => new Date(t.createdAt).toISOString().slice(0, 7) === currentSelectedMonth);
    
    if(searchInput && searchInput.value) {
        filtered = filtered.filter(t => t.text.toLowerCase().includes(searchInput.value.toLowerCase()));
    }
    
    if(filterCategory && filterCategory.value !== 'all') {
        filtered = filtered.filter(t => t.category === filterCategory.value);
    }
    
    if(filterDate && filterDate.value) {
        filtered = filtered.filter(t => new Date(t.createdAt).toISOString().split('T')[0] === filterDate.value);
    }

    // Dashboard shows max 5 (unfiltered recent)
    if(dashboardList) transactions.slice(0, 5).forEach(t => dashboardList.appendChild(createTransactionEl(t)));
    // Full list shows filtered
    if(fullList) {
        if(filtered.length === 0) {
            fullList.innerHTML = '<li style="text-align:center; opacity:0.7; grid-column: 1/-1;">No transactions found for this month</li>';
        } else {
            filtered.forEach(t => fullList.appendChild(createTransactionEl(t)));
        }
    }
    
    updateValues();
    renderTrendChart();
    renderSavingsTrendChart();
    renderSavingsInsights();
    renderMonthlyTable();
}

function renderMonthlyTable() {
    const tableBody = document.getElementById('monthly-summary-table');
    if(!tableBody) return;
    tableBody.innerHTML = '';

    const keys = Object.keys(monthlySummaries).sort().reverse();
    
    if(keys.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; opacity: 0.6;">No data available</td></tr>';
        return;
    }

    keys.forEach(k => {
        const data = monthlySummaries[k];
        const date = new Date(k + '-01');
        const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        const savings = data.income - data.expense;
        const savingsRate = data.income > 0 ? ((savings / data.income) * 100).toFixed(1) : 0;

        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--border-color)';
        row.innerHTML = `
            <td style="padding: 15px; font-weight: 600;">${monthName}</td>
            <td style="padding: 15px; color: var(--success-color);">+₹${data.income.toFixed(2)}</td>
            <td style="padding: 15px; color: var(--danger-color);">-₹${data.expense.toFixed(2)}</td>
            <td style="padding: 15px; font-weight: 700; color: ${savings >= 0 ? 'var(--accent-color)' : 'var(--danger-color)'}">₹${savings.toFixed(2)}</td>
            <td style="padding: 15px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="flex: 1; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; width: ${Math.max(0, Math.min(100, savingsRate))}%; background: ${savingsRate >= 20 ? 'var(--success-color)' : (savingsRate > 0 ? 'var(--accent-color)' : 'var(--danger-color)')};"></div>
                    </div>
                    <span style="font-size: 0.85rem; font-weight: 600;">${savingsRate}%</span>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function renderTrendChart() {
    const container = document.getElementById('monthly-trend-container');
    if(!container) return;
    container.innerHTML = '';

    const keys = Object.keys(monthlySummaries).sort().slice(-6); // Last 6 months
    if(keys.length === 0) {
        container.innerHTML = '<p style="opacity: 0.7;">Not enough data for trend analysis</p>';
        return;
    }

    const maxExpense = Math.max(...keys.map(k => monthlySummaries[k].expense), predictionData.estimatedExpense || 0, 1);

    keys.forEach(k => {
        const data = monthlySummaries[k];
        const height = (data.expense / maxExpense) * 100;
        const date = new Date(k + '-01');
        const monthName = date.toLocaleString('default', { month: 'short' });

        const barWrapper = document.createElement('div');
        barWrapper.style.cssText = 'flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; gap: 10px;';
        
        barWrapper.innerHTML = `
            <span style="font-size: 0.7rem; opacity: 0.8;">₹${data.expense.toFixed(0)}</span>
            <div style="width: 100%; height: ${height}%; background: var(--accent-color); border-radius: 8px 8px 0 0; min-height: 5px; transition: height 1s ease;"></div>
            <span style="font-weight: 600; font-size: 0.8rem;">${monthName}</span>
        `;
        container.appendChild(barWrapper);
    });

    // Add Prediction Bars (Upcoming Months)
    if (predictionData.upcoming && predictionData.upcoming.length > 0) {
        predictionData.upcoming.forEach((p, index) => {
            const date = new Date(p.month + '-01');
            const monthName = date.toLocaleString('default', { month: 'short' });
            const height = (p.estimatedExpense / maxExpense) * 100;

            const predWrapper = document.createElement('div');
            predWrapper.style.cssText = `flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; gap: 10px; opacity: ${0.8 - (index * 0.15)};`;
            
            predWrapper.innerHTML = `
                <span style="font-size: 0.7rem; color: var(--accent-color); font-weight: 700;">₹${Math.round(p.estimatedExpense)}</span>
                <div style="width: 100%; height: ${height}%; background: linear-gradient(to top, var(--accent-color), #ec4899); border-radius: 8px 8px 0 0; border: 2px dashed rgba(255,255,255,0.3); min-height: 5px; transition: height 1s ease;"></div>
                <span style="font-weight: 700; font-size: 0.7rem; color: var(--accent-color);">${monthName}🔮</span>
            `;
            container.appendChild(predWrapper);
        });
    }
}

function renderSavingsTrendChart() {
    const container = document.getElementById('savings-trend-container');
    if(!container) return;
    container.innerHTML = '';

    const keys = Object.keys(monthlySummaries).sort().slice(-6); // Last 6 months
    if(keys.length === 0) {
        container.innerHTML = '<p style="opacity: 0.7;">Not enough data for savings trend analysis</p>';
        return;
    }

    const savingsData = keys.map(k => monthlySummaries[k].income - monthlySummaries[k].expense);
    const maxSavings = Math.max(...savingsData, 1);
    
    keys.forEach((k, i) => {
        const savings = savingsData[i];
        const height = Math.abs(savings / maxSavings) * 100;
        const date = new Date(k + '-01');
        const monthName = date.toLocaleString('default', { month: 'short' });

        const barWrapper = document.createElement('div');
        barWrapper.style.cssText = 'flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; gap: 10px;';
        
        const isPositive = savings >= 0;
        const barColor = isPositive ? 'var(--success-color)' : 'var(--danger-color)';

        barWrapper.innerHTML = `
            <span style="font-size: 0.7rem; opacity: 0.8; font-weight: 700; color: ${barColor}">${isPositive ? '+' : ''}₹${savings.toFixed(0)}</span>
            <div style="width: 100%; height: ${Math.max(5, height)}%; background: ${barColor}; border-radius: 8px 8px 0 0; min-height: 5px; transition: height 1s ease; box-shadow: 0 4px 15px ${isPositive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'};"></div>
            <span style="font-weight: 600; font-size: 0.8rem;">${monthName}</span>
        `;
        container.appendChild(barWrapper);
    });
}

// Add event listeners for search/filter
if(searchInput) searchInput.addEventListener('input', init);
if(filterCategory) filterCategory.addEventListener('change', init);
if(filterDate) filterDate.addEventListener('input', init);

// Quick Add Form on Reports Page
const quickAddForm = document.getElementById('quick-add-form');
if(quickAddForm) {
    quickAddForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const qText = document.getElementById('quick-text');
        const qAmount = document.getElementById('quick-amount');
        const qCategory = document.getElementById('quick-category');

        const transactionData = { 
            text: qText.value, 
            amount: +qAmount.value, 
            category: qCategory.value,
            createdAt: new Date()
        };

        try {
            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(transactionData)
            });
            const data = await res.json();
            if(data.success) {
                transactions.unshift(data.data);
                init();
                renderReports();
                qText.value = ''; qAmount.value = '';
                alert('Transaction added quickly!');
            }
        } catch (err) { console.error(err); }
    });
}

getTransactions();
fetchProfile();

function renderSavingsInsights() {
    const container = document.getElementById('savings-insights');
    const textEl = document.getElementById('savings-insight-text');
    if(!container || !textEl) return;

    const keys = Object.keys(monthlySummaries).sort();
    if(keys.length === 0) return;

    container.style.display = 'block';
    
    let maxSavings = -Infinity;
    let bestMonth = '';
    let totalSavings = 0;
    let totalIncome = 0;

    keys.forEach(k => {
        const data = monthlySummaries[k];
        const savings = data.income - data.expense;
        if(savings > maxSavings) {
            maxSavings = savings;
            bestMonth = k;
        }
        totalSavings += savings;
        totalIncome += data.income;
    });

    const avgSavingsRate = totalIncome > 0 ? ((totalSavings / totalIncome) * 100).toFixed(1) : 0;
    const bestMonthDate = new Date(bestMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' });

    textEl.innerHTML = `
        Your best month was <strong>${bestMonthDate}</strong> with a total saving of <strong>₹${maxSavings.toFixed(2)}</strong>. 
        Overall, your average savings rate is <strong>${avgSavingsRate}%</strong>. 
        ${avgSavingsRate >= 20 ? 'Great job! You are maintaining a healthy savings habit.' : 'Try to aim for a 20% savings rate for better financial security.'}
    `;
}
