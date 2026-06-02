/**
 * NÜA Wellness Spa - Interactive Booking System
 * Manages appointment CRUD using localStorage and renders premium UI components
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize UI Elements dynamically
    injectUiElements();

    // Cache DOM Elements
    const modalOverlay = document.getElementById('nuaModalOverlay');
    const modalClose = document.getElementById('nuaModalClose');
    const floatingBtn = document.getElementById('nuaFloatingBtn');
    const apptsListContainer = document.getElementById('nuaApptsList');

    // 2. Load and Bind Appointments
    updateBadges();

    // Event Listeners for Modal
    if (floatingBtn) {
        floatingBtn.addEventListener('click', () => {
            renderAppointments();
            openModal();
        });
    }

    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });
    }

    // Bind Navbar link if present
    document.querySelectorAll('.nav-item-nua-gold').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            renderAppointments();
            openModal();
        });
    });

    // Auto-select service from URL parameter (e.g. ?service=Essential)
    const urlParams = new URLSearchParams(window.location.search);
    const serviceParam = urlParams.get('service');
    if (serviceParam) {
        const selectElement = document.querySelector('.nua-service');
        if (selectElement) {
            // Find option with matching value
            const option = selectElement.querySelector(`option[value="${serviceParam}"]`);
            if (option) {
                selectElement.value = serviceParam;
            }
        }
    }

    // 3. Intercept Booking Forms
    bindBookingForms();

    // 4. Intercept Newsletter Forms
    bindNewsletterForms();

    /* ==========================================
       Core Functions
       ========================================== */

    // Open/Close Modal
    function openModal() {
        modalOverlay.style.display = 'flex';
        setTimeout(() => {
            modalOverlay.classList.add('show');
        }, 10);
    }

    function closeModal() {
        modalOverlay.classList.remove('show');
        setTimeout(() => {
            modalOverlay.style.display = 'none';
        }, 300);
    }

    // Bind all forms with class 'nua-booking-form'
    function bindBookingForms() {
        const forms = document.querySelectorAll('.nua-booking-form');
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();

                // Retrieve inputs safely
                const nameInput = form.querySelector('.nua-name');
                const emailInput = form.querySelector('.nua-email');
                const dateInput = form.querySelector('.nua-date');
                const timeInput = form.querySelector('.nua-time');
                const serviceSelect = form.querySelector('.nua-service');

                // Validations
                if (!nameInput || !emailInput || !dateInput || !timeInput || !serviceSelect) {
                    showNuaToast('Error interno al procesar el formulario.', 'error');
                    return;
                }

                const name = nameInput.value.trim();
                const email = emailInput.value.trim();
                const date = dateInput.value.trim();
                const time = timeInput.value.trim();
                const serviceText = serviceSelect.options[serviceSelect.selectedIndex].text;
                const serviceValue = serviceSelect.value;

                if (!name || !email || !date || !time) {
                    showNuaToast('Por favor, completa todos los campos obligatorios.', 'error');
                    return;
                }

                if (serviceValue === '' || serviceText.includes('Selecciona')) {
                    showNuaToast('Por favor, selecciona un servicio válido.', 'error');
                    return;
                }

                // Email check
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    showNuaToast('Por favor, ingresa un correo electrónico válido.', 'error');
                    return;
                }

                // Date checks (Future check)
                const parts = date.split('/');
                let selectedDate;
                if (parts.length === 3) {
                    // Expecting MM/DD/YYYY from Tempus Dominus
                    selectedDate = new Date(parts[2], parts[0] - 1, parts[1]);
                } else {
                    selectedDate = new Date(date);
                }

                const today = new Date();
                today.setHours(0,0,0,0);

                if (selectedDate < today) {
                    showNuaToast('No es posible agendar citas en fechas pasadas.', 'error');
                    return;
                }

                // Create appointment object
                const appointment = {
                    id: 'nua_' + Date.now(),
                    name: name,
                    email: email,
                    date: date,
                    time: time,
                    service: serviceText,
                    createdAt: new Date().toISOString()
                };

                // Save to localStorage
                const appts = getAppointmentsFromStorage();
                appts.push(appointment);
                localStorage.setItem('nua_appointments', JSON.stringify(appts));

                // Reset form fields
                form.reset();
                if (form.querySelector('.datetimepicker-input')) {
                    // Reset widget values if possible
                    $(nameInput).val('');
                    $(emailInput).val('');
                }

                // UI Updates
                updateBadges();
                showNuaToast(`¡Cita agendada con éxito para ${serviceText}!`, 'success');
                
                // Track modal update
                renderAppointments();
            });
        });
    }

    // Bind Newsletter Subscriptions
    function bindNewsletterForms() {
        const newsletterInputs = document.querySelectorAll('.footer input[type="text"]');
        newsletterInputs.forEach(input => {
            const container = input.closest('.input-group');
            if (container) {
                const btn = container.querySelector('button');
                if (btn) {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const email = input.value.trim();
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                        if (!email || !emailRegex.test(email)) {
                            showNuaToast('Por favor, ingresa un correo de suscripción válido.', 'error');
                            return;
                        }

                        showNuaToast('¡Te has suscrito con éxito a nuestro boletín de lujo!', 'success');
                        input.value = '';
                    });
                }
            }
        });
    }

    // Render list in modal
    function renderAppointments() {
        const appts = getAppointmentsFromStorage();
        apptsListContainer.innerHTML = '';

        if (appts.length === 0) {
            apptsListContainer.innerHTML = `
                <div class="nua-no-appointments">
                    <div class="nua-no-appointments-icon"><i class="fas fa-calendar-minus"></i></div>
                    <p style="color: rgba(255, 255, 255, 0.6); margin-bottom: 0;">No tienes citas agendadas por el momento.</p>
                    <p style="font-size: 0.8rem; color: rgba(197, 168, 128, 0.5); margin-top: 5px;">¡Agenda tu primera experiencia sensorial hoy!</p>
                </div>
            `;
            return;
        }

        // Sort by date (descending for now)
        appts.sort((a, b) => new Date(a.date) - new Date(b.date));

        appts.forEach(appt => {
            const card = document.createElement('div');
            card.className = 'nua-appointment-card';
            card.innerHTML = `
                <div class="nua-appt-info">
                    <div class="nua-appt-service">${escapeHtml(appt.service)}</div>
                    <div class="nua-appt-detail">
                        <span><i class="far fa-calendar-alt"></i> ${escapeHtml(appt.date)}</span>
                        <span><i class="far fa-clock"></i> ${escapeHtml(appt.time)}</span>
                    </div>
                    <div class="nua-appt-client">Titular: ${escapeHtml(appt.name)} (${escapeHtml(appt.email)})</div>
                </div>
                <button class="nua-appt-cancel-btn" data-id="${appt.id}">Cancelar</button>
            `;

            // Bind cancel button
            card.querySelector('.nua-appt-cancel-btn').addEventListener('click', () => {
                cancelAppointment(appt.id, appt.service);
            });

            apptsListContainer.appendChild(card);
        });
    }

    // Cancel appointment
    function cancelAppointment(id, serviceName) {
        if (confirm(`¿Estás seguro de que deseas cancelar tu cita para: ${serviceName}?`)) {
            let appts = getAppointmentsFromStorage();
            appts = appts.filter(a => a.id !== id);
            localStorage.setItem('nua_appointments', JSON.stringify(appts));

            showNuaToast('Cita cancelada con éxito.', 'success');
            updateBadges();
            renderAppointments();
        }
    }

    // Retrieve from storage helper
    function getAppointmentsFromStorage() {
        const data = localStorage.getItem('nua_appointments');
        return data ? JSON.parse(data) : [];
    }

    // Update floating badge and navbar indicator count
    function updateBadges() {
        const count = getAppointmentsFromStorage().length;
        
        // Floating badge count
        const badge = document.getElementById('nuaFloatingBadge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }

        // Nav badge count
        const navBadges = document.querySelectorAll('.nav-item-nua-gold span.badge');
        navBadges.forEach(nb => {
            nb.textContent = count;
            nb.style.display = count > 0 ? 'inline-block' : 'none';
        });
    }

    // Dynamic Elements Injection
    function injectUiElements() {
        // 1. Toast Container
        if (!document.getElementById('nuaToastContainer')) {
            const toastContainer = document.createElement('div');
            toastContainer.id = 'nuaToastContainer';
            toastContainer.className = 'nua-toast-container';
            document.body.appendChild(toastContainer);
        }

        // 2. Modal Overlay
        if (!document.getElementById('nuaModalOverlay')) {
            const modalOverlay = document.createElement('div');
            modalOverlay.id = 'nuaModalOverlay';
            modalOverlay.className = 'nua-modal-overlay';
            modalOverlay.innerHTML = `
                <div class="nua-modal">
                    <div class="nua-modal-header">
                        <h4 class="nua-modal-title">Gestión de Citas</h4>
                        <button class="nua-modal-close" id="nuaModalClose">&times;</button>
                    </div>
                    <div class="nua-modal-body">
                        <h5 class="text-white mb-4" style="font-family: 'Cormorant Garamond', serif; font-size: 1.4rem; color: #c5a880;">Mis Reservas Programadas</h5>
                        <div class="nua-appointments-list" id="nuaApptsList">
                            <!-- Dynamically Rendered -->
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modalOverlay);
        }

        // 3. Floating Button
        if (!document.getElementById('nuaFloatingBtn')) {
            const floatingBtn = document.createElement('button');
            floatingBtn.id = 'nuaFloatingBtn';
            floatingBtn.className = 'nua-floating-btn';
            floatingBtn.setAttribute('title', 'Ver Mis Reservas');
            floatingBtn.innerHTML = `
                <i class="far fa-calendar-check"></i>
                <span class="nua-floating-badge" id="nuaFloatingBadge" style="display: none;">0</span>
            `;
            document.body.appendChild(floatingBtn);
        }
    }

    // Toast Generator helper
    window.showNuaToast = function(message, type = 'success') {
        const container = document.getElementById('nuaToastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'nua-toast';

        const iconClass = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
        const iconStyle = type === 'success' ? '' : 'style="color: #dc3545;"';
        
        if (type === 'error') {
            toast.style.borderLeftColor = '#dc3545';
        }

        toast.innerHTML = `
            <div class="nua-toast-content">
                <i class="fas ${iconClass} nua-toast-icon" ${iconStyle}></i>
                <span>${escapeHtml(message)}</span>
            </div>
            <button class="nua-toast-close">&times;</button>
        `;

        // Bind dismiss button
        toast.querySelector('.nua-toast-close').addEventListener('click', () => {
            dismissToast(toast);
        });

        container.appendChild(toast);

        // Slide In Animation trigger
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Auto dismiss after 4 seconds
        setTimeout(() => {
            dismissToast(toast);
        }, 4000);
    };

    function dismissToast(toast) {
        if (!toast.parentNode) return;
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 400);
    }

    // Helper to prevent HTML injection
    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#039;");
    }
});
