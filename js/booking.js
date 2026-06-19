/**
 * NÜA Wellness Spa - Interactive Booking System with Firebase Integration
 * Manages appointment CRUD using Firestore and handles authentication with Firebase Auth
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize UI Elements dynamically
    injectUiElements();

    // Cache DOM Elements for Appointments Modal
    const modalOverlay = document.getElementById('nuaModalOverlay');
    const modalClose = document.getElementById('nuaModalClose');
    const floatingBtn = document.getElementById('nuaFloatingBtn');
    const apptsListContainer = document.getElementById('nuaApptsList');

    // Cache DOM Elements for Auth Modal
    const authModalOverlay = document.getElementById('nuaAuthModalOverlay');
    const authModalClose = document.getElementById('nuaAuthModalClose');
    const loginBtn = document.getElementById('nuaLoginBtn');
    const logoutBtn = document.getElementById('nuaLogoutBtn');
    const userDropdown = document.getElementById('nuaUserDropdown');
    const userDropdownText = document.getElementById('nuaUserDropdownText');
    
    const loginForm = document.getElementById('nuaLoginForm');
    const registerForm = document.getElementById('nuaRegisterForm');
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');
    const authModalTitle = document.getElementById('nuaAuthModalTitle');

    const googleLoginBtn = document.getElementById('nuaGoogleLoginBtn');

    // Session State & Subscriptions
    let currentUser = null;
    let appointmentsListener = null;
    let activeAppointments = [];

    // 2. Event Listeners for Appointments Modal
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

    // Bind Navbar links for "Mis Reservas"
    document.querySelectorAll('.nav-item-nua-gold').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            renderAppointments();
            openModal();
        });
    });

    // 3. Event Listeners for Auth Modal
    function openAuthModal() {
        if (!authModalOverlay) return;
        authModalOverlay.style.display = 'flex';
        setTimeout(() => {
            authModalOverlay.classList.add('show');
        }, 10);
    }

    function closeAuthModal() {
        if (!authModalOverlay) return;
        authModalOverlay.classList.remove('show');
        setTimeout(() => {
            authModalOverlay.style.display = 'none';
            // Restablecer al formulario de login por defecto al cerrar
            if (loginForm && registerForm && authModalTitle) {
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
                authModalTitle.textContent = 'Iniciar Sesión';
            }
        }, 300);
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openAuthModal();
        });
    }

    if (authModalClose) {
        authModalClose.addEventListener('click', closeAuthModal);
    }

    if (authModalOverlay) {
        authModalOverlay.addEventListener('click', (e) => {
            if (e.target === authModalOverlay) closeAuthModal();
        });
    }

    if (switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            authModalTitle.textContent = 'Registrarse';
        });
    }

    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            authModalTitle.textContent = 'Iniciar Sesión';
        });
    }

    // 4. Firebase Auth Listeners & Forms Submission
    if (typeof auth !== 'undefined' && auth) {
        auth.onAuthStateChanged(user => {
            currentUser = user;
            if (user) {
                // El usuario ha iniciado sesión
                if (loginBtn) loginBtn.style.display = 'none';
                if (userDropdown) userDropdown.style.display = 'block';
                if (userDropdownText) {
                    userDropdownText.innerHTML = `<i class="fas fa-user-circle mr-1"></i> ${escapeHtml(user.displayName || user.email.split('@')[0])}`;
                }
                
                // Pre-rellenar campos de formulario y bloquearlos para evitar errores
                const nameInput = document.querySelector('.nua-name');
                const emailInput = document.querySelector('.nua-email');
                if (nameInput) {
                    nameInput.value = user.displayName || '';
                    nameInput.setAttribute('readonly', 'readonly');
                    nameInput.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    nameInput.style.borderColor = 'rgba(197, 168, 128, 0.4)';
                }
                if (emailInput) {
                    emailInput.value = user.email || '';
                    emailInput.setAttribute('readonly', 'readonly');
                    emailInput.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    emailInput.style.borderColor = 'rgba(197, 168, 128, 0.4)';
                }

                // Suscribirse a las citas del usuario en tiempo real desde Firestore
                subscribeToAppointments(user.uid);
            } else {
                // El usuario ha cerrado sesión
                if (loginBtn) loginBtn.style.display = 'block';
                if (userDropdown) userDropdown.style.display = 'none';
                
                // Limpiar y desbloquear campos de formulario
                const nameInput = document.querySelector('.nua-name');
                const emailInput = document.querySelector('.nua-email');
                if (nameInput) {
                    nameInput.value = '';
                    nameInput.removeAttribute('readonly');
                    nameInput.style.backgroundColor = 'transparent';
                    nameInput.style.borderColor = 'rgba(255,255,255,0.15)';
                }
                if (emailInput) {
                    emailInput.value = '';
                    emailInput.removeAttribute('readonly');
                    emailInput.style.backgroundColor = 'transparent';
                    emailInput.style.borderColor = 'rgba(255,255,255,0.15)';
                }

                // Desvincular listener de base de datos
                if (appointmentsListener) {
                    appointmentsListener();
                    appointmentsListener = null;
                }
                
                // Limpiar listado visual y badges
                activeAppointments = [];
                updateBadges(0);
                renderAppointments([]);
            }
        });
    }

    // Iniciar Sesión con Correo/Contraseña
    if (loginForm && typeof auth !== 'undefined' && auth) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('nuaLoginEmail').value.trim();
            const password = document.getElementById('nuaLoginPassword').value;

            if (!email || !password) {
                showNuaToast('Ingresa tu correo y contraseña.', 'error');
                return;
            }

            auth.signInWithEmailAndPassword(email, password)
                .then(() => {
                    showNuaToast('¡Sesión iniciada con éxito!', 'success');
                    closeAuthModal();
                    loginForm.reset();
                })
                .catch(error => {
                    let errorMsg = 'Error al iniciar sesión.';
                    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                        errorMsg = 'Correo o contraseña incorrectos.';
                    } else if (error.code === 'auth/invalid-email') {
                        errorMsg = 'El formato del correo es inválido.';
                    }
                    showNuaToast(errorMsg, 'error');
                });
        });
    }

    // Registrarse con Correo/Contraseña
    if (registerForm && typeof auth !== 'undefined' && auth) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('nuaRegisterName').value.trim();
            const email = document.getElementById('nuaRegisterEmail').value.trim();
            const password = document.getElementById('nuaRegisterPassword').value;

            if (!name || !email || !password) {
                showNuaToast('Completa todos los campos.', 'error');
                return;
            }

            if (password.length < 6) {
                showNuaToast('La contraseña debe tener al menos 6 caracteres.', 'error');
                return;
            }

            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    return user.updateProfile({
                        displayName: name
                    });
                })
                .then(() => {
                    showNuaToast('¡Cuenta creada y sesión iniciada!', 'success');
                    closeAuthModal();
                    registerForm.reset();
                })
                .catch(error => {
                    let errorMsg = 'Error al registrarse.';
                    if (error.code === 'auth/email-already-in-use') {
                        errorMsg = 'El correo ya está registrado.';
                    } else if (error.code === 'auth/invalid-email') {
                        errorMsg = 'El formato del correo es inválido.';
                    } else if (error.code === 'auth/weak-password') {
                        errorMsg = 'La contraseña es muy débil.';
                    }
                    showNuaToast(errorMsg, 'error');
                });
        });
    }

    // Google Sign-In
    if (googleLoginBtn && typeof auth !== 'undefined' && auth && typeof googleProvider !== 'undefined' && googleProvider) {
        googleLoginBtn.addEventListener('click', () => {
            auth.signInWithPopup(googleProvider)
                .then(() => {
                    showNuaToast('¡Sesión iniciada con Google!', 'success');
                    closeAuthModal();
                })
                .catch(error => {
                    if (error.code !== 'auth/popup-closed-by-user') {
                        showNuaToast('Error al iniciar sesión con Google. Revisa que el proveedor esté habilitado en Firebase.', 'error');
                    }
                });
        });
    }


    // Cerrar Sesión
    if (logoutBtn && typeof auth !== 'undefined' && auth) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.signOut()
                .then(() => {
                    showNuaToast('Sesión cerrada con éxito.', 'success');
                })
                .catch(() => {
                    showNuaToast('Error al cerrar sesión.', 'error');
                });
        });
    }

    // Auto-seleccionar servicio desde parámetros URL (ej. ?service=Essential)
    const urlParams = new URLSearchParams(window.location.search);
    const serviceParam = urlParams.get('service');
    if (serviceParam) {
        const selectElement = document.querySelector('.nua-service');
        if (selectElement) {
            const option = selectElement.querySelector(`option[value="${serviceParam}"]`);
            if (option) {
                selectElement.value = serviceParam;
            }
        }
    }

    // 5. Intercept Booking Forms
    bindBookingForms();

    // 6. Intercept Newsletter Forms
    bindNewsletterForms();

    /* ==========================================
       Core Functions (Firestore & Rendering)
       ========================================== */

    // Suscribirse a las citas del usuario en tiempo real desde Firestore
    function subscribeToAppointments(uid) {
        if (typeof db === 'undefined' || !db) return;

        // Desvincular listener anterior si existiera
        if (appointmentsListener) appointmentsListener();

        appointmentsListener = db.collection('appointments')
            .where('uid', '==', uid)
            .onSnapshot(snapshot => {
                activeAppointments = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    activeAppointments.push({
                        id: doc.id,
                        ...data
                    });
                });

                // Actualizar contadores y renderizar lista
                updateBadges(activeAppointments.length);
                renderAppointments(activeAppointments);
            }, error => {
                console.error("Error al cargar citas de Firestore: ", error);
                // Si falta permisos, es muy probable que no tenga reglas Firestore adecuadas.
                showNuaToast('Error de permisos en Base de Datos. Recuerda activar Firestore en modo prueba o configurar las reglas.', 'error');
            });
    }

    // Open/Close Appointments Modal
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

                // Validar si el usuario está autenticado. Si no, forzar login.
                if (!currentUser) {
                    showNuaToast('Debes iniciar sesión para agendar una cita de spa.', 'error');
                    openAuthModal();
                    return;
                }

                // Recuperar inputs de forma segura
                const nameInput = form.querySelector('.nua-name');
                const emailInput = form.querySelector('.nua-email');
                const dateInput = form.querySelector('.nua-date');
                const timeInput = form.querySelector('.nua-time');
                const serviceSelect = form.querySelector('.nua-service');

                // Validaciones
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

                // Validación de formato de correo
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    showNuaToast('Por favor, ingresa un correo electrónico válido.', 'error');
                    return;
                }

                // Validación de fecha (Futura o presente)
                const parts = date.split('/');
                let selectedDate;
                if (parts.length === 3) {
                    // Esperando formato MM/DD/YYYY de Tempus Dominus
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

                // Crear objeto de cita con uid de Firebase
                const appointment = {
                    uid: currentUser.uid,
                    name: name,
                    email: email,
                    date: date,
                    time: time,
                    service: serviceText,
                    createdAt: new Date().toISOString()
                };

                // Guardar en Firestore
                if (typeof db !== 'undefined' && db) {
                    db.collection('appointments').add(appointment)
                        .then(() => {
                            // Limpiar solo los campos de la cita (fecha, hora, servicio)
                            // Mantener nombre y correo ya que están bloqueados con la sesión activa
                            if (dateInput) dateInput.value = '';
                            if (timeInput) timeInput.value = '';
                            if (serviceSelect) serviceSelect.value = '';

                            showNuaToast(`¡Cita agendada con éxito para ${serviceText}!`, 'success');
                        })
                        .catch(error => {
                            console.error("Error guardando cita en Firestore: ", error);
                            showNuaToast('Error de conexión al guardar tu cita. Revisa tu consola.', 'error');
                        });
                } else {
                    showNuaToast('Error de inicialización de Base de Datos. Firebase no está configurado.', 'error');
                }
            });
        });
    }

    // Bind Newsletter Subscriptions (Se mantiene local como simulador)
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
    function renderAppointments(appts = activeAppointments) {
        apptsListContainer.innerHTML = '';

        if (!currentUser) {
            apptsListContainer.innerHTML = `
                <div class="nua-no-appointments">
                    <div class="nua-no-appointments-icon"><i class="fas fa-user-lock"></i></div>
                    <p style="color: rgba(255, 255, 255, 0.6); margin-bottom: 0;">Inicia sesión para gestionar y revisar tus citas.</p>
                    <button class="btn btn-primary btn-sm mt-3" id="nuaModalLoginBtn" style="border-radius: 50px; padding: 6px 20px;">Iniciar Sesión</button>
                </div>
            `;
            const modalLoginBtn = document.getElementById('nuaModalLoginBtn');
            if (modalLoginBtn) {
                modalLoginBtn.addEventListener('click', () => {
                    closeModal();
                    openAuthModal();
                });
            }
            return;
        }

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

        // Ordenar por fecha cronológicamente
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

            // Enlazar botón de cancelar
            card.querySelector('.nua-appt-cancel-btn').addEventListener('click', () => {
                cancelAppointment(appt.id, appt.service);
            });

            apptsListContainer.appendChild(card);
        });
    }

    // Cancel appointment from Firestore
    function cancelAppointment(id, serviceName) {
        if (!currentUser) return;
        if (confirm(`¿Estás seguro de que deseas cancelar tu cita para: ${serviceName}?`)) {
            if (typeof db !== 'undefined' && db) {
                db.collection('appointments').doc(id).delete()
                    .then(() => {
                        showNuaToast('Cita cancelada con éxito.', 'success');
                    })
                    .catch(error => {
                        console.error("Error al cancelar cita en Firestore: ", error);
                        showNuaToast('Error al cancelar la cita.', 'error');
                    });
            }
        }
    }

    // Update floating badge and navbar indicator count
    function updateBadges(count = 0) {
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

        // 2. Appointments Modal Overlay
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

        // 4. Elegant Authentication Modal Overlay
        if (!document.getElementById('nuaAuthModalOverlay')) {
            const authModalOverlay = document.createElement('div');
            authModalOverlay.id = 'nuaAuthModalOverlay';
            authModalOverlay.className = 'nua-modal-overlay';
            authModalOverlay.innerHTML = `
                <div class="nua-modal nua-auth-modal">
                    <div class="nua-modal-header">
                        <h4 class="nua-modal-title" id="nuaAuthModalTitle">Iniciar Sesión</h4>
                        <button class="nua-modal-close" id="nuaAuthModalClose">&times;</button>
                    </div>
                    <div class="nua-modal-body">
                        <!-- Formulario de Inicio de Sesión -->
                        <form id="nuaLoginForm" class="nua-auth-form">
                            <p class="text-white-50 text-center mb-4" style="font-size: 0.9rem; font-weight: 300;">Inicia sesión para gestionar y agendar tus experiencias sensoriales.</p>
                            <div class="form-group mb-3">
                                <label class="text-white-50" style="font-size: 0.85rem;">Correo Electrónico</label>
                                <input type="email" id="nuaLoginEmail" class="form-control bg-transparent text-white" placeholder="ejemplo@correo.com" required style="border: 1px solid rgba(197, 168, 128, 0.25); color: #fff;">
                            </div>
                            <div class="form-group mb-4">
                                <label class="text-white-50" style="font-size: 0.85rem;">Contraseña</label>
                                <input type="password" id="nuaLoginPassword" class="form-control bg-transparent text-white" placeholder="Mínimo 6 caracteres" required style="border: 1px solid rgba(197, 168, 128, 0.25); color: #fff;">
                            </div>
                            <button type="submit" class="btn btn-primary btn-block mb-3" style="height: 45px; font-size: 0.9rem; letter-spacing: 1px;">Ingresar</button>
                            <p class="text-center text-white-50" style="font-size: 0.85rem;">
                                ¿No tienes cuenta? <a href="#" id="switchToRegister" style="color: #c5a880; font-weight: 500;">Regístrate aquí</a>
                            </p>
                        </form>

                        <!-- Formulario de Registro (Oculto por defecto) -->
                        <form id="nuaRegisterForm" class="nua-auth-form" style="display: none;">
                            <p class="text-white-50 text-center mb-4" style="font-size: 0.9rem; font-weight: 300;">Crea tu cuenta exclusiva de cliente NÜA Wellness Spa.</p>
                            <div class="form-group mb-3">
                                <label class="text-white-50" style="font-size: 0.85rem;">Nombre Completo</label>
                                <input type="text" id="nuaRegisterName" class="form-control bg-transparent text-white" placeholder="Tu Nombre Completo" required style="border: 1px solid rgba(197, 168, 128, 0.25); color: #fff;">
                            </div>
                            <div class="form-group mb-3">
                                <label class="text-white-50" style="font-size: 0.85rem;">Correo Electrónico</label>
                                <input type="email" id="nuaRegisterEmail" class="form-control bg-transparent text-white" placeholder="ejemplo@correo.com" required style="border: 1px solid rgba(197, 168, 128, 0.25); color: #fff;">
                            </div>
                            <div class="form-group mb-4">
                                <label class="text-white-50" style="font-size: 0.85rem;">Contraseña</label>
                                <input type="password" id="nuaRegisterPassword" class="form-control bg-transparent text-white" placeholder="Mínimo 6 caracteres" required style="border: 1px solid rgba(197, 168, 128, 0.25); color: #fff;">
                            </div>
                            <button type="submit" class="btn btn-primary btn-block mb-3" style="height: 45px; font-size: 0.9rem; letter-spacing: 1px;">Registrarse</button>
                            <p class="text-center text-white-50" style="font-size: 0.85rem;">
                                ¿Ya tienes cuenta? <a href="#" id="switchToLogin" style="color: #c5a880; font-weight: 500;">Inicia sesión aquí</a>
                            </p>
                        </form>

                        <!-- Proveedor Social (Google) -->
                        <div class="nua-social-divider my-4">
                            <span class="text-white-50" style="font-size: 0.8rem; background: #0a0a0a; padding: 0 10px; font-family: 'Poppins', sans-serif; letter-spacing: 1px;">O INGRESA CON</span>
                        </div>
                        <div class="row">
                            <div class="col-12">
                                <button type="button" id="nuaGoogleLoginBtn" class="btn btn-outline-light btn-block d-flex align-items-center justify-content-center" style="border-color: rgba(255,255,255,0.15); height: 45px; color: #fff; font-size: 0.85rem; font-weight: 500;">
                                    <i class="fab fa-google mr-2" style="color: #ea4335;"></i> Google
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(authModalOverlay);
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
