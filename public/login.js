const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authBtn = document.getElementById('auth-btn');
const toggleAuth = document.getElementById('toggle-auth');
const registerFields = document.getElementById('register-fields');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const roleInput = document.getElementById('role');

let isLogin = true;

toggleAuth.addEventListener('click', () => {
    isLogin = !isLogin;
    if (isLogin) {
        authTitle.innerText = 'Login';
        authBtn.innerText = 'Login';
        toggleAuth.innerText = 'Need an account? Register';
        registerFields.style.display = 'none';
        nameInput.required = false;
    } else {
        authTitle.innerText = 'Register';
        authBtn.innerText = 'Register';
        toggleAuth.innerText = 'Already have an account? Login';
        registerFields.style.display = 'block';
        nameInput.required = true;
    }
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    const body = {
        email: emailInput.value,
        password: passwordInput.value
    };

    if (!isLogin) {
        body.name = nameInput.value;
        if(roleInput) body.role = roleInput.value;
    }

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);
            if (data.role === 'admin') {
                window.location.href = '/admin.html';
            } else {
                window.location.href = '/index.html';
            }
        } else {
            alert(data.error);
        }
    } catch (err) {
        console.error(err);
        alert('An error occurred');
    }
});
