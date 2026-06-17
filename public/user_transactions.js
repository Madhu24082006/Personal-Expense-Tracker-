const token = localStorage.getItem('token');
if (!token || localStorage.getItem('role') !== 'admin') {
    window.location.href = '/login.html';
}

const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('userId');

if (!userId) {
    alert('User ID not provided');
    window.location.href = '/admin.html';
}

const transactionsList = document.getElementById('user-transactions-list');
const moneyPlus = document.getElementById('money-plus');
const moneyMinus = document.getElementById('money-minus');
const userNameTitle = document.getElementById('user-name-title');

async function getUserDetails() {
    try {
        const res = await fetch(`/api/admin/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            userNameTitle.innerText = `${data.data.name}'s Transactions`;
        } else {
            userNameTitle.innerText = 'User Not Found';
        }
    } catch (err) {
        console.error(err);
    }
}

async function getUserTransactions() {
    try {
        const res = await fetch(`/api/admin/users/${userId}/transactions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
            const transactions = data.data;
            transactionsList.innerHTML = '';
            
            if(transactions.length === 0) {
                transactionsList.innerHTML = '<li style="text-align:center; padding: 20px; opacity: 0.7;">No transactions found.</li>';
                return;
            }

            let income = 0;
            let expense = 0;

            transactions.forEach(t => {
                if (t.amount > 0) {
                    income += t.amount;
                } else {
                    expense += Math.abs(t.amount);
                }

                const sign = t.amount < 0 ? '-' : '+';
                const li = document.createElement('li');
                li.classList.add(t.amount < 0 ? 'minus' : 'plus');
                li.innerHTML = `
                    <div class="info">
                        <span>${t.text}</span>
                        <small><i class="fas fa-tag"></i> ${t.category} &nbsp;&bull;&nbsp; ${new Date(t.createdAt).toLocaleDateString()}</small>
                    </div>
                    <div class="amount-action">
                        <span class="amount">${sign}₹${Math.abs(t.amount).toFixed(2)}</span>
                    </div>
                `;
                transactionsList.appendChild(li);
            });

            moneyPlus.innerText = `+₹${income.toFixed(2)}`;
            moneyMinus.innerText = `-₹${expense.toFixed(2)}`;
        }
    } catch (err) {
        console.error(err);
    }
}

getUserDetails();
getUserTransactions();
