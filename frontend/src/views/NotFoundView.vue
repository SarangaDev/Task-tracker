<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <div class="container not-found-container animate-fade-in">
    <div class="abstract-shape shape-1"></div>
    <div class="abstract-shape shape-2"></div>
    
    <div class="glass-panel text-center not-found-card">
      <div class="error-visual">
        <h1 class="error-code float-animation">404</h1>
      </div>
      <h2>Lost in Space?</h2>
      <p class="text-muted">
        We can't seem to find the page you're looking for. <br/>
        It might have been removed, renamed, or perhaps it never existed!
      </p>
      
      <button class="btn btn-primary mt-4 pulse-hover" @click="router.push('/')">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-left"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Take Me Back Home
      </button>
    </div>
  </div>
</template>

<style scoped>
.not-found-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 75vh;
  position: relative;
  overflow: hidden;
}

/* Abstract Background Shapes for Modern Vibe */
.abstract-shape {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  z-index: -1;
  opacity: 0.5;
}

.shape-1 {
  width: 300px;
  height: 300px;
  background: var(--accent-primary);
  top: -10%;
  left: 20%;
  animation: pulse-slow 8s infinite alternate ease-in-out;
}

.shape-2 {
  width: 400px;
  height: 400px;
  background: var(--accent-secondary);
  bottom: -20%;
  right: 15%;
  animation: pulse-slow 10s infinite alternate-reverse ease-in-out;
}

@keyframes pulse-slow {
  0% { transform: scale(1) translate(0, 0); opacity: 0.4; }
  100% { transform: scale(1.1) translate(20px, 30px); opacity: 0.7; }
}

.not-found-card {
  padding: 60px 40px;
  max-width: 550px;
  width: 100%;
  position: relative;
  z-index: 10;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.error-visual {
  position: relative;
  margin-bottom: 20px;
}

.error-code {
  font-size: 8rem;
  font-weight: 800;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
  text-shadow: 0 10px 30px rgba(112, 0, 255, 0.3);
}

.float-animation {
  animation: float 4s ease-in-out infinite;
}

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0px); }
}

h2 {
  font-size: 2.2rem;
  margin-bottom: 16px;
  color: var(--text-main);
  letter-spacing: -0.03em;
}

.text-muted {
  font-size: 1.1rem;
  margin-bottom: 30px;
  line-height: 1.6;
}

.mt-4 {
  margin-top: 24px;
}

.icon-left {
  margin-right: 8px;
  vertical-align: middle;
}

.pulse-hover:hover {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(0, 240, 255, 0.5); }
  70% { box-shadow: 0 0 0 10px rgba(0, 240, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 240, 255, 0); }
}
</style>
