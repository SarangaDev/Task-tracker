<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '../stores/auth.store';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const name = ref('');
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const showPassword = ref(false);

watch([name, email, password], () => {
  if (error.value) error.value = '';
});

const passwordLengthValid = computed(() => password.value.length >= 8);
const passwordUpperValid = computed(() => /[A-Z]/.test(password.value));
const passwordLowerValid = computed(() => /[a-z]/.test(password.value));
const passwordNumberValid = computed(() => /\d/.test(password.value));

const passwordValid = computed(() => 
  passwordLengthValid.value && 
  passwordUpperValid.value && 
  passwordLowerValid.value && 
  passwordNumberValid.value
);

const handleRegister = async () => {
  if (!passwordValid.value) return;
  error.value = '';
  loading.value = true;
  try {
    await authStore.register({ name: name.value, email: email.value, password: password.value });
    router.push('/');
  } catch (err: unknown) {
    const e = err as { response?: { data?: { errors?: { message: string }[] } } };
    if (e.response?.data?.errors) {
      error.value = e.response.data.errors.map((errItem) => errItem.message).join(', ');
    } else {
      error.value = 'Registration failed';
    }
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="container auth-container animate-fade-in">
    <div class="glass-panel auth-card">
      <h2>Create Account</h2>
      <p class="subtitle">Start organizing your tasks today</p>

      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="name">Full Name</label>
          <input type="text" id="name" v-model="name" required placeholder="John Doe" />
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" v-model="email" required placeholder="you@example.com" />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <div class="password-input-wrapper">
            <input 
              :type="showPassword ? 'text' : 'password'" 
              id="password" 
              v-model="password" 
              required 
              placeholder="••••••••" 
            />
            <button 
              type="button" 
              class="password-toggle"
              @click="showPassword = !showPassword"
              title="Toggle password visibility"
            >
              <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            </button>
          </div>
          <div class="password-requirements" v-if="password.length > 0">
            <div :class="['req-item', { valid: passwordLengthValid }]">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline v-if="passwordLengthValid" points="20 6 9 17 4 12"></polyline>
                <circle v-else cx="12" cy="12" r="10"></circle>
              </svg>
              8+ characters
            </div>
            <div :class="['req-item', { valid: passwordUpperValid }]">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline v-if="passwordUpperValid" points="20 6 9 17 4 12"></polyline>
                <circle v-else cx="12" cy="12" r="10"></circle>
              </svg>
              One uppercase letter
            </div>
            <div :class="['req-item', { valid: passwordLowerValid }]">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline v-if="passwordLowerValid" points="20 6 9 17 4 12"></polyline>
                <circle v-else cx="12" cy="12" r="10"></circle>
              </svg>
              One lowercase letter
            </div>
            <div :class="['req-item', { valid: passwordNumberValid }]">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline v-if="passwordNumberValid" points="20 6 9 17 4 12"></polyline>
                <circle v-else cx="12" cy="12" r="10"></circle>
              </svg>
              One number
            </div>
          </div>
        </div>

        <div v-if="error" class="error-msg">{{ error }}</div>

        <button type="submit" class="btn btn-primary w-100" :disabled="loading || !name || !email || !passwordValid">
          {{ loading ? 'Signing up...' : 'Sign Up' }}
        </button>
      </form>

      <p class="switch-auth">
        Already have an account? <router-link to="/login">Log in</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 70vh;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  text-align: center;
}

.auth-card h2 {
  font-size: 2rem;
  margin-bottom: 8px;
}

.subtitle {
  color: var(--text-muted);
  margin-bottom: 32px;
}

form {
  text-align: left;
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input-wrapper input {
  padding-right: 40px; /* Make room for the eye icon */
}

.password-toggle {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.password-toggle:hover {
  color: #fff;
}

.password-requirements {
  margin-top: 12px;
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.req-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  transition: color 0.2s ease;
}

.req-item svg {
  opacity: 0.5;
  transition: opacity 0.2s ease, stroke 0.2s ease;
}

.req-item.valid {
  color: var(--success, #00f0ff);
}

.req-item.valid svg {
  opacity: 1;
  stroke: var(--success, #00f0ff);
}

.w-100 {
  width: 100%;
  margin-top: 16px;
}

.error-msg {
  color: var(--danger);
  font-size: 0.9rem;
  margin-top: 8px;
  text-align: center;
}

.switch-auth {
  margin-top: 24px;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.switch-auth a {
  color: var(--accent-primary);
  text-decoration: none;
  font-weight: 500;
}

.switch-auth a:hover {
  text-decoration: underline;
}
</style>
