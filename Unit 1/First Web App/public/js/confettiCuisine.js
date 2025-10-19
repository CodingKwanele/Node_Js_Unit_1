/**
 * Confetti Cuisine - Main JavaScript File
 * Handles all interactive functionality for both index.html and contact.html
 */

class App {
  constructor() {
    this.init();
  }

  async init() {
    try {
      // Initialize all components
      this.setupEventListeners();
      this.setActiveNavLink();
      this.enableSmoothScroll();
      
      // Page-specific initializations
      if (document.querySelector('form')) {
        this.setupFormHandler();
      }
      
      if (document.querySelector('.counter')) {
        this.setupCounters();
      }
      
      if (document.querySelector('.testimonial-card')) {
        this.setupTestimonialInteractions();
      }
      
      this.setupScrollAnimations();
      this.setupMobileMenu();
      
    } catch (error) {
      console.error('App initialization error:', error);
      this.showAlert('Failed to initialize page features', 'error');
    }
  }

  setupEventListeners() {
    // Global event listeners
    document.addEventListener('click', this.handleGlobalClicks.bind(this));
  }

  // ==================== FORM HANDLING ====================
  setupFormHandler() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      form.addEventListener('submit', this.handleFormSubmit.bind(this));
      
      // Add real-time validation
      form.querySelectorAll('input, textarea, select').forEach(input => {
        input.addEventListener('blur', this.validateField.bind(this));
      });
    });
  }

  async handleFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formId = form.id || 'generic-form';
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Get all form data (works with any form structure)
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    if (!this.validateForm(data, formId)) return;
    
    // UI feedback during submission
    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      Processing...
    `;
    
    try {
      // In production, replace with actual fetch:
      // const response = await fetch(form.action, {
      //   method: form.method,
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data)
      // });
      
      await this.simulateSubmission(data);
      
      this.showSuccessMessage(form, data.name || 'there');
      
      // Special handling for newsletter forms
      if (formId.includes('newsletter')) {
        form.reset();
      }
    } catch (error) {
      this.showAlert('Submission failed. Please try again.', 'error');
      console.error('Form submission error:', error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHTML;
    }
  }

  validateForm(data, formId) {
    // Generic validation that works for all forms
    let isValid = true;
    
    // Check required fields
    document.querySelectorAll(`#${formId} [required]`).forEach(field => {
      if (!data[field.name]?.trim()) {
        this.markFieldInvalid(field);
        isValid = false;
      }
    });
    
    // Email validation if present
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      this.markFieldInvalid(document.querySelector(`#${formId} [name="email"]`));
      this.showAlert('Please enter a valid email address', 'error');
      isValid = false;
    }
    
    // Message validation for contact form
    if (formId === 'contactForm' && data.message?.length < 10) {
      this.markFieldInvalid(document.querySelector(`#${formId} [name="message"]`));
      this.showAlert('Message should be at least 10 characters', 'error');
      isValid = false;
    }
    
    return isValid;
  }

  validateField(event) {
    const field = event.target;
    if (field.required && !field.value.trim()) {
      this.markFieldInvalid(field);
    } else {
      this.markFieldValid(field);
      
      // Special validation for email fields
      if (field.type === 'email' && !this.validateEmail(field.value)) {
        this.markFieldInvalid(field);
      }
    }
  }

  markFieldInvalid(field) {
    field.classList.add('is-invalid');
    field.classList.remove('is-valid');
  }

  markFieldValid(field) {
    field.classList.add('is-valid');
    field.classList.remove('is-invalid');
  }

  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async simulateSubmission(data) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Form would submit:', data);
        resolve();
      }, 1500);
    });
  }

  showSuccessMessage(form, name) {
    const successMsg = document.createElement('div');
    successMsg.className = 'alert alert-success mt-4';
    successMsg.innerHTML = `
      <h4>Thank you, ${name}!</h4>
      <p class="mb-0">Your submission was successful. We'll be in touch soon!</p>
    `;
    
    form.parentNode.insertBefore(successMsg, form.nextSibling);
    
    setTimeout(() => {
      successMsg.style.transition = 'opacity 0.5s';
      successMsg.style.opacity = '0';
      setTimeout(() => successMsg.remove(), 500);
    }, 5000);
  }

  // ==================== UI COMPONENTS ====================
  showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show fixed-top mt-3 mx-auto`;
    alertDiv.style.maxWidth = '600px';
    alertDiv.style.zIndex = '1000';
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
      alertDiv.classList.remove('show');
      setTimeout(() => alertDiv.remove(), 150);
    }, 5000);
  }

  setupCounters() {
    const counters = document.querySelectorAll('.counter');
    const options = {
      threshold: 0.5,
      rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, options);
    
    counters.forEach(counter => observer.observe(counter));
  }

  animateCounter(counter) {
    const target = +counter.getAttribute('data-target');
    const duration = 2000;
    const start = 0;
    const increment = target / (duration / 16);
    
    const updateCount = () => {
      const current = +counter.textContent;
      if (current < target) {
        counter.textContent = Math.ceil(current + increment);
        setTimeout(updateCount, 16);
      } else {
        counter.textContent = target;
      }
    };
    
    updateCount();
  }

  setupTestimonialInteractions() {
    document.querySelectorAll('.testimonial-card').forEach(card => {
      card.addEventListener('click', () => {
        card.classList.toggle('active');
      });
    });
  }

  // ==================== NAVIGATION & SCROLLING ====================
  setActiveNavLink() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
      const linkPath = link.getAttribute('href').split('/').pop();
      link.classList.toggle('active', linkPath === currentPath);
    });
  }

  enableSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (targetId !== '#') {
          e.preventDefault();
          const target = document.querySelector(targetId);
          if (target) {
            target.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
            
            // Update URL without jumping
            if (history.pushState) {
              history.pushState(null, null, targetId);
            }
          }
        }
      });
    });
  }

  setupScrollAnimations() {
    const animateElements = document.querySelectorAll('.animate-on-scroll');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
        }
      });
    }, { threshold: 0.1 });
    
    animateElements.forEach(el => observer.observe(el));
  }

  setupMobileMenu() {
    const toggler = document.querySelector('.navbar-toggler');
    if (toggler) {
      toggler.addEventListener('click', () => {
        document.body.classList.toggle('mobile-menu-open');
      });
    }
  }

  // ==================== GLOBAL EVENT HANDLERS ====================
  handleGlobalClicks(event) {
    // Handle dropdown toggles
    if (event.target.matches('.dropdown-toggle')) {
      this.toggleDropdown(event.target);
    }
    
    // Close dropdowns when clicking outside
    if (!event.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.remove('show');
      });
    }
  }

  toggleDropdown(button) {
    const menu = button.nextElementSibling;
    menu.classList.toggle('show');
  }
}

// Initialize the app when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  new App();
});

// Add polyfills for older browsers if needed
if (!String.prototype.includes) {
  String.prototype.includes = function() {
    return String.prototype.indexOf.apply(this, arguments) !== -1;
  };
}