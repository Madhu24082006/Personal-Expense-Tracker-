const userList = document.getElementById('user-list');
const logoutBtn = document.getElementById('logout-btn');

const token = localStorage.getItem('token');
const role = localStorage.getItem('role');

if (!token) {
    window.location.href = '/login.html';
} else if (role !== 'admin') {
    window.location.href = '/index.html';
}

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/login.html';
});

async function getUsers() {
    try {
        const res = await fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
            userList.innerHTML = '';
            data.data.forEach(user => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="info">
                        <span>${user.name}</span>
                        <small>${user.email}</small>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button class="view-btn" onclick="window.location.href='/user_transactions.html?userId=${user._id}'" style="opacity:1; transform:none; position:relative; right:0; background:var(--accent-color); color:#fff; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;"><i class="fas fa-eye"></i> View</button>
                        <button class="delete-btn" onclick="deleteUser('${user._id}')" style="opacity:1; transform:none; position:relative; right:0;"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                userList.appendChild(li);
            });
        }
    } catch (err) {
        console.error(err);
    }
}

async function deleteUser(id) {
    if(!confirm('Are you sure you want to delete this user?')) return;
    try {
        const res = await fetch(`/api/admin/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if(data.success) {
            getUsers();
        } else {
            alert('Failed to delete user');
        }
    } catch (err) {
        console.error(err);
    }
}

getUsers();

async function getStats() {
    try {
        const res = await fetch('/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
            document.getElementById('stat-users').innerText = data.data.totalUsers;
            document.getElementById('stat-transactions').innerText = data.data.totalTransactions;
            document.getElementById('stat-income').innerText = `+₹${data.data.totalIncome.toFixed(2)}`;
            document.getElementById('stat-expense').innerText = `-₹${data.data.totalExpense.toFixed(2)}`;
        }
    } catch (err) {
        console.error(err);
    }
}

getStats();
