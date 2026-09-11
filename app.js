// --- NAVIGATION & ETAT GLOBAL ---
let courses = [];
let currentUser = null;
window.allUsers = [];
window.currentCatalogFilter = 'all'; // 'all' ou 'assigned'
window.userScopeFilter = 'all'; // 'all' ou 'mine'
window.catalogSearchQuery = '';
window.activeAssignUserId = null;
window.selectedAssignCourseIds = new Set();

// --- AUTHENTIFICATION ---
function applyAuthState() {
    if (!currentUser) return;
    document.getElementById('login-screen').style.display = 'none';
    const isDetailsActive = document.getElementById('page-details')?.classList.contains('active');
    document.getElementById('main-nav').style.display = isDetailsActive ? 'none' : 'flex';
    
    // Calcul des initiales, du prénom et du nom complet
    const prenom = (currentUser.prenom || '').trim();
    const nom = (currentUser.nom || '').trim();
    const displayName = prenom || nom || currentUser.username || currentUser.matricule || 'Utilisateur';
    const fullName = `${prenom} ${nom}`.trim() || displayName;
    const initials = ((prenom.charAt(0) || '') + (nom.charAt(0) || currentUser.matricule?.charAt(0) || 'U')).toUpperCase();

    // Mise à jour de l'affichage déclencheur du menu utilisateur : UNIQUEMENT LE PRÉNOM
    const userDisplayEl = document.getElementById('current-user-display');
    if (userDisplayEl) userDisplayEl.innerText = displayName;

    const navAvatarEl = document.getElementById('nav-user-avatar');
    if (navAvatarEl) navAvatarEl.innerText = initials;

    // Mise à jour de l'en-tête du menu déroulant
    const dropdownAvatarEl = document.getElementById('dropdown-user-avatar');
    if (dropdownAvatarEl) dropdownAvatarEl.innerText = initials;

    const dropdownNameEl = document.getElementById('dropdown-user-name');
    if (dropdownNameEl) dropdownNameEl.innerText = fullName;

    const dropdownMatriculeEl = document.getElementById('dropdown-user-matricule');
    if (dropdownMatriculeEl) dropdownMatriculeEl.innerText = `Matricule : ${currentUser.matricule || 'N/A'}`;

    const dropdownSubEl = document.getElementById('dropdown-user-sub');
    if (dropdownSubEl) dropdownSubEl.innerText = currentUser.email || currentUser.direction || (currentUser.poste || 'Compte Entreprise');

    // Badge de rôle (dans la modale et dans le dropdown)
    const badgeEl = document.getElementById('current-user-role-badge');
    const dropdownBadgeEl = document.getElementById('dropdown-user-role-badge');
    let roleLabel = 'Apprenant';
    let roleClass = 'role-badge role-user';
    if (currentUser.role === 'superadmin') {
        roleLabel = 'Super Admin';
        roleClass = 'role-badge role-superadmin';
    } else if (currentUser.role === 'admin') {
        roleLabel = 'Administrateur';
        roleClass = 'role-badge role-admin';
    }
    if (badgeEl) {
        badgeEl.className = roleClass;
        badgeEl.innerText = roleLabel;
    }
    if (dropdownBadgeEl) {
        dropdownBadgeEl.className = roleClass;
        dropdownBadgeEl.innerText = roleLabel;
    }

    const isSuperAdmin = currentUser.role === 'superadmin';
    const isAdminOrSuper = currentUser.role === 'admin' || currentUser.role === 'superadmin';
    
    // Visibilité des éléments de navigation selon les droits
    const navDashboard = document.getElementById('nav-dashboard');
    if (navDashboard) {
        navDashboard.style.display = 'inline-block';
        navDashboard.innerText = 'Tableau de Bord';
    }
    const navUsers = document.getElementById('nav-users');
    if (navUsers) navUsers.style.display = isAdminOrSuper ? 'inline-block' : 'none';

    // Ancien bouton nav-creation s'il existe encore dans le DOM
    const navCreation = document.getElementById('nav-creation');
    if (navCreation) navCreation.style.display = 'none';

    // Bouton d'action principal 'Créer une formation' dans la page Catalogue
    const catalogBtnCreate = document.getElementById('catalog-btn-create');
    if (catalogBtnCreate) {
        catalogBtnCreate.style.display = isAdminOrSuper ? 'inline-flex' : 'none';
    }

    // Personnalisation de l'élément 'Assignations' dans le menu déroulant
    const assignTitleEl = document.getElementById('dropdown-assignments-title');
    const assignDescEl = document.getElementById('dropdown-assignments-desc');
    if (assignTitleEl && assignDescEl) {
        if (isAdminOrSuper) {
            assignTitleEl.innerText = 'Assignations & Parcours';
            assignDescEl.innerText = 'Piloter les règles et affectations';
        } else {
            assignTitleEl.innerText = 'Mes Formations Assignées';
            assignDescEl.innerText = 'Consulter mes parcours obligatoires';
        }
    }
    
    // Options de rôle dans le formulaire de création et le modal
    const superAdminOptCreate = document.getElementById('role-option-superadmin');
    if (superAdminOptCreate) superAdminOptCreate.style.display = isSuperAdmin ? 'block' : 'none';
    
    const superAdminOptEdit = document.getElementById('edit-role-option-superadmin');
    if (superAdminOptEdit) superAdminOptEdit.style.display = isSuperAdmin ? 'block' : 'none';

    navigateTo('dashboard');
    loadCourses();
}

// --- MENU DEROULANT UTILISATEUR & PROFIL ---
function toggleUserDropdown(event, forceState) {
    if (event && event.stopPropagation) {
        event.stopPropagation();
    }
    const menu = document.getElementById('user-dropdown-card');
    const chevron = document.getElementById('user-menu-chevron');
    if (!menu) return;

    const isCurrentlyVisible = menu.style.display !== 'none';
    const shouldShow = (forceState !== undefined) ? forceState : !isCurrentlyVisible;
    
    if (shouldShow) {
        menu.style.display = 'block';
        if (chevron) chevron.style.transform = 'rotate(180deg)';
    } else {
        menu.style.display = 'none';
        if (chevron) chevron.style.transform = 'rotate(0deg)';
    }
}
window.toggleUserDropdown = toggleUserDropdown;

// Fermeture automatique du menu au clic en dehors
document.addEventListener('click', function(e) {
    const wrapper = document.getElementById('user-menu-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        toggleUserDropdown(null, false);
    }
});

function handleMenuAssignments() {
    if (!currentUser) return;
    const isAdminOrSuper = currentUser.role === 'admin' || currentUser.role === 'superadmin';
    if (isAdminOrSuper) {
        navigateTo('assignments');
    } else {
        navigateTo('consultation');
        if (typeof setCatalogFilter === 'function') {
            setCatalogFilter('assigned');
        }
    }
}
window.handleMenuAssignments = handleMenuAssignments;

function openUserProfileModal() {
    if (!currentUser) return;
    const prenom = (currentUser.prenom || '').trim();
    const nom = (currentUser.nom || '').trim();
    const fullName = `${prenom} ${nom}`.trim() || currentUser.username || currentUser.matricule || 'Utilisateur';
    const initials = ((prenom.charAt(0) || '') + (nom.charAt(0) || currentUser.matricule?.charAt(0) || 'U')).toUpperCase();

    const avatarEl = document.getElementById('profile-modal-avatar');
    if (avatarEl) avatarEl.innerText = initials;

    const nameEl = document.getElementById('profile-modal-fullname');
    if (nameEl) nameEl.innerText = fullName;

    const roleBadgeEl = document.getElementById('profile-modal-role-badge');
    if (roleBadgeEl) {
        let rLabel = 'Apprenant';
        if (currentUser.role === 'superadmin') rLabel = 'Super Administrateur';
        else if (currentUser.role === 'admin') rLabel = 'Administrateur';
        roleBadgeEl.innerText = rLabel;
    }

    const dirPill = document.getElementById('profile-modal-direction-pill');
    if (dirPill) dirPill.innerText = currentUser.direction || 'SGCI';

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val || 'Non renseigné';
    };

    setVal('profile-modal-matricule', currentUser.matricule);
    setVal('profile-modal-email', currentUser.email);
    setVal('profile-modal-direction', currentUser.direction);
    setVal('profile-modal-poste', currentUser.poste);
    setVal('profile-modal-contrat', currentUser.statut_contrat || 'CDI');
    setVal('profile-modal-date', currentUser.date_embauche);
    setVal('profile-modal-manager', currentUser.manager);

    if (typeof loadProfileEvaluations === 'function') {
        loadProfileEvaluations(currentUser.id);
    }

    const modal = document.getElementById('user-profile-modal');
    if (modal) modal.style.display = 'flex';
}
window.openUserProfileModal = openUserProfileModal;

function closeUserProfileModal() {
    const modal = document.getElementById('user-profile-modal');
    if (modal) modal.style.display = 'none';
}
window.closeUserProfileModal = closeUserProfileModal;

async function performLogin() {
    const userInput = document.getElementById('login-user').value.trim();
    const passInput = document.getElementById('login-pass').value.trim();
    const errorEl = document.getElementById('login-error');
    errorEl.style.display = 'none';
    
    if (!userInput || !passInput) {
        errorEl.innerText = "Veuillez renseigner votre matricule et votre mot de passe.";
        errorEl.style.display = 'block';
        return;
    }
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                identifier: userInput, 
                matricule: userInput, 
                username: userInput, 
                password: passInput
            })
        });
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            sessionStorage.setItem('ia_formation_user', JSON.stringify(currentUser));
            
            // Vérification obligatoire du Disclosure & Consentement RGPD / AI Act (Section 14)
            try {
                const cRes = await fetch(`/api/user/consent-status?user_id=${currentUser.id}`);
                const cData = await cRes.json();
                if (!cData.accepted) {
                    document.getElementById('login-screen').style.display = 'none';
                    document.getElementById('disclosure-modal').style.display = 'flex';
                    return;
                }
            } catch (eConsent) {
                console.warn("Erreur vérification consentement:", eConsent);
            }
            
            applyAuthState();
        } else {
            errorEl.innerText = data.error || "Matricule ou mot de passe incorrect";
            errorEl.style.display = 'block';
        }
    } catch (e) {
        console.error("Login error:", e);
        errorEl.innerText = "Erreur de connexion au serveur";
        errorEl.style.display = 'block';
    }
}

window.validateConsentCheckboxes = function() {
    const c1 = document.getElementById('consent-check-1')?.checked;
    const c2 = document.getElementById('consent-check-2')?.checked;
    const c3 = document.getElementById('consent-check-3')?.checked;
    const btn = document.getElementById('btn-accept-disclosure');
    if (!btn) return;
    
    if (c1 && c2 && c3) {
        btn.disabled = false;
        btn.style.background = '#e9041e';
        btn.style.color = '#ffffff';
        btn.style.cursor = 'pointer';
        btn.style.boxShadow = '0 4px 14px rgba(233, 4, 30, 0.3)';
    } else {
        btn.disabled = true;
        btn.style.background = '#cbd5e1';
        btn.style.color = '#64748b';
        btn.style.cursor = 'not-allowed';
        btn.style.boxShadow = 'none';
    }
};

window.submitUserConsent = async function() {
    if (!currentUser) return;
    try {
        const res = await fetch('/api/user/consent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                disclosure_version: '1.0',
                status: 'accepted'
            })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('disclosure-modal').style.display = 'none';
            applyAuthState();
        } else {
            alert("Erreur lors de l'enregistrement du consentement.");
        }
    } catch (e) {
        console.error("submitUserConsent error:", e);
        alert("Erreur de connexion au serveur pour l'enregistrement du consentement.");
    }
};

window.trackDocumentDownload = function(courseId, docType) {
    if (!currentUser) return;
    fetch('/api/downloads/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: currentUser.id,
            course_id: courseId,
            doc_type: docType
        })
    }).catch(e => console.warn("Track download error:", e));
};

function performLogout() {
    toggleUserDropdown(null, false);
    closeUserProfileModal();
    currentUser = null;
    sessionStorage.removeItem('ia_formation_user');
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('main-nav').style.display = 'none';
    document.getElementById('login-pass').value = '';
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
}

// --- GESTION DES UTILISATEURS & ASSIGNATIONS ---

async function loadUsers() {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
        return;
    }
    try {
        const res = await fetch('/api/users?t=' + new Date().getTime());
        const users = await res.json();
        window.allUsers = users;
        
        const countEl = document.getElementById('users-count');
        if (countEl) countEl.innerText = users.length;
        
        filterUsersTable();
    } catch (e) {
        console.error("loadUsers error:", e);
    }
}

function renderUsersTable(usersList) {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (usersList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 30px; color: #94a3b8; font-style: italic;">
                    Aucun utilisateur trouvé.
                </td>
            </tr>
        `;
        return;
    }
    
    const isSuperAdmin = currentUser && currentUser.role === 'superadmin';
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    usersList.forEach(u => {
        let badgeHtml = '';
        if (u.role === 'superadmin') {
            badgeHtml = '<span class="role-badge role-superadmin">Super Admin</span>';
        } else if (u.role === 'admin') {
            badgeHtml = '<span class="role-badge role-admin">Admin</span>';
        } else {
            badgeHtml = '<span class="role-badge role-user">Apprenant</span>';
        }
        
        const canEdit = isSuperAdmin || (isAdmin && u.role === 'user');
        const canDelete = (isSuperAdmin && u.id !== currentUser.id && (u.role !== 'superadmin' || usersList.filter(x=>x.role==='superadmin').length > 1)) || 
                          (isAdmin && u.role === 'user');

        const nomComplet = `${u.nom || ''} ${u.prenom || ''}`.trim() || '-';
        const emailLine = u.email ? `<div style="font-size: 12px; color: #64748b;">${u.email}</div>` : '';
        const posteDisplay = u.poste ? u.poste : '<span style="color:#94a3b8;">-</span>';
        const directionDisplay = u.direction ? u.direction : '<span style="color:#94a3b8;">-</span>';
        const statutDisplay = u.statut_contrat ? `<span class="tag tag-domain" style="font-size: 11px; padding: 2px 7px;">${u.statut_contrat}</span>` : '<span style="color:#94a3b8;">-</span>';
        const dateEmbaucheDisplay = u.date_embauche ? u.date_embauche.split(' ')[0] : '<span style="color:#94a3b8;">-</span>';
        
        const countAssigned = u.assigned_courses_count || 0;
        const assignedBadge = countAssigned > 0 
            ? `<span class="tag tag-assigned" style="font-size: 11px; padding: 3px 8px;">${countAssigned} cours</span>`
            : `<span style="font-size: 12px; color: #94a3b8;">0</span>`;
        
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px 16px; font-weight: bold; color: #0f172a;">${u.matricule || '-'}</td>
                <td style="padding: 12px 16px;">
                    <strong>${nomComplet}</strong>
                    ${emailLine}
                </td>
                <td style="padding: 12px 16px;">${directionDisplay}</td>
                <td style="padding: 12px 16px;">${posteDisplay}</td>
                <td style="padding: 12px 16px;">${statutDisplay}</td>
                <td style="padding: 12px 16px; font-size: 12px; color: #64748b;">${dateEmbaucheDisplay}</td>
                <td style="padding: 12px 16px;">${badgeHtml}</td>
                <td style="padding: 12px 16px; text-align: center;">${assignedBadge}</td>
                <td style="padding: 12px 16px; text-align: center; white-space: nowrap;">
                    ${canEdit ? `<button onclick="openEditUserModal(${u.id})" class="action-btn-sm btn-edit" title="Modifier">Modifier</button>` : ''}
                    ${canDelete ? `<button onclick="deleteUser(${u.id}, '${u.matricule}')" class="action-btn-sm btn-delete" title="Supprimer" style="margin-left: 4px;">Supprimer</button>` : ''}
                </td>
            </tr>
        `;
    });
}

function filterUsersTable() {
    const query = (document.getElementById('user-search')?.value || '').toLowerCase().trim();
    if (!query) {
        renderUsersTable(window.allUsers);
        return;
    }
    
    const filtered = window.allUsers.filter(u => {
        const matricule = (u.matricule || '').toLowerCase();
        const nom = (u.nom || '').toLowerCase();
        const prenom = (u.prenom || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const poste = (u.poste || '').toLowerCase();
        const direction = (u.direction || '').toLowerCase();
        const statut = (u.statut_contrat || '').toLowerCase();
        const role = (u.role || '').toLowerCase();
        
        return matricule.includes(query) ||
               nom.includes(query) ||
               prenom.includes(query) ||
               email.includes(query) ||
               poste.includes(query) ||
               direction.includes(query) ||
               statut.includes(query) ||
               role.includes(query);
    });
    
    renderUsersTable(filtered);
}

window.openCreateUserModal = function() {
    const form = document.getElementById('create-user-form');
    if (form) form.reset();
    const msg = document.getElementById('user-msg');
    if (msg) msg.innerText = '';
    const modal = document.getElementById('create-user-modal');
    if (modal) modal.style.display = 'flex';
};

window.closeCreateUserModal = function() {
    const modal = document.getElementById('create-user-modal');
    if (modal) modal.style.display = 'none';
    const msg = document.getElementById('user-msg');
    if (msg) msg.innerText = '';
};

async function createUser() {
    const matricule = document.getElementById('new-matricule').value.trim();
    const password = document.getElementById('new-password').value.trim();
    const nom = document.getElementById('new-nom').value.trim();
    const prenom = document.getElementById('new-prenom').value.trim();
    const email = document.getElementById('new-email').value.trim();
    const direction = document.getElementById('new-direction').value.trim();
    const poste = document.getElementById('new-poste').value.trim();
    const statut_contrat = document.getElementById('new-statut-contrat').value;
    const date_embauche = document.getElementById('new-date-embauche').value;
    const role = document.getElementById('new-role').value;
    const msg = document.getElementById('user-msg');
    
    if (!matricule || !password || !nom || !prenom) {
        msg.style.color = '#dc2626';
        msg.innerText = "Veuillez remplir tous les champs obligatoires (*).";
        return;
    }
    
    try {
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                matricule, password, nom, prenom, email, poste, direction,
                statut_contrat, date_embauche, role,
                created_by: currentUser ? currentUser.id : 1
            })
        });
        const data = await res.json();
        
        if (data.success) {
            msg.style.color = '#000000';
            msg.innerText = `Utilisateur [${matricule.toUpperCase()}] créé avec succès !`;
            document.getElementById('create-user-form').reset();
            loadUsers();
            setTimeout(() => { 
                closeCreateUserModal(); 
            }, 1200);
        } else {
            msg.style.color = '#dc2626';
            msg.innerText = data.error || "Erreur lors de la création.";
        }
    } catch (e) {
        console.error("createUser error:", e);
        msg.style.color = '#dc2626';
        msg.innerText = "Erreur de communication avec le serveur.";
    }
}

// --- IMPORTATION EN MASSE D'UTILISATEURS VIA FICHIER ---

window.openBulkUserModal = function() {
    const modal = document.getElementById('bulk-user-modal');
    if (modal) modal.style.display = 'flex';
    const input = document.getElementById('bulk-user-file-input');
    if (input) input.value = '';
    const info = document.getElementById('bulk-file-info');
    if (info) info.style.display = 'none';
    const results = document.getElementById('bulk-import-results');
    if (results) results.style.display = 'none';
    const msg = document.getElementById('bulk-modal-msg');
    if (msg) msg.innerText = '';
    const submitBtn = document.getElementById('bulk-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Lancer l\'importation';
    }

    // Initialiser le drag & drop si pas encore fait
    const dropZone = document.getElementById('bulk-drop-zone');
    if (dropZone && !dropZone._dragInit) {
        dropZone._dragInit = true;
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.style.borderColor = '#000000';
                dropZone.style.background = '#f8fafc';
            }, false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.style.borderColor = '#cbd5e1';
                dropZone.style.background = '#fafafa';
            }, false);
        });
        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files && files.length > 0) {
                const fileInput = document.getElementById('bulk-user-file-input');
                if (fileInput) {
                    fileInput.files = files;
                    window.handleBulkFileSelected(fileInput);
                }
            }
        }, false);
    }
};

window.closeBulkUserModal = function() {
    const modal = document.getElementById('bulk-user-modal');
    if (modal) modal.style.display = 'none';
};

window.handleBulkFileSelected = function(input) {
    const file = input.files && input.files[0];
    const infoBox = document.getElementById('bulk-file-info');
    const msg = document.getElementById('bulk-modal-msg');
    if (msg) msg.innerText = '';
    if (file) {
        document.getElementById('bulk-file-name').innerText = file.name;
        document.getElementById('bulk-file-size').innerText = (file.size / 1024).toFixed(1) + ' KB';
        if (infoBox) infoBox.style.display = 'block';
    } else {
        if (infoBox) infoBox.style.display = 'none';
    }
};

window.uploadBulkUsers = async function() {
    const fileInput = document.getElementById('bulk-user-file-input');
    const file = fileInput.files && fileInput.files[0];
    const msg = document.getElementById('bulk-modal-msg');
    const resultsBox = document.getElementById('bulk-import-results');
    const submitBtn = document.getElementById('bulk-submit-btn');

    if (!file) {
        msg.style.color = '#dc2626';
        msg.innerText = "Veuillez sélectionner un fichier (Excel ou CSV) avant de lancer l'importation.";
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Traitement en cours...';
    msg.style.color = '#e9041e';
    msg.innerText = "Analyse et importation des données...";
    if (resultsBox) resultsBox.style.display = 'none';

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('created_by', currentUser ? currentUser.id : 1);

        const res = await fetch('/api/users/import', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (res.ok && data.success) {
            resultsBox.style.display = 'block';
            document.getElementById('stat-total').innerText = data.total || 0;
            document.getElementById('stat-success').innerText = data.created_count || 0;
            document.getElementById('stat-errors').innerText = data.error_count || 0;

            // Affichage des erreurs si présentes
            const errorsBox = document.getElementById('bulk-errors-box');
            const errorsTbody = document.getElementById('bulk-errors-tbody');
            if (data.errors && data.errors.length > 0) {
                document.getElementById('bulk-errors-count').innerText = data.errors.length;
                errorsTbody.innerHTML = data.errors.map(err => `
                    <tr style="border-bottom: 1px solid #fed7d7;">
                        <td style="padding: 6px 10px; font-weight: 700; color: #991b1b;">Ligne ${err.row}</td>
                        <td style="padding: 6px 10px; font-family: monospace; font-weight: 600;">${err.matricule || 'N/A'}</td>
                        <td style="padding: 6px 10px; color: #dc2626;">${err.error}</td>
                    </tr>
                `).join('');
                errorsBox.style.display = 'block';
            } else {
                errorsBox.style.display = 'none';
            }

            // Affichage des utilisateurs créés
            const successBox = document.getElementById('bulk-success-box');
            const successTbody = document.getElementById('bulk-success-tbody');
            if (data.created && data.created.length > 0) {
                document.getElementById('bulk-success-count').innerText = data.created.length;
                successTbody.innerHTML = data.created.map(u => `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 6px 10px; font-weight: 700; color: #000000; font-family: monospace;">${u.matricule}</td>
                        <td style="padding: 6px 10px;"><strong>${u.nom}</strong> ${u.prenom}</td>
                        <td style="padding: 6px 10px; color: #475569;">${u.direction || '-'} / ${u.poste || '-'}</td>
                        <td style="padding: 6px 10px;"><span class="role-badge role-${u.role}">${u.role === 'superadmin' ? 'Super Admin' : (u.role === 'admin' ? 'Admin' : 'Apprenant')}</span></td>
                    </tr>
                `).join('');
                successBox.style.display = 'block';
            } else {
                successBox.style.display = 'none';
            }

            if (data.created_count > 0) {
                msg.style.color = '#000000';
                msg.innerText = `${data.created_count} utilisateur(s) importé(s) avec succès !`;
                loadUsers();
            } else {
                msg.style.color = '#dc2626';
                msg.innerText = `Aucun utilisateur créé. Veuillez corriger les erreurs indiquées ci-dessous.`;
            }
        } else {
            msg.style.color = '#dc2626';
            msg.innerText = data.error || "Erreur lors de l'importation du fichier.";
        }
    } catch (e) {
        console.error("uploadBulkUsers error:", e);
        msg.style.color = '#dc2626';
        msg.innerText = "Erreur de communication avec le serveur.";
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Lancer l\'importation';
    }
};

function openEditUserModal(id) {
    const user = window.allUsers.find(u => u.id === id);
    if (!user) return;
    
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-matricule').value = user.matricule || '';
    document.getElementById('edit-password').value = '';
    document.getElementById('edit-nom').value = user.nom || '';
    document.getElementById('edit-prenom').value = user.prenom || '';
    document.getElementById('edit-email').value = user.email || '';
    document.getElementById('edit-direction').value = user.direction || '';
    document.getElementById('edit-poste').value = user.poste || '';
    document.getElementById('edit-statut-contrat').value = user.statut_contrat || 'CDI';
    document.getElementById('edit-date-embauche').value = user.date_embauche ? user.date_embauche.split(' ')[0] : '';
    document.getElementById('edit-role').value = user.role || 'user';
    document.getElementById('edit-user-msg').innerText = '';
    
    document.getElementById('edit-user-modal').style.display = 'flex';
}

function closeEditUserModal() {
    document.getElementById('edit-user-modal').style.display = 'none';
    document.getElementById('edit-user-msg').innerText = '';
}

async function saveUserEdit() {
    const id = document.getElementById('edit-user-id').value;
    const matricule = document.getElementById('edit-matricule').value.trim();
    const password = document.getElementById('edit-password').value.trim();
    const nom = document.getElementById('edit-nom').value.trim();
    const prenom = document.getElementById('edit-prenom').value.trim();
    const email = document.getElementById('edit-email').value.trim();
    const direction = document.getElementById('edit-direction').value.trim();
    const poste = document.getElementById('edit-poste').value.trim();
    const statut_contrat = document.getElementById('edit-statut-contrat').value;
    const date_embauche = document.getElementById('edit-date-embauche').value;
    const role = document.getElementById('edit-role').value;
    const msg = document.getElementById('edit-user-msg');
    
    if (!matricule || !nom || !prenom) {
        msg.style.color = '#dc2626';
        msg.innerText = "Matricule, nom et prénom sont obligatoires.";
        return;
    }
    
    try {
        const bodyData = { matricule, nom, prenom, email, poste, direction, statut_contrat, date_embauche, role };
        if (password) bodyData.password = password;
        
        const res = await fetch(`/api/users/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(bodyData)
        });
        const data = await res.json();
        
        if (data.success) {
            if (currentUser && currentUser.id == id) {
                currentUser.matricule = matricule;
                currentUser.nom = nom;
                currentUser.prenom = prenom;
                currentUser.email = email;
                currentUser.poste = poste;
                currentUser.direction = direction;
                currentUser.statut_contrat = statut_contrat;
                currentUser.date_embauche = date_embauche;
                currentUser.role = role;
                sessionStorage.setItem('ia_formation_user', JSON.stringify(currentUser));
                applyAuthState();
            }
            
            closeEditUserModal();
            loadUsers();
        } else {
            msg.style.color = '#dc2626';
            msg.innerText = data.error || "Erreur lors de la modification.";
        }
    } catch (e) {
        console.error("saveUserEdit error:", e);
        msg.style.color = '#dc2626';
        msg.innerText = "Erreur de communication avec le serveur.";
    }
}

async function deleteUser(id, matricule) {
    if (!confirm(`Voulez-vous vraiment supprimer l'utilisateur [${matricule || id}] ?`)) return;
    try {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            loadUsers();
        } else {
            alert(data.error || "Erreur lors de la suppression");
        }
    } catch (e) {
        console.error("deleteUser error:", e);
        alert("Erreur lors de la suppression de l'utilisateur.");
    }
}

// =========================================================================
// MOTEUR D'ASSIGNATION DÉDIÉ : RÈGLES DYNAMIQUES, BULK ASSIGN & MATRICE
// =========================================================================

window.assignmentRules = [];
window.assignmentsMatrix = [];
window.selectedRuleCourseIds = new Set();
window.selectedManualCourseIds = new Set();
window.selectedManualUserIds = new Set();
window.currentAssignmentTab = 'rules';

window.switchAssignmentTab = function(tabName) {
    window.currentAssignmentTab = tabName;
    ['rules', 'manual', 'matrix'].forEach(t => {
        const sec = document.getElementById(`assignment-section-${t}`);
        const btn = document.getElementById(`tab-btn-${t}`);
        if (sec) sec.style.display = (t === tabName) ? 'block' : 'none';
        if (btn) {
            if (t === tabName) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });

    if (tabName === 'rules') {
        loadAssignmentRules();
    } else if (tabName === 'manual') {
        loadManualAssignData();
    } else if (tabName === 'matrix') {
        loadAssignmentsMatrix();
    }
};

window.loadAssignmentPageData = function() {
    loadUsers();
    loadCourses();
    window.switchAssignmentTab(window.currentAssignmentTab || 'rules');
};

// --- 1. RÈGLES & PARCOURS AUTOMATIQUES ---

async function loadAssignmentRules() {
    try {
        const res = await fetch('/api/assignment_rules?t=' + new Date().getTime());
        if (res.ok) {
            window.assignmentRules = await res.json();
            const badge = document.getElementById('rules-count-badge');
            if (badge) badge.innerText = window.assignmentRules.length;
            renderAssignmentRules();
        }
    } catch (e) {
        console.error("loadAssignmentRules error:", e);
    }
}

function renderAssignmentRules() {
    const grid = document.getElementById('assignment-rules-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (window.assignmentRules.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; background: white; padding: 40px 20px; text-align: center; border-radius: 12px; border: 1px dashed #cbd5e1;">
                <p style="color: #64748b; font-size: 15px; margin: 0 0 15px 0;">Aucun parcours d'attribution automatique n'est actuellement configuré.</p>
                <button onclick="openNewRuleModal()" class="submit-btn" style="width: auto; padding: 10px 22px; display: inline-block;">
                    Créer le premier Parcours Dynamique
                </button>
            </div>
        `;
        return;
    }

    window.assignmentRules.forEach(rule => {
        const courseIds = rule.course_ids_list || [];
        const courseNames = courseIds.map(cid => {
            const found = courses.find(c => c.id == cid);
            return found ? found.title : `Cours #${cid}`;
        });

        const dirTag = rule.target_direction ? `Dir: <strong>${rule.target_direction}</strong>` : 'Toutes les directions';
        const posteTag = rule.target_poste ? `Poste: <strong>${rule.target_poste}</strong>` : 'Tous les postes';
        const contratTag = rule.target_contrat ? `Statut: <strong>${rule.target_contrat}</strong>` : 'Tous contrats';
        const ancTag = rule.max_anciennete_days ? `< ${rule.max_anciennete_days}j d'ancienneté` : 'Toute ancienneté';

        grid.innerHTML += `
            <div class="rule-card">
                <div>
                    <div class="rule-header">
                        <div>
                            <span class="tag-auto-rule">PARCOURS AUTOMATIQUE</span>
                            <h3 style="margin: 8px 0 4px 0; color: #0f172a; font-size: 17px; font-weight: 700;">${rule.name}</h3>
                            ${rule.description ? `<p style="margin: 0; color: #64748b; font-size: 12px;">${rule.description}</p>` : ''}
                        </div>
                    </div>

                    <div style="display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0;">
                        <span class="rule-criteria-badge">${dirTag}</span>
                        <span class="rule-criteria-badge">${posteTag}</span>
                        <span class="rule-criteria-badge">${contratTag}</span>
                        <span class="rule-criteria-badge">${ancTag}</span>
                    </div>

                    <div class="rule-courses-list">
                        <strong style="color: #0f172a; display: block; margin-bottom: 5px;">${courseIds.length} Formation(s) incluse(s) :</strong>
                        <ul style="margin: 0; padding-left: 18px;">
                            ${courseNames.slice(0, 4).map(cn => `<li>${cn}</li>`).join('')}
                            ${courseNames.length > 4 ? `<li><em>...et ${courseNames.length - 4} autre(s)</em></li>` : ''}
                        </ul>
                    </div>
                </div>

                <div class="rule-footer">
                    <span style="font-size: 12px; color: #000000; font-weight: 700; background: #f8fafc; padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1;">
                        ${rule.matched_users_count || 0} collaborateur(s) couvert(s)
                    </span>
                    <div style="display: flex; gap: 6px;">
                        <button onclick="syncRule(${rule.id})" class="action-btn-sm" title="Forcer la réévaluation / synchronisation" style="background: #000000; color: #ffffff;">Sync</button>
                        <button onclick="openEditRuleModal(${rule.id})" class="action-btn-sm btn-edit" title="Modifier">Modifier</button>
                        <button onclick="deleteRule(${rule.id}, '${rule.name.replace(/'/g, "\\'")}')" class="action-btn-sm btn-delete" title="Supprimer">Supprimer</button>
                    </div>
                </div>
            </div>
        `;
    });
}

function openNewRuleModal() {
    document.getElementById('rule-id').value = '';
    document.getElementById('rule-name').value = '';
    document.getElementById('rule-target-direction').value = '';
    document.getElementById('rule-target-poste').value = '';
    document.getElementById('rule-target-contrat').value = '';
    document.getElementById('rule-max-anciennete').value = '';
    document.getElementById('rule-course-search').value = '';
    document.getElementById('rule-modal-msg').innerText = '';
    document.getElementById('rule-modal-title').innerText = "Créer un Parcours d'Attribution Automatique";
    window.selectedRuleCourseIds = new Set();
    
    renderRuleCoursesSelection();
    updateRuleMatchPreview();
    document.getElementById('rule-modal').style.display = 'flex';
}

function openEditRuleModal(id) {
    const rule = window.assignmentRules.find(r => r.id === id);
    if (!rule) return;

    document.getElementById('rule-id').value = rule.id;
    document.getElementById('rule-name').value = rule.name || '';
    document.getElementById('rule-target-direction').value = rule.target_direction || '';
    document.getElementById('rule-target-poste').value = rule.target_poste || '';
    document.getElementById('rule-target-contrat').value = rule.target_contrat || '';
    document.getElementById('rule-max-anciennete').value = rule.max_anciennete_days || '';
    document.getElementById('rule-course-search').value = '';
    document.getElementById('rule-modal-msg').innerText = '';
    document.getElementById('rule-modal-title').innerText = "Modifier le Parcours Dynamique";

    window.selectedRuleCourseIds = new Set(rule.course_ids_list || []);
    renderRuleCoursesSelection();
    updateRuleMatchPreview();
    document.getElementById('rule-modal').style.display = 'flex';
}

function closeRuleModal() {
    document.getElementById('rule-modal').style.display = 'none';
    window.selectedRuleCourseIds = new Set();
}

function renderRuleCoursesSelection() {
    const container = document.getElementById('rule-courses-selection-list');
    if (!container) return;
    const query = (document.getElementById('rule-course-search')?.value || '').toLowerCase().trim();

    const filtered = courses.filter(c => {
        if (!query) return true;
        return (c.title || '').toLowerCase().includes(query) ||
               (c.domain || '').toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
        container.innerHTML = '<p style="color: #94a3b8; font-style: italic; text-align: center; padding: 10px;">Aucun cours trouvé.</p>';
        return;
    }

    container.innerHTML = filtered.map(c => {
        const isChecked = window.selectedRuleCourseIds.has(c.id);
        return `
            <div class="course-checkbox-item ${isChecked ? 'checked' : ''}" onclick="toggleRuleCourseCheckbox(${c.id})">
                <input type="checkbox" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation(); toggleRuleCourseCheckbox(${c.id});" style="cursor: pointer; accent-color: #e9041e;">
                <div style="flex: 1;">
                    <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${c.title}</div>
                    <div style="font-size: 11px; color: #64748b;">${c.domain || 'Général'} • ${c.duration || 0}h • ${c.level || 'Débutant'}</div>
                </div>
            </div>
        `;
    }).join('');
}

function toggleRuleCourseCheckbox(courseId) {
    if (window.selectedRuleCourseIds.has(courseId)) {
        window.selectedRuleCourseIds.delete(courseId);
    } else {
        window.selectedRuleCourseIds.add(courseId);
    }
    renderRuleCoursesSelection();
}

function calculateAncienneteDaysJs(dateStr) {
    if (!dateStr) return 0;
    try {
        const d = new Date(dateStr.split(' ')[0]);
        const now = new Date();
        const diffTime = Math.abs(now - d);
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    } catch (e) {
        return 0;
    }
}

function updateRuleMatchPreview() {
    const dir = (document.getElementById('rule-target-direction')?.value || '').toLowerCase().trim();
    const poste = (document.getElementById('rule-target-poste')?.value || '').toLowerCase().trim();
    const contrat = (document.getElementById('rule-target-contrat')?.value || '').toLowerCase().trim();
    const maxAncStr = document.getElementById('rule-max-anciennete')?.value || '';
    const maxAnc = maxAncStr ? parseInt(maxAncStr) : null;

    const matchedUsers = (window.allUsers || []).filter(u => {
        if (u.role === 'admin' || u.role === 'superadmin') return false;
        
        const uDir = (u.direction || '').toLowerCase().trim();
        const uPoste = (u.poste || '').toLowerCase().trim();
        const uContrat = (u.statut_contrat || '').toLowerCase().trim();
        const uDays = calculateAncienneteDaysJs(u.date_embauche);

        if (dir && !uDir.includes(dir) && !dir.includes(uDir)) return false;
        if (poste && !uPoste.includes(poste) && !poste.includes(uPoste)) return false;
        if (contrat && uContrat !== contrat) return false;
        if (maxAnc !== null && uDays > maxAnc) return false;
        return true;
    });

    const textEl = document.getElementById('rule-preview-text');
    if (textEl) {
        textEl.innerText = `${matchedUsers.length} collaborateur(s) actif(s) correspondent actuellement à ces critères.`;
    }
}

async function saveRule() {
    const id = document.getElementById('rule-id').value;
    const name = document.getElementById('rule-name').value.trim();
    const target_direction = document.getElementById('rule-target-direction').value.trim();
    const target_poste = document.getElementById('rule-target-poste').value.trim();
    const target_contrat = document.getElementById('rule-target-contrat').value;
    const max_anciennete_days = document.getElementById('rule-max-anciennete').value || null;
    const course_ids = Array.from(window.selectedRuleCourseIds);
    const msg = document.getElementById('rule-modal-msg');

    if (!name) {
        msg.style.color = '#dc2626';
        msg.innerText = "Le nom du parcours est obligatoire.";
        return;
    }
    if (course_ids.length === 0) {
        msg.style.color = '#dc2626';
        msg.innerText = "Veuillez sélectionner au moins une formation pour ce parcours.";
        return;
    }

    try {
        const payload = {
            name, target_direction, target_poste, target_contrat,
            max_anciennete_days: max_anciennete_days ? parseInt(max_anciennete_days) : null,
            course_ids,
            created_by: currentUser ? currentUser.id : 1
        };

        const url = id ? `/api/assignment_rules/${id}` : '/api/assignment_rules';
        const method = id ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            msg.style.color = '#000000';
            msg.innerText = "Parcours enregistré et synchronisé avec succès !";
            loadAssignmentRules();
            loadUsers();
            setTimeout(() => { closeRuleModal(); }, 800);
        } else {
            msg.style.color = '#dc2626';
            msg.innerText = data.error || "Erreur lors de l'enregistrement.";
        }
    } catch (e) {
        console.error("saveRule error:", e);
        msg.style.color = '#dc2626';
        msg.innerText = "Erreur de communication avec le serveur.";
    }
}

async function deleteRule(id, name) {
    if (!confirm(`Voulez-vous vraiment supprimer le parcours automatique [${name}] ?`)) return;
    try {
        const res = await fetch(`/api/assignment_rules/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            loadAssignmentRules();
        } else {
            alert(data.error || "Erreur lors de la suppression.");
        }
    } catch (e) {
        console.error("deleteRule error:", e);
    }
}

async function syncRule(id) {
    try {
        const res = await fetch(`/api/assignment_rules/${id}/sync`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            alert("Synchronisation effectuée ! Tous les collaborateurs correspondants ont reçu les formations.");
            loadAssignmentRules();
            loadUsers();
        }
    } catch (e) {
        console.error("syncRule error:", e);
    }
}

// --- 2. ASSIGNATION PONCTUELLE MULTICRITÈRES ---

function loadManualAssignData() {
    window.selectedManualCourseIds = new Set();
    window.selectedManualUserIds = new Set();
    renderManualCoursesSelection();
    filterManualTargetUsers();
}

function renderManualCoursesSelection() {
    const container = document.getElementById('manual-courses-selection-list');
    if (!container) return;
    const query = (document.getElementById('manual-course-search')?.value || '').toLowerCase().trim();

    const filtered = courses.filter(c => {
        if (!query) return true;
        return (c.title || '').toLowerCase().includes(query) ||
               (c.domain || '').toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
        container.innerHTML = '<p style="color: #94a3b8; font-style: italic; text-align: center; padding: 10px;">Aucun cours trouvé.</p>';
        updateManualCoursesCountInfo();
        return;
    }

    container.innerHTML = filtered.map(c => {
        const isChecked = window.selectedManualCourseIds.has(c.id);
        return `
            <div class="course-checkbox-item ${isChecked ? 'checked' : ''}" onclick="toggleManualCourseCheckbox(${c.id})">
                <input type="checkbox" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation(); toggleManualCourseCheckbox(${c.id});" style="cursor: pointer; accent-color: #e9041e;">
                <div style="flex: 1;">
                    <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${c.title}</div>
                    <div style="font-size: 11px; color: #64748b;">${c.domain || 'Général'} • ${c.duration || 0}h • ${c.level || 'Débutant'}</div>
                </div>
            </div>
        `;
    }).join('');
    updateManualCoursesCountInfo();
}

function toggleManualCourseCheckbox(courseId) {
    if (window.selectedManualCourseIds.has(courseId)) {
        window.selectedManualCourseIds.delete(courseId);
    } else {
        window.selectedManualCourseIds.add(courseId);
    }
    renderManualCoursesSelection();
}

function selectAllManualCourses(checked) {
    if (checked) {
        courses.forEach(c => window.selectedManualCourseIds.add(c.id));
    } else {
        window.selectedManualCourseIds.clear();
    }
    renderManualCoursesSelection();
}

function updateManualCoursesCountInfo() {
    const count = window.selectedManualCourseIds.size;
    const info = document.getElementById('manual-courses-count-info');
    if (info) info.innerText = `${count} formation(s) sélectionnée(s) sur ${courses.length}`;
}

function filterManualTargetUsers() {
    const dir = (document.getElementById('manual-filter-direction')?.value || '').toLowerCase().trim();
    const poste = (document.getElementById('manual-filter-poste')?.value || '').toLowerCase().trim();
    const contrat = (document.getElementById('manual-filter-contrat')?.value || '').toLowerCase().trim();
    const ancStr = document.getElementById('manual-filter-anciennete')?.value || '';
    const maxAnc = ancStr ? parseInt(ancStr) : null;

    const filteredUsers = (window.allUsers || []).filter(u => {
        if (u.role === 'admin' || u.role === 'superadmin') return false;
        
        const uDir = (u.direction || '').toLowerCase().trim();
        const uPoste = (u.poste || '').toLowerCase().trim();
        const uContrat = (u.statut_contrat || '').toLowerCase().trim();
        const uDays = calculateAncienneteDaysJs(u.date_embauche);

        if (dir && !uDir.includes(dir) && !dir.includes(uDir)) return false;
        if (poste && !uPoste.includes(poste) && !poste.includes(uPoste)) return false;
        if (contrat && uContrat !== contrat) return false;
        if (maxAnc !== null && uDays > maxAnc) return false;
        return true;
    });

    const tbody = document.getElementById('manual-target-users-tbody');
    const countEl = document.getElementById('manual-target-users-count');
    if (countEl) countEl.innerText = filteredUsers.length;

    if (!tbody) return;
    tbody.innerHTML = '';

    if (filteredUsers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8; font-style: italic;">
                    Aucun collaborateur ne correspond à ces critères.
                </td>
            </tr>
        `;
        return;
    }

    filteredUsers.forEach(u => {
        const isChecked = window.selectedManualUserIds.has(u.id);
        const nomComplet = `${u.nom || ''} ${u.prenom || ''}`.trim() || '-';
        const dateEmbaucheDisplay = u.date_embauche ? u.date_embauche.split(' ')[0] : '-';

        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 12px; text-align: center;">
                    <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleManualUserCheckbox(${u.id})" style="cursor: pointer; accent-color: #e9041e;">
                </td>
                <td style="padding: 10px 12px; font-weight: 700; color: #0f172a;">${u.matricule || '-'}</td>
                <td style="padding: 10px 12px;"><strong>${nomComplet}</strong></td>
                <td style="padding: 10px 12px;">${u.direction || '-'}</td>
                <td style="padding: 10px 12px;">${u.poste || '-'}</td>
                <td style="padding: 10px 12px;"><span class="tag tag-domain" style="font-size: 11px;">${u.statut_contrat || 'CDI'}</span></td>
                <td style="padding: 10px 12px; font-size: 12px; color: #64748b;">${dateEmbaucheDisplay}</td>
            </tr>
        `;
    });
}

function toggleManualUserCheckbox(userId) {
    if (window.selectedManualUserIds.has(userId)) {
        window.selectedManualUserIds.delete(userId);
    } else {
        window.selectedManualUserIds.add(userId);
    }
}

function selectAllManualUsers(checked) {
    const dir = (document.getElementById('manual-filter-direction')?.value || '').toLowerCase().trim();
    const poste = (document.getElementById('manual-filter-poste')?.value || '').toLowerCase().trim();
    const contrat = (document.getElementById('manual-filter-contrat')?.value || '').toLowerCase().trim();
    const ancStr = document.getElementById('manual-filter-anciennete')?.value || '';
    const maxAnc = ancStr ? parseInt(ancStr) : null;

    const filteredUsers = (window.allUsers || []).filter(u => {
        if (u.role === 'admin' || u.role === 'superadmin') return false;
        const uDir = (u.direction || '').toLowerCase().trim();
        const uPoste = (u.poste || '').toLowerCase().trim();
        const uContrat = (u.statut_contrat || '').toLowerCase().trim();
        const uDays = calculateAncienneteDaysJs(u.date_embauche);

        if (dir && !uDir.includes(dir) && !dir.includes(uDir)) return false;
        if (poste && !uPoste.includes(poste) && !poste.includes(uPoste)) return false;
        if (contrat && uContrat !== contrat) return false;
        if (maxAnc !== null && uDays > maxAnc) return false;
        return true;
    });

    if (checked) {
        filteredUsers.forEach(u => window.selectedManualUserIds.add(u.id));
    } else {
        filteredUsers.forEach(u => window.selectedManualUserIds.delete(u.id));
    }
    filterManualTargetUsers();
}

async function executeManualBulkAssign() {
    const user_ids = Array.from(window.selectedManualUserIds);
    const course_ids = Array.from(window.selectedManualCourseIds);
    const msg = document.getElementById('manual-assign-msg');

    if (course_ids.length === 0) {
        msg.style.color = '#dc2626';
        msg.innerText = "Veuillez cocher au moins une formation.";
        return;
    }
    if (user_ids.length === 0) {
        msg.style.color = '#dc2626';
        msg.innerText = "Veuillez cocher au moins un collaborateur ciblé.";
        return;
    }

    msg.style.color = '#e9041e';
    msg.innerText = "Assignation en cours...";

    try {
        const res = await fetch('/api/manual_bulk_assign', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                user_ids,
                course_ids,
                assigned_by: currentUser ? currentUser.id : 1
            })
        });
        const data = await res.json();

        if (data.success) {
            msg.style.color = '#000000';
            msg.innerText = `Succès ! Formations assignées aux ${user_ids.length} collaborateurs.`;
            loadUsers();
            setTimeout(() => {
                msg.innerText = '';
                window.switchAssignmentTab('matrix');
            }, 1200);
        } else {
            msg.style.color = '#dc2626';
            msg.innerText = data.error || "Erreur lors de l'assignation.";
        }
    } catch (e) {
        console.error("executeManualBulkAssign error:", e);
        msg.style.color = '#dc2626';
        msg.innerText = "Erreur de communication avec le serveur.";
    }
}

// --- 3. MATRICE DE SUIVI & RÉVOCATION ---

async function loadAssignmentsMatrix() {
    try {
        const res = await fetch('/api/assignments_matrix?t=' + new Date().getTime());
        if (res.ok) {
            window.assignmentsMatrix = await res.json();
            const badge = document.getElementById('matrix-count-badge');
            if (badge) badge.innerText = window.assignmentsMatrix.length;
            filterMatrixTable();
        }
    } catch (e) {
        console.error("loadAssignmentsMatrix error:", e);
    }
}

function filterMatrixTable() {
    const query = (document.getElementById('matrix-search')?.value || '').toLowerCase().trim();
    if (!query) {
        renderMatrixTable(window.assignmentsMatrix);
        return;
    }

    const filtered = window.assignmentsMatrix.filter(row => {
        const mat = (row.matricule || '').toLowerCase();
        const nom = (row.nom || '').toLowerCase();
        const prenom = (row.prenom || '').toLowerCase();
        const course = (row.course_title || '').toLowerCase();
        const dir = (row.direction || '').toLowerCase();
        const poste = (row.poste || '').toLowerCase();
        const rule = (row.rule_name || '').toLowerCase();

        return mat.includes(query) ||
               nom.includes(query) ||
               prenom.includes(query) ||
               course.includes(query) ||
               dir.includes(query) ||
               poste.includes(query) ||
               rule.includes(query);
    });

    renderMatrixTable(filtered);
}

function renderMatrixTable(rows) {
    const tbody = document.getElementById('matrix-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (rows.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 30px; color: #94a3b8; font-style: italic;">
                    Aucune assignation trouvée.
                </td>
            </tr>
        `;
        return;
    }

    rows.forEach(r => {
        const nomComplet = `${r.nom || ''} ${r.prenom || ''}`.trim() || '-';
        const dateDisplay = r.assigned_at ? r.assigned_at.split(' ')[0] : '-';
        const sourceBadge = r.source_rule_id && r.rule_name
            ? `<span class="tag-auto-rule">Parcours: ${r.rule_name}</span>`
            : `<span class="tag-manual">Manuelle</span>`;

        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px 16px;">
                    <div style="font-weight: 700; color: #0f172a;">${nomComplet}</div>
                    <div style="font-size: 11px; color: #64748b;">Matricule: ${r.matricule || '-'}</div>
                </td>
                <td style="padding: 12px 16px;">
                    <div>${r.direction || '-'}</div>
                    <div style="font-size: 11px; color: #64748b;">${r.poste || '-'}</div>
                </td>
                <td style="padding: 12px 16px;"><span class="tag tag-domain" style="font-size: 11px;">${r.statut_contrat || 'CDI'}</span></td>
                <td style="padding: 12px 16px; font-weight: 600; color: #000000;">
                    ${r.course_title}
                </td>
                <td style="padding: 12px 16px;">${sourceBadge}</td>
                <td style="padding: 12px 16px; font-size: 12px; color: #64748b;">${dateDisplay}</td>
                <td style="padding: 12px 16px; text-align: center;">
                    <button onclick="revokeAssignment(${r.assignment_id}, '${nomComplet.replace(/'/g, "\\'")}', '${r.course_title.replace(/'/g, "\\'")}')" class="action-btn-sm btn-delete" title="Révoquer l'accès">Révoquer</button>
                </td>
            </tr>
        `;
    });
}

async function revokeAssignment(id, userName, courseTitle) {
    if (!confirm(`Voulez-vous retirer l'accès de [${userName}] à la formation [${courseTitle}] ?`)) return;
    try {
        const res = await fetch(`/api/assignments/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            loadAssignmentsMatrix();
            loadUsers();
        } else {
            alert(data.error || "Erreur lors de la révocation.");
        }
    } catch (e) {
        console.error("revokeAssignment error:", e);
    }
}

// --- NAVIGATION GENERALE ---
window.navigateTo = function(pageId) {
    // Fermer le menu déroulant utilisateur s'il est ouvert
    if (typeof toggleUserDropdown === 'function') {
        toggleUserDropdown(null, false);
    }

    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // Mise à jour de l'onglet actif dans la barre de navigation
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const currentNavBtn = document.getElementById('nav-' + pageId);
    if (currentNavBtn) {
        currentNavBtn.classList.add('active');
    }
    
    // Gérer l'affichage de la barre de navigation principale
    // Sur la page de l'hologramme ('details'), la barre globale est masquée pour ne garder que la navigation dédiée épurée
    const mainNav = document.getElementById('main-nav');
    if (mainNav && currentUser) {
        mainNav.style.display = (pageId === 'details') ? 'none' : 'flex';
    }

    // Masquer le bouton assistant flottant redondant sur la page de l'hologramme
    const aiAssistant = document.getElementById('ai-assistant');
    if (aiAssistant) {
        aiAssistant.style.display = (pageId === 'details') ? 'none' : 'block';
    }

    if (pageId !== 'presentation') {
        const presAudio = document.getElementById('presentation-audio');
        if (presAudio) presAudio.pause();
        const ragAudio = document.getElementById('rag-audio-player');
        if (ragAudio) ragAudio.pause();
        const btnResume = document.getElementById('presentation-resume-btn');
        if (btnResume) btnResume.style.display = 'none';
    }
    
    if (pageId === 'dashboard') {
        const isAdminOrSuper = currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin');
        const adminView = document.getElementById('admin-dashboard-view');
        const userView = document.getElementById('user-dashboard-view');
        if (adminView) adminView.style.display = isAdminOrSuper ? 'flex' : 'none';
        if (userView) userView.style.display = isAdminOrSuper ? 'none' : 'block';
        updateDashboard();
    }
    
    if (pageId === 'users') {
        loadUsers();
    }
    
    if (pageId === 'assignments') {
        loadAssignmentPageData();
    }
    
    updateAssistantButtonUI();
};

function openNewCourseForm() {
    document.getElementById('course-form').reset();
    document.getElementById('course-id').value = '';
    document.getElementById('submit-btn').innerText = 'Enregistrer la formation';
    const fileInput = document.getElementById('course-file');
    if (fileInput) {
        fileInput.required = true;
        fileInput.value = '';
    }
    const visSelect = document.getElementById('course-visibility');
    if (visSelect) visSelect.value = 'assigned';
    toggleCourseVisibilityFields();
    removeCourseThumbnail();
    navigateTo('creation');
}
window.openNewCourseForm = openNewCourseForm;

// --- GESTION DES MINIATURES ---

function previewCourseThumbnail(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewBox = document.getElementById('course-thumbnail-preview-box');
        const previewImg = document.getElementById('course-thumbnail-preview-img');
        if (previewBox && previewImg) {
            previewImg.src = e.target.result;
            previewBox.style.display = 'block';
        }
    };
    reader.readAsDataURL(file);
}
window.previewCourseThumbnail = previewCourseThumbnail;

function removeCourseThumbnail() {
    const fileInput = document.getElementById('course-thumbnail');
    if (fileInput) fileInput.value = '';
    const existingInput = document.getElementById('course-existing-thumbnail');
    if (existingInput) existingInput.value = '';
    const previewBox = document.getElementById('course-thumbnail-preview-box');
    const previewImg = document.getElementById('course-thumbnail-preview-img');
    if (previewImg) previewImg.src = '';
    if (previewBox) previewBox.style.display = 'none';
}
window.removeCourseThumbnail = removeCourseThumbnail;

// --- VISIBILITE & CIBLAGE DES FORMATIONS ---

function toggleCourseVisibilityFields() {
    const vis = document.getElementById('course-visibility')?.value;
    const targetedBox = document.getElementById('course-targeted-box');
    if (targetedBox) {
        targetedBox.style.display = (vis === 'targeted') ? 'block' : 'none';
    }
}
window.toggleCourseVisibilityFields = toggleCourseVisibilityFields;

// --- LOGIQUE GESTION DES FORMATIONS & CATALOGUE ---

document.getElementById('course-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const id = document.getElementById('course-id').value;
    const title = (document.getElementById('course-title').value || '').trim();
    const desc = (document.getElementById('course-desc').value || '').trim();
    const domain = (document.getElementById('course-domain').value || '').trim() || 'Général';
    const duration = document.getElementById('course-duration').value || '1';
    const level = document.getElementById('course-level').value;
    const visibility = document.getElementById('course-visibility')?.value || 'assigned';
    const target_directions = document.getElementById('course-target-directions')?.value.trim() || '';
    const target_postes = document.getElementById('course-target-postes')?.value.trim() || '';
    const fileInput = document.getElementById('course-file');
    const thumbInput = document.getElementById('course-thumbnail');
    const existingThumbnail = document.getElementById('course-existing-thumbnail')?.value || '';
    
    if (!id && (!fileInput.files || fileInput.files.length === 0)) {
        alert("Veuillez sélectionner un Document source (*)");
        fileInput.focus();
        return;
    }
    
    if (!title) {
        alert("Veuillez saisir le Titre de la formation (*)");
        document.getElementById('course-title').focus();
        return;
    }
    
    if (!desc) {
        alert("Veuillez saisir la Description & Consignes pour l'IA (*)");
        document.getElementById('course-desc').focus();
        return;
    }
    
    // Afficher l'écran de chargement
    document.getElementById('loading-overlay').style.display = 'flex';
    
    try {
        const tutorVoice = (document.getElementById('course-tutor-voice')?.value || 'auto').trim();
        
        if (!id) {
            // Création : envoi au backend Python
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            formData.append('title', title);
            formData.append('desc', desc);
            formData.append('domain', domain);
            formData.append('duration', duration);
            formData.append('level', level);
            formData.append('visibility', visibility);
            formData.append('target_directions', target_directions);
            formData.append('target_postes', target_postes);
            formData.append('thumbnail_url', existingThumbnail);
            formData.append('tutor_voice', tutorVoice);
            
            if (thumbInput && thumbInput.files.length > 0) {
                formData.append('thumbnail', thumbInput.files[0]);
            }
            
            const apiKey = window.config ? window.config.GEMINI_API_KEY : '';
            formData.append('api_key', apiKey);
            
            const response = await fetch('/api/create_course', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Erreur lors de la création");
            }
        } else {
            // Modification : si une nouvelle miniature est fournie ou formulaire standard
            if (thumbInput && thumbInput.files.length > 0) {
                const formData = new FormData();
                formData.append('title', title);
                formData.append('desc', desc);
                formData.append('domain', domain);
                formData.append('duration', duration);
                formData.append('level', level);
                formData.append('visibility', visibility);
                formData.append('target_directions', target_directions);
                formData.append('target_postes', target_postes);
                formData.append('thumbnail', thumbInput.files[0]);
                formData.append('thumbnail_url', existingThumbnail);
                formData.append('tutor_voice', tutorVoice);
                
                const response = await fetch('/api/courses/' + id, {
                    method: 'PUT',
                    body: formData
                });
                if (!response.ok) {
                    throw new Error("Erreur lors de la modification");
                }
            } else {
                const response = await fetch('/api/courses/' + id, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        title, desc, domain, duration, level,
                        visibility, target_directions, target_postes,
                        thumbnail_url: existingThumbnail,
                        tutor_voice: tutorVoice
                    })
                });
                if (!response.ok) {
                    throw new Error("Erreur lors de la modification");
                }
            }
        }
        
        // Rafraîchir la liste depuis SQLite
        await loadCourses();
        
        // Vider le formulaire
        this.reset();
        document.getElementById('course-id').value = '';
        if (document.getElementById('course-tutor-voice')) {
            document.getElementById('course-tutor-voice').value = 'auto';
        }
        document.getElementById('submit-btn').innerText = 'Enregistrer la formation';
        toggleCourseVisibilityFields();
        removeCourseThumbnail();
        
        // Mettre à jour l'affichage du catalogue
        renderCatalog();
        
        // Cacher chargement
        document.getElementById('loading-overlay').style.display = 'none';
        
        // Retourner au catalogue
        window.navigateTo('consultation');
        
    } catch (err) {
        console.error(err);
        alert("Erreur: " + err.message);
        document.getElementById('loading-overlay').style.display = 'none';
    }
});

async function loadCourses() {
    try {
        const userIdParam = currentUser ? `?user_id=${currentUser.id}` : '';
        const response = await fetch(`/api/courses${userIdParam}`);
        if (response.ok) {
            courses = await response.json();
            renderCatalog();
        }
    } catch(e) {
        console.error("Erreur de chargement depuis la DB Python:", e);
    }
}

function setCatalogFilter(filter) {
    window.currentCatalogFilter = filter;
    document.getElementById('tab-all-courses')?.classList.toggle('active', filter === 'all');
    document.getElementById('tab-assigned-courses')?.classList.toggle('active', filter === 'assigned');
    renderCatalog();
}

function filterCatalogCourses() {
    window.catalogSearchQuery = (document.getElementById('course-search-input')?.value || '').toLowerCase().trim();
    renderCatalog();
}

function renderCatalog() {
    const catalog = document.getElementById('course-catalog');
    if (!catalog) return;
    
    // Mettre à jour les compteurs d'onglets
    const totalCount = courses.length;
    const assignedCount = courses.filter(c => c.is_assigned).length;
    
    const totalBadge = document.getElementById('total-courses-badge');
    if (totalBadge) totalBadge.innerText = totalCount;
    const assignedBadge = document.getElementById('assigned-courses-badge');
    if (assignedBadge) assignedBadge.innerText = assignedCount;
    
    // Filtrage des cours
    let filtered = courses;
    if (window.currentCatalogFilter === 'assigned') {
        filtered = filtered.filter(c => c.is_assigned);
    }
    
    if (window.catalogSearchQuery) {
        filtered = filtered.filter(c => {
            return (c.title || '').toLowerCase().includes(window.catalogSearchQuery) ||
                   (c.desc || '').toLowerCase().includes(window.catalogSearchQuery) ||
                   (c.domain || '').toLowerCase().includes(window.catalogSearchQuery) ||
                   (c.level || '').toLowerCase().includes(window.catalogSearchQuery) ||
                   (c.target_directions || '').toLowerCase().includes(window.catalogSearchQuery) ||
                   (c.target_postes || '').toLowerCase().includes(window.catalogSearchQuery);
        });
    }

    if (filtered.length === 0) {
        if (window.currentCatalogFilter === 'assigned') {
            catalog.innerHTML = '<p class="empty-msg">Aucune formation ne vous a été assignée pour le moment.</p>';
        } else {
            catalog.innerHTML = '<p class="empty-msg">Aucune formation disponible pour le moment.</p>';
        }
        updateDashboard();
        return;
    }
    
    let html = '';
    filtered.forEach(course => {
        const isAdminOrSuper = currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin');
        
        // Tag de visibilité pour les administrateurs
        let visibilityBadge = '';
        let targetDetailHtml = '';
        if (isAdminOrSuper) {
            if (course.visibility === 'targeted') {
                let targets = [];
                if (course.target_directions) targets.push(`Dir: ${course.target_directions}`);
                if (course.target_postes) targets.push(`Postes: ${course.target_postes}`);
                let targetText = targets.join(' | ') || 'Ciblé';
                visibilityBadge = `<span class="badge-visibility-targeted" title="${targetText}">Ciblé</span>`;
                targetDetailHtml = `<div class="course-target-detail">${targetText}</div>`;
            } else if (course.visibility === 'assigned') {
                visibilityBadge = `<span class="badge-visibility-assigned">Sur assignation</span>`;
            } else {
                visibilityBadge = `<span class="badge-visibility-public">Public</span>`;
            }
        }

        const thumbnailHtml = course.thumbnail_url 
            ? `<img src="${course.thumbnail_url}" alt="${course.title || 'Formation'}">`
            : `<div class="thumbnail-placeholder">${course.domain || 'Formation'}</div>`;

        const hasDownloads = Boolean(course.pdf_url || course.pptx_url);

        html += `
        <div class="course-card ${course.is_assigned ? 'course-card-assigned' : ''}">
            <div class="course-card-thumbnail">
                ${thumbnailHtml}
                <div class="course-thumbnail-overlay-top">
                    <span class="course-domain-badge">${course.domain || 'Général'}</span>
                    ${visibilityBadge}
                </div>
                ${course.is_assigned ? '<div class="course-assigned-floating-badge">Assignée</div>' : ''}
                ${(!isAdminOrSuper && course.user_evaluation) ? `<div style="position: absolute; bottom: 8px; right: 8px; background: ${course.user_evaluation.passed ? '#000000' : '#e9041e'}; color: white; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; box-shadow: 0 2px 6px rgba(0,0,0,0.25);">${Math.round(course.user_evaluation.score)}%</div>` : ''}
            </div>

            <div class="course-card-body">
                <div>
                    <h3 class="course-card-title" title="${course.title || ''}">${course.title || 'Sans titre'}</h3>
                    <p class="course-card-desc" title="${course.desc || ''}">${course.desc || 'Aucune description disponible.'}</p>
                    
                    <div class="course-meta-row">
                        <div class="course-meta-item">
                            <span class="meta-label">Durée</span>
                            <span class="meta-value">${course.duration || 0} h</span>
                        </div>
                        <div class="course-meta-divider"></div>
                        <div class="course-meta-item">
                            <span class="meta-label">Niveau</span>
                            <span class="meta-value">${course.level || 'Débutant'}</span>
                        </div>
                        <div class="course-meta-divider"></div>
                        <div class="course-meta-item">
                            <span class="meta-label">Tuteur</span>
                            <span class="meta-value" style="color: #000000; font-weight: 700;">${course.tutor_name || 'IA'}</span>
                        </div>
                    </div>

                    ${targetDetailHtml}
                    ${(() => {
                        if (isAdminOrSuper) return '';
                        if (course.has_completed_training) {
                            return `
                            <div style="margin-top: 8px; padding: 6px 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 11.5px; display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-weight: 700; color: #000000; display: inline-flex; align-items: center; gap: 5px;">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    Formation terminée
                                </span>
                                <strong style="color: #000000;">100%</strong>
                            </div>`;
                        } else if (course.user_progress && course.user_progress.current_slide > 1) {
                            const curS = course.user_progress.current_slide;
                            const totS = course.user_progress.total_slides || 1;
                            const pct = Math.round(course.user_progress.progress_percent || ((curS / totS) * 100));
                            return `
                            <div style="margin-top: 8px; padding: 6px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11.5px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <span style="font-weight: 700; color: #e9041e; display: inline-flex; align-items: center; gap: 4px;">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e9041e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                        En cours : Slide ${curS}/${totS}
                                    </span>
                                    <strong style="color: #475569;">${pct}%</strong>
                                </div>
                                <div style="width: 100%; height: 4px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                                    <div style="height: 100%; background: #e9041e; width: ${pct}%;"></div>
                                </div>
                            </div>`;
                        }
                        return '';
                    })()}
                    ${(!isAdminOrSuper && course.user_evaluation) ? `
                    <div style="margin-top: 8px; padding: 6px 10px; background: ${course.user_evaluation.passed ? '#f8fafc' : '#fff5f5'}; border: 1px solid ${course.user_evaluation.passed ? '#cbd5e1' : '#fca5a5'}; border-radius: 8px; font-size: 11.5px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 700; color: ${course.user_evaluation.passed ? '#000000' : '#e9041e'};">
                            ${course.user_evaluation.passed ? 'Test Validé' : 'Test à consolider'}
                        </span>
                        <strong style="color: #0f172a;">Score: ${Math.round(course.user_evaluation.score)}%</strong>
                    </div>
                    ` : ''}
                </div>

                <div class="course-card-actions-wrapper">
                    <button onclick="viewCourse(${course.id})" class="btn-primary-consult">
                        <span>${isAdminOrSuper ? 'Aperçu' : 'Lancer la formation'}</span>
                    </button>

                    ${hasDownloads ? `
                    <div class="course-downloads-row">
                        ${course.pdf_url ? `
                            <a href="/api/courses/${course.id}/download/pdf${currentUser ? '?user_id=' + currentUser.id : ''}" 
                               class="btn-download-pdf" 
                               onclick="if(typeof trackDocumentDownload==='function') trackDocumentDownload(${course.id}, 'PDF');"
                               title="Télécharger le support de cours officiel archivé (PDF)">
                                Support PDF
                            </a>
                        ` : ''}
                        ${course.pptx_url ? `
                            <a href="/api/courses/${course.id}/download/pptx${currentUser ? '?user_id=' + currentUser.id : ''}" 
                               class="btn-download-pptx" 
                               onclick="if(typeof trackDocumentDownload==='function') trackDocumentDownload(${course.id}, 'PPTX');"
                               title="Télécharger la présentation officielle archivée (PPTX)">
                                PPTX
                            </a>
                        ` : ''}
                    </div>
                    ` : ''}

                    ${isAdminOrSuper ? `
                    <div class="course-admin-actions-row">
                        <button onclick="editCourse(${course.id})" class="btn-admin-edit" title="Modifier cette formation">
                            Modifier
                        </button>
                        <button onclick="deleteCourse(${course.id})" class="btn-admin-delete" title="Supprimer cette formation">
                            Supprimer
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
        `;
    });
    catalog.innerHTML = html;
    
    // Mettre à jour le dashboard à chaque rendu
    updateDashboard();
}

let domainChartInstance = null;

async function updateDashboard() {
    if (!currentUser) return;
    const isAdminOrSuper = currentUser.role === 'admin' || currentUser.role === 'superadmin';
    
    if (isAdminOrSuper) {
        // Chargement automatique des statistiques enrichies V2 (Sections 18-24, 33, 35)
        await loadAdminStatsV2();
        
        const totalCourses = courses.length;
        let totalHours = 0;
        const coursesPerDomain = {};
        courses.forEach(c => {
            const h = parseFloat(c.duration) || 0;
            totalHours += h;
            const domainName = (c.domain || '').trim() || 'Non défini';
            coursesPerDomain[domainName] = (coursesPerDomain[domainName] || 0) + 1;
        });
        
        let levelCounts = { 'Débutant': 0, 'Intermédiaire': 0, 'Avancé': 0 };
        courses.forEach(c => {
            if (levelCounts[c.level] !== undefined) levelCounts[c.level]++;
        });

        const kpiLevels = document.getElementById('kpi-levels');
        if (kpiLevels) {
            kpiLevels.innerHTML = `
                <li>Débutant : <span>${levelCounts['Débutant']}</span></li>
                <li>Intermédiaire : <span>${levelCounts['Intermédiaire']}</span></li>
                <li>Avancé : <span>${levelCounts['Avancé']}</span></li>
            `;
        }
        
        const ctx = document.getElementById('domainChart');
        if (ctx) {
            if (domainChartInstance) domainChartInstance.destroy();
            const labels = Object.keys(coursesPerDomain);
            const data = Object.values(coursesPerDomain);
            let showLabels = true;
            if (labels.length === 0) {
                labels.push('Aucune donnée');
                data.push(1);
                showLabels = false;
            }
            if (typeof ChartDataLabels !== 'undefined') {
                Chart.register(ChartDataLabels);
            }
            domainChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: ['#e9041e', '#000000', '#475569', '#94a3b8', '#cbd5e1', '#0f172a'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { font: { size: 12 } } },
                        datalabels: {
                            display: showLabels,
                            color: '#ffffff',
                            font: { weight: 'bold', size: 13 },
                            formatter: (value, context) => {
                                let sum = 0;
                                let dataArr = context.chart.data.datasets[0].data;
                                dataArr.map(d => { sum += d; });
                                return (value * 100 / sum).toFixed(0) + "%";
                            }
                        }
                    }
                }
            });
        }
    } else {
        // Mode Apprenant / User : Suivi des parcours avec règle des 10 jours ouvrés (Section 47)
        try {
            const mRes = await fetch('/api/assignments_matrix');
            const allAssignments = await mRes.json();
            const myAssignments = allAssignments.filter(a => a.user_id === currentUser.id);
            
            const totalAssigned = myAssignments.length;
            const completedList = myAssignments.filter(a => a.status === 'completed' || a.passed === 1);
            const inProgressList = myAssignments.filter(a => (a.status === 'in_progress' || a.status === 'assigned') && a.passed !== 1);
            const overdueList = myAssignments.filter(a => a.is_overdue === 1 && a.passed !== 1);
            
            // Calcul de la progression moyenne
            let sumProgress = 0;
            myAssignments.forEach(a => {
                if (a.passed === 1 || a.status === 'completed') sumProgress += 100;
                else if (a.final_score) sumProgress += Math.min(a.final_score, 100);
                else sumProgress += 0;
            });
            const avgProgress = totalAssigned > 0 ? Math.round(sumProgress / totalAssigned) : 0;
            
            // Mise à jour des 4 Cartes KPI Apprenant
            const kpiAssigned = document.getElementById('user-kpi-assigned-count');
            if (kpiAssigned) kpiAssigned.innerText = totalAssigned;
            const kpiProgress = document.getElementById('user-kpi-in-progress-count');
            if (kpiProgress) kpiProgress.innerText = inProgressList.length;
            const kpiCompleted = document.getElementById('user-kpi-completed-count');
            if (kpiCompleted) kpiCompleted.innerText = completedList.length;
            const kpiAvg = document.getElementById('user-kpi-avg-progress');
            if (kpiAvg) kpiAvg.innerText = `${avgProgress}%`;
            
            const badgeCount = document.getElementById('user-assigned-badge-count');
            if (badgeCount) badgeCount.innerText = totalAssigned;
            
            // Bannière d'alerte rouge en cas de retard sur une formation assignée
            const overdueBanner = document.getElementById('user-overdue-banner');
            if (overdueBanner) {
                overdueBanner.style.display = overdueList.length > 0 ? 'flex' : 'none';
            }
            
            const tbody = document.getElementById('user-assigned-courses-tbody');
            if (tbody) {
                if (myAssignments.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="6" style="padding: 40px 20px; text-align: center; color: #64748b;">
                                <div style="font-weight: 700; font-size: 15px; color: #0f172a;">Aucune formation assignée pour le moment.</div>
                                <div style="font-size: 12.5px; color: #64748b; margin-top: 4px;">Vous pouvez consulter les cours libres et publics dans le catalogue.</div>
                                <button onclick="navigateTo('consultation')" style="margin-top: 14px; background: #e9041e; color: white; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 700; font-size: 13px; cursor: pointer;">Explorer le catalogue →</button>
                            </td>
                        </tr>
                    `;
                } else {
                    tbody.innerHTML = myAssignments.map(assign => {
                        const isOverdue = (assign.is_overdue === 1 && !assign.passed);
                        const isCompleted = Boolean(assign.passed || assign.status === 'completed');
                        
                        let dueDateDisplay = 'Échéance : Aucune';
                        if (assign.due_date) {
                            try {
                                const dt = new Date(assign.due_date);
                                dueDateDisplay = dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                            } catch (e) {
                                dueDateDisplay = assign.due_date.split(' ')[0];
                            }
                        }
                        
                        let statusBadge = `<span style="background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 12px; font-size: 11.5px; font-weight: 700;">À démarrer</span>`;
                        if (isOverdue) {
                            statusBadge = `<span style="background: #fee2e2; color: #dc2626; padding: 4px 10px; border-radius: 12px; font-size: 11.5px; font-weight: 800; border: 1px solid #fca5a5;">En retard</span>`;
                        } else if (isCompleted) {
                            statusBadge = `<span style="background: #000000; color: #ffffff; padding: 4px 10px; border-radius: 12px; font-size: 11.5px; font-weight: 800;">Validé (${Math.round(assign.final_score || assign.qcm_score || 0)}%)</span>`;
                        } else if (assign.status === 'in_progress') {
                            statusBadge = `<span style="background: #f1f5f9; color: #000000; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 12px; font-size: 11.5px; font-weight: 700;">En cours</span>`;
                        }
                        
                        const pctProgress = isCompleted ? 100 : (assign.status === 'in_progress' ? 50 : 0);
                        
                        return `
                        <tr style="border-bottom: 1px solid #f1f5f9; ${isOverdue ? 'background: #fff8f8;' : ''}">
                            <td style="padding: 12px 16px;">
                                <div style="width: 44px; height: 32px; background: #0f172a; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: white; font-weight: 700;">SGCI</div>
                            </td>
                            <td style="padding: 12px 16px;">
                                <div style="font-weight: 700; color: #0f172a; font-size: 14px;">${assign.course_title}</div>
                                <div style="color: #64748b; font-size: 12px;">${assign.course_domain || 'Général'} • ${assign.course_duration || 1} h</div>
                            </td>
                            <td style="padding: 12px 16px;">
                                <span style="font-size: 12.5px; font-weight: ${isOverdue ? '800' : '600'}; color: ${isOverdue ? '#dc2626' : '#334155'};">
                                    ${dueDateDisplay}
                                </span>
                            </td>
                            <td style="padding: 12px 16px;">${statusBadge}</td>
                            <td style="padding: 12px 16px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div style="flex: 1; height: 6px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                                        <div style="width: ${pctProgress}%; height: 100%; background: ${isCompleted ? '#000000' : (isOverdue ? '#e9041e' : '#e9041e')};"></div>
                                    </div>
                                    <span style="font-size: 11.5px; font-weight: 700; color: #475569;">${pctProgress}%</span>
                                </div>
                            </td>
                            <td style="padding: 12px 16px; text-align: right;">
                                <button onclick="viewCourse(${assign.course_id})" style="background: ${isCompleted ? '#0f172a' : '#e9041e'}; color: white; border: none; padding: 7px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">
                                    ${isCompleted ? 'Revoir' : (pctProgress > 0 ? 'Reprendre' : 'Suivre')}
                                </button>
                            </td>
                        </tr>
                        `;
                    }).join('');
                }
            }
        } catch (e) {
            console.error("Erreur calcul assignations apprenant:", e);
        }
    }
}

window.loadAdminStatsV2 = async function() {
    try {
        const res = await fetch('/api/admin/stats_v2');
        const data = await res.json();
        if (!data.success) return;
        const stats = data.stats || data;
        
        const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        
        let totalC = stats.total_courses;
        if (totalC === undefined || totalC === null || totalC === 0) {
            totalC = (courses && courses.length) ? courses.length : 0;
        }
        setTxt('kpi-total', totalC);
        setTxt('kpi-assignees', stats.assigned_courses || 0);
        setTxt('kpi-retard', stats.overdue_courses || 0);
        setTxt('kpi-completion-rate', `${stats.completion_rate || 0}%`);
        
        let totalH = stats.total_hours;
        if (totalH === undefined || totalH === null || totalH === 0) {
            totalH = courses.reduce((sum, c) => sum + (parseFloat(c.duration) || 0), 0);
        }
        setTxt('kpi-hours', `${parseFloat(totalH).toFixed(1)} h`);
        setTxt('kpi-avg-score', `${stats.avg_score || 0}%`);
        setTxt('admin-badge-live-count', stats.live_connected_count || (stats.live_users ? stats.live_users.length : 0));
        setTxt('admin-badge-overdue-count', stats.overdue_courses || 0);
        
        // Indicateurs téléchargements
        const dlSum = stats.downloads_summary || (typeof stats.downloads_stats === 'object' && !Array.isArray(stats.downloads_stats) ? stats.downloads_stats : {});
        setTxt('dl-kpi-total', dlSum.total || 0);
        setTxt('dl-kpi-today', dlSum.today || 0);
        setTxt('dl-kpi-week', dlSum.week || 0);
        setTxt('dl-kpi-month', dlSum.month || 0);
        
        // Tab 2: Connectés en direct (Charte SGCI : Rouge / Noir / Blanc)
        const liveTbody = document.getElementById('live-users-tbody');
        const liveUsers = stats.live_users || [];
        const livePill = document.getElementById('live-users-pill');
        if (livePill) {
            livePill.innerHTML = `● ${liveUsers.length} session(s) active(s)`;
            livePill.style.background = liveUsers.length > 0 ? '#fee2e2' : '#f1f5f9';
            livePill.style.color = liveUsers.length > 0 ? '#e9041e' : '#64748b';
            livePill.style.borderColor = liveUsers.length > 0 ? '#fca5a5' : '#cbd5e1';
        }
        if (liveTbody) {
            if (liveUsers.length === 0) {
                liveTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 20px;">Aucun collaborateur connecté en direct pour le moment.</td></tr>';
            } else {
                liveTbody.innerHTML = liveUsers.map(u => `
                    <tr>
                        <td style="font-family: monospace; font-weight: 700; color: #000000;">${u.matricule}</td>
                        <td style="font-weight: 700; color: #000000;">${u.nom} ${u.prenom}</td>
                        <td>${u.direction || '-'}</td>
                        <td>${u.poste || '-'}</td>
                        <td>${u.active_course_title || 'Session active'}</td>
                        <td><span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #e9041e; margin-right: 6px;"></span><strong style="color: #000000;">En direct</strong></td>
                        <td style="font-size: 12px; color: #64748b;">${u.last_ping ? u.last_ping.split(' ')[1] : '-'}</td>
                    </tr>
                `).join('');
            }
        }
        
        // Tab 3: Activité par formation
        window.adminCoursesActivityData = stats.courses_activity || [];
        if (typeof window.renderCourseActivityRows === 'function') {
            window.renderCourseActivityRows(window.adminCoursesActivityData);
        } else {
            const coursesTbody = document.getElementById('courses-activity-tbody');
            if (coursesTbody) {
                const cList = window.adminCoursesActivityData;
                if (cList.length === 0) {
                    coursesTbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #64748b; padding: 20px;">Aucune formation créée.</td></tr>';
                } else {
                    coursesTbody.innerHTML = cList.map(c => `
                        <tr>
                            <td style="font-weight: 700; color: #000000;">${c.title}</td>
                            <td>${c.domain || 'Général'}</td>
                            <td><span style="background: #000000; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">${c.visibility || 'Publique'}</span></td>
                            <td style="text-align: center; font-weight: 700;">${c.inscrits || 0}</td>
                            <td style="text-align: center;">${c.actifs || 0}</td>
                            <td style="text-align: center;"><span style="color: ${c.connectes > 0 ? '#e9041e' : '#64748b'}; font-weight: 700;">${c.connectes || 0}</span></td>
                            <td style="text-align: center; font-weight: 700;">${c.progression_moyenne !== null && c.progression_moyenne !== undefined ? c.progression_moyenne + '%' : '0%'}</td>
                            <td style="text-align: center; font-weight: 700; color: #000000;">${c.taux_completion || 0}%</td>
                            <td style="text-align: center; color: #64748b;">${c.taux_abandon || 0}%</td>
                        </tr>
                    `).join('');
                }
            }
        }
        
        // Tab 4: Téléchargements — render into dl-by-course-list & dl-by-user-list divs
        const dlCourseList = document.getElementById('dl-by-course-list');
        const dlUserList = document.getElementById('dl-by-user-list');
        const dlList = stats.downloads_list || (Array.isArray(stats.downloads_stats) ? stats.downloads_stats : []);
        
        if (dlCourseList) {
            if (dlList.length === 0) {
                dlCourseList.innerHTML = '<p style="color: #64748b; font-size: 13px; margin: 0;">Aucun téléchargement enregistré.</p>';
            } else {
                const byCourse = {};
                dlList.forEach(d => {
                    const key = d.course_title || 'Inconnu';
                    if (!byCourse[key]) byCourse[key] = { total: 0, types: [] };
                    byCourse[key].total += (d.total_downloads || 0);
                    byCourse[key].types.push(d.doc_type);
                });
                dlCourseList.innerHTML = Object.entries(byCourse).map(([title, info]) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div>
                            <div style="font-weight: 700; color: #000000; font-size: 13.5px;">${title}</div>
                            <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">${info.types.join(', ')}</div>
                        </div>
                        <span style="font-weight: 800; color: #e9041e; font-size: 16px;">${info.total}</span>
                    </div>
                `).join('');
            }
        }
        
        if (dlUserList) {
            const dlByUser = stats.downloads_by_user || [];
            if (dlByUser.length === 0) {
                dlUserList.innerHTML = '<p style="color: #64748b; font-size: 13px; margin: 0;">Aucun collaborateur n\'a téléchargé de documents.</p>';
            } else {
                dlUserList.innerHTML = dlByUser.map(u => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div>
                            <div style="font-weight: 700; color: #000000; font-size: 13.5px;">${u.nom || ''} ${u.prenom || ''}</div>
                            <div style="font-size: 11.5px; color: #64748b;">${u.matricule || '-'}</div>
                        </div>
                        <span style="font-weight: 800; color: #000000; font-size: 16px;">${u.total_downloads || 0}</span>
                    </div>
                `).join('');
            }
        }
        
        // Tab 6: Retards
        const overdueTbody = document.getElementById('admin-overdue-tbody');
        if (overdueTbody) {
            const overdueList = stats.overdue_list || [];
            if (overdueList.length === 0) {
                overdueTbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #000000; font-weight: 700; padding: 20px;">Aucun retard constaté. Toutes les échéances sont respectées.</td></tr>';
            } else {
                overdueTbody.innerHTML = overdueList.map(o => `
                    <tr style="background: #fff5f5;">
                        <td style="font-family: monospace; font-weight: 800; color: #e9041e;">${o.matricule}</td>
                        <td style="font-weight: 700; color: #000000;">${o.nom} ${o.prenom}</td>
                        <td>${o.direction || '-'} / ${o.poste || '-'}</td>
                        <td style="font-weight: 600;">${o.course_title}</td>
                        <td style="font-size: 12px; color: #64748b;">${o.assigned_at ? o.assigned_at.split(' ')[0] : '-'}</td>
                        <td style="font-size: 12px; font-weight: 700; color: #e9041e;">${o.due_date ? o.due_date.split(' ')[0] : '-'}</td>
                        <td style="font-weight: 800; color: #e9041e;">+${o.delay_days || 1} j</td>
                        <td style="text-align: center;"><button onclick="openCourseDetails(${o.course_id})" class="action-btn-sm" style="background: #e9041e; color: white; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; border: none; cursor: pointer;">Voir cours</button></td>
                    </tr>
                `).join('');
            }
        }
    } catch (e) {
        console.error("loadAdminStatsV2 error:", e);
    }
};

window.renderCourseActivityRows = function(list) {
    const coursesTbody = document.getElementById('courses-activity-tbody');
    if (!coursesTbody) return;
    if (!list || list.length === 0) {
        coursesTbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #64748b; padding: 20px;">Aucune formation trouvée.</td></tr>';
        return;
    }
    coursesTbody.innerHTML = list.map(c => `
        <tr>
            <td style="font-weight: 700; color: #000000;">${c.title}</td>
            <td>${c.domain || 'Général'}</td>
            <td><span style="background: #000000; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">${c.visibility || 'Publique'}</span></td>
            <td style="text-align: center; font-weight: 700;">${c.inscrits || 0}</td>
            <td style="text-align: center;">${c.actifs || 0}</td>
            <td style="text-align: center;"><span style="color: ${c.connectes > 0 ? '#e9041e' : '#64748b'}; font-weight: 700;">${c.connectes || 0}</span></td>
            <td style="text-align: center; font-weight: 700;">${c.progression_moyenne !== null && c.progression_moyenne !== undefined ? c.progression_moyenne + '%' : '0%'}</td>
            <td style="text-align: center; font-weight: 700; color: #000000;">${c.taux_completion || 0}%</td>
            <td style="text-align: center; color: #64748b;">${c.taux_abandon || 0}%</td>
        </tr>
    `).join('');
};

window.filterCourseActivityTable = function() {
    const q = (document.getElementById('filter-course-activity-input')?.value || '').toLowerCase().trim();
    if (!window.adminCoursesActivityData) return;
    const filtered = window.adminCoursesActivityData.filter(c => 
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.domain && c.domain.toLowerCase().includes(q))
    );
    window.renderCourseActivityRows(filtered);
};

window.switchAdminDashboardTab = function(tabKey) {
    const tabs = ['overview', 'live', 'courses', 'downloads', 'individual', 'overdue'];
    tabs.forEach(t => {
        const btn = document.getElementById(`admin-tab-btn-${t}`);
        const sec = document.getElementById(`admin-sec-${t}`);
        if (btn) btn.classList.toggle('active', t === tabKey);
        if (sec) sec.style.display = (t === tabKey) ? 'block' : 'none';
    });
};

window.exportPilotageCSV = function() {
    window.location.href = '/api/admin/export_pilotage';
};

window.searchUserForTimeline = async function() {
    const q = (document.getElementById('admin-timeline-search')?.value || '').trim();
    const container = document.getElementById('admin-timeline-container');
    const ficheBox = document.getElementById('admin-user-fiche-box');
    if (!q) {
        alert("Veuillez saisir un nom, matricule ou email d'utilisateur.");
        return;
    }
    if (container) container.innerHTML = '<div style="text-align: center; padding: 30px; color: #64748b;">Recherche de l\'historique pédagogique...</div>';
    
    try {
        const uRes = await fetch('/api/users');
        const uList = await uRes.json();
        const qLower = q.toLowerCase();
        const user = uList.find(u => 
            (u.matricule && u.matricule.toLowerCase() === qLower) ||
            (u.nom && u.nom.toLowerCase().includes(qLower)) ||
            (u.prenom && u.prenom.toLowerCase().includes(qLower)) ||
            (u.email && u.email.toLowerCase().includes(qLower))
        );
        if (!user) {
            if (ficheBox) ficheBox.style.display = 'none';
            if (container) container.innerHTML = `<div style="text-align: center; padding: 30px; color: #e9041e; font-weight: 700;">Aucun collaborateur trouvé pour "${q}".</div>`;
            return;
        }
        
        // Afficher la fiche utilisateur
        if (ficheBox) {
            ficheBox.style.display = 'block';
            const ficheNameEl = document.getElementById('fiche-user-name');
            const ficheMetaEl = document.getElementById('fiche-user-meta');
            const ficheBadgeEl = document.getElementById('fiche-user-badge');
            if (ficheNameEl) ficheNameEl.textContent = `${user.nom || ''} ${user.prenom || ''}`.trim();
            if (ficheMetaEl) ficheMetaEl.textContent = `${user.matricule || '-'} • ${user.direction || '-'} • ${user.poste || '-'} • ${user.email || '-'}`;
            if (ficheBadgeEl) {
                ficheBadgeEl.textContent = user.role === 'superadmin' ? 'Super Admin' : user.role === 'admin' ? 'Administrateur' : 'Collaborateur';
                ficheBadgeEl.className = `role-badge role-${user.role || 'user'}`;
            }
        }
        
        const tRes = await fetch(`/api/admin/user_timeline/${user.id}`);
        const tData = await tRes.json();
        const timeline = tData.timeline || [];
        if (timeline.length === 0) {
            if (container) container.innerHTML = `<div style="text-align: center; padding: 30px; color: #64748b;">Aucune activité enregistrée pour ${user.nom || ''} ${user.prenom || ''}.</div>`;
            return;
        }
        
        container.innerHTML = `
            <div class="timeline-list" style="position: relative; padding-left: 24px; border-left: 2px solid #e2e8f0;">
                ${timeline.map(ev => `
                    <div style="position: relative; margin-bottom: 20px;">
                        <div style="position: absolute; left: -31px; top: 2px; width: 12px; height: 12px; border-radius: 50%; background: #e9041e; border: 2px solid white;"></div>
                        <div style="font-size: 11.5px; color: #64748b;">${ev.date ? ev.date.replace('T', ' ').substring(0, 19) : ''}</div>
                        <div style="font-size: 14px; font-weight: 800; color: #000000; margin-top: 2px;">${ev.title || ev.action || ''}</div>
                        <div style="font-size: 13px; color: #475569; margin-top: 2px;">${ev.description || ''}</div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (e) {
        console.error("searchUserForTimeline error:", e);
        if (container) container.innerHTML = '<div style="color: #e9041e; padding: 20px; font-weight: 700;">Erreur lors de la récupération de la timeline.</div>';
    }
};

function getAdminDashboardSummaryJson() {
    const totalCourses = courses ? courses.length : 0;
    let totalHours = 0;
    let domainCounts = {};
    let levelCounts = {
        'Débutant': 0,
        'Intermédiaire': 0,
        'Avancé': 0
    };

    const coursesSummary = (courses || []).map(c => {
        const d = Number(c.duration) || 0;
        totalHours += d;
        const dom = c.domain || 'Général';
        domainCounts[dom] = (domainCounts[dom] || 0) + 1;
        const lvl = c.level || 'Débutant';
        if (levelCounts[lvl] !== undefined) {
            levelCounts[lvl]++;
        } else {
            levelCounts[lvl] = 1;
        }
        return {
            id: c.id,
            titre: c.title || 'Sans titre',
            domaine: dom,
            duree_heures: d,
            niveau: lvl,
            visibilite: c.visibility || 'public'
        };
    });

    const nomComplet = currentUser ? (`${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() || currentUser.matricule || 'Admin') : 'Admin';
    const roleName = currentUser ? (currentUser.role === 'superadmin' ? 'Super Admin' : (currentUser.role === 'admin' ? 'Administrateur' : 'Apprenant')) : 'Super Admin';

    return {
        application: "IA Formation",
        utilisateur_connecte: {
            nom_complet: nomComplet,
            matricule: currentUser ? (currentUser.matricule || 'ADMIN001') : 'ADMIN001',
            role: roleName,
            direction: currentUser ? (currentUser.direction || '') : '',
            poste: currentUser ? (currentUser.poste || '') : ''
        },
        ecran_actif: "Tableau de Bord Administrateur",
        kpis_principaux: {
            total_formations: totalCourses,
            volume_horaire_total_heures: totalHours,
            domaines_differents_count: Object.keys(domainCounts).length
        },
        repartition_par_niveau: levelCounts,
        formations_par_domaine: domainCounts,
        catalogue_formations_detail: coursesSummary
    };
}

let pdfDoc = null;
let pageNum = 1;
let currentCourse = null;
let selectedCourseForModal = null;

// Modal de Choix du Mode d'Apprentissage
window.viewCourse = function(id) {
    const course = courses.find(c => c.id == id);
    if (!course) return;
    
    selectedCourseForModal = course;
    const modal = document.getElementById('consultation-mode-modal');
    const modalHeading = document.getElementById('consultation-modal-heading');
    const isAdminOrSuper = currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin');
    if (modalHeading) {
        modalHeading.innerText = isAdminOrSuper ? "Aperçu de la formation" : "Lancer la formation";
    }
    const titleEl = document.getElementById('modal-course-title');
    if (titleEl) titleEl.innerText = `${course.title} • (${course.domain || 'Formation'})`;

    const isLearner = currentUser && currentUser.role === 'user';
    const evalBadgeEl = document.getElementById('modal-eval-status-badge');
    if (evalBadgeEl) {
        if (isLearner && course.user_evaluation) {
            const isPassed = course.user_evaluation.passed;
            evalBadgeEl.innerHTML = `Dernier score : <strong>${Math.round(course.user_evaluation.score)}%</strong> (${isPassed ? 'Validé' : 'À consolider'})`;
            evalBadgeEl.style.color = isPassed ? '#000000' : '#e9041e';
        } else {
            evalBadgeEl.innerText = 'Test noté & Bilan personnalisé';
            evalBadgeEl.style.color = '#000000';
        }
    }

    const evalCard = document.getElementById('mode-card-evaluation');
    if (evalCard) {
        const canAccessEval = isAdminOrSuper || Boolean(course.has_completed_training || course.user_evaluation);
        evalCard.style.display = canAccessEval ? 'block' : 'none';
    }

    // Gestion de la bannière et des boutons de reprise de progression
    const resumeBanner = document.getElementById('modal-resume-banner');
    const resumeSlideText = document.getElementById('modal-resume-slide-text');
    const resumePctBadge = document.getElementById('modal-resume-pct-badge');
    const resumeProgBar = document.getElementById('modal-resume-progress-bar');
    const btnPresResume = document.getElementById('btn-pres-resume');
    const btnPresRestart = document.getElementById('btn-pres-restart');
    const btnLiveResume = document.getElementById('btn-live-resume');
    const btnLiveRestart = document.getElementById('btn-live-restart');

    const uProg = isLearner ? course.user_progress : null;
    const hasProgress = Boolean(isLearner && uProg && uProg.current_slide > 1 && !course.has_completed_training);
    const hasFinished = Boolean(isLearner && course.has_completed_training);

    if (hasProgress) {
        const curS = uProg.current_slide;
        const totS = uProg.total_slides || 1;
        const pct = Math.round(uProg.progress_percent || ((curS / totS) * 100));

        if (resumeBanner) resumeBanner.style.display = 'block';
        if (resumeSlideText) resumeSlideText.innerText = `${curS} sur ${totS}`;
        if (resumePctBadge) resumePctBadge.innerText = `${pct}%`;
        if (resumeProgBar) resumeProgBar.style.width = `${pct}%`;

        if (btnPresResume) btnPresResume.innerHTML = `▶ Reprendre la Présentation (Slide ${curS})`;
        if (btnPresRestart) btnPresRestart.style.display = 'inline-flex';

        if (btnLiveResume) btnLiveResume.innerHTML = isAdminOrSuper ? `Démarrer l'Aperçu en Interaction Directe` : `Démarrer l'Interaction Directe`;
        if (btnLiveRestart) btnLiveRestart.style.display = 'none';
    } else if (hasFinished) {
        if (resumeBanner) resumeBanner.style.display = 'block';
        if (resumeSlideText) resumeSlideText.innerText = `Intégralité suivie`;
        if (resumePctBadge) resumePctBadge.innerText = `100% ✓`;
        if (resumeProgBar) resumeProgBar.style.width = `100%`;

        if (btnPresResume) btnPresResume.innerHTML = `▶ Revoir la Présentation`;
        if (btnPresRestart) btnPresRestart.style.display = 'none';

        if (btnLiveResume) btnLiveResume.innerHTML = isAdminOrSuper ? `Démarrer l'Aperçu en Interaction Directe` : `Démarrer l'Interaction Directe`;
        if (btnLiveRestart) btnLiveRestart.style.display = 'none';
    } else {
        if (resumeBanner) resumeBanner.style.display = 'none';
        if (btnPresResume) btnPresResume.innerHTML = isAdminOrSuper ? `▶ Lancer l'Aperçu de la Présentation` : `▶ Lancer la Présentation`;
        if (btnPresRestart) btnPresRestart.style.display = 'none';

        if (btnLiveResume) btnLiveResume.innerHTML = isAdminOrSuper ? `Démarrer l'Aperçu en Interaction Directe` : `Démarrer l'Interaction Directe`;
        if (btnLiveRestart) btnLiveRestart.style.display = 'none';
    }

    if (modal) modal.style.display = 'flex';
};

window.closeConsultationModeModal = function() {
    const modal = document.getElementById('consultation-mode-modal');
    if (modal) modal.style.display = 'none';
};

window.restartSelectedCourseMode = async function(mode) {
    if (!selectedCourseForModal) return;
    const courseId = selectedCourseForModal.id;
    if (currentUser && currentUser.id) {
        try {
            await fetch(`http://127.0.0.1:8092/api/courses/${courseId}/reset_progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: currentUser.id })
            });
        } catch (e) {
            console.warn("Erreur reset_progress:", e);
        }
    }
    if (selectedCourseForModal.user_progress) {
        selectedCourseForModal.user_progress.current_slide = 1;
        selectedCourseForModal.user_progress.progress_percent = 0.0;
    }
    launchSelectedMode(mode, false);
};

window.launchSelectedMode = function(mode, resume = false) {
    closeConsultationModeModal();
    if (!selectedCourseForModal) return;
    
    let resumeSlide = 1;
    if (resume && selectedCourseForModal.user_progress && selectedCourseForModal.user_progress.current_slide > 1) {
        resumeSlide = selectedCourseForModal.user_progress.current_slide;
    }
    
    if (mode === 'presentation') {
        startPresentationMode(selectedCourseForModal.id, resumeSlide);
    } else if (mode === 'evaluation') {
        startEvaluationMode(selectedCourseForModal.id);
    } else {
        // En mode Live (Gemini Live), pas de suivi de progression rigide par slide : démarrage direct et naturel
        startLiveTutorMode(selectedCourseForModal.id);
    }
};

// ==========================================
// MODE 2 : MODE INTERACTION DIRECTE (LIVE IA)
// ==========================================
// GESTION DU VOLET DOCUMENT MASQUÉ (À DROITE)
window.toggleCourseDocumentPanel = function(forceState) {
    const drawer = document.getElementById('course-document-drawer');
    const badge = document.getElementById('doc-badge-status');
    const toggleBtn = document.getElementById('toggle-doc-btn');
    if (!drawer) return;

    let isHidden = drawer.classList.contains('doc-drawer-hidden');
    let shouldShow = (typeof forceState === 'boolean') ? forceState : isHidden;

    if (shouldShow) {
        drawer.classList.remove('doc-drawer-hidden');
        if (badge) {
            badge.innerText = "Affiché";
            badge.style.background = "#000000";
        }
        if (toggleBtn) {
            toggleBtn.style.background = "#e9041e";
        }
        if (pdfDoc) {
            renderPage(pageNum || 1);
        }
    } else {
        drawer.classList.add('doc-drawer-hidden');
        if (badge) {
            badge.innerText = "Masqué";
            badge.style.background = "#334155";
        }
        if (toggleBtn) {
            toggleBtn.style.background = "#0f172a";
        }
    }
};

// GESTION DE L'HOLOGRAMME ET DE SON ÉTAT
window.setHologramState = function(state, text) {
    const vp = document.getElementById('hologram-viewport');
    const pill = document.getElementById('holo-status-pill');
    const statusText = document.getElementById('holo-status-text');
    const speechContent = document.getElementById('holo-speech-content');
    const actionBtn = document.getElementById('holo-action-btn');

    if (vp) vp.classList.remove('holo-speaking', 'holo-listening');

    if (state === 'speaking') {
        if (vp) vp.classList.add('holo-speaking');
        if (pill) {
            pill.className = 'holo-status-idle';
            pill.style.borderColor = '#e9041e';
            pill.style.background = '#fee2e2';
            pill.style.color = '#e9041e';
        }
        if (statusText) statusText.innerText = "T-chIA s'exprime...";
        if (text && speechContent) {
            speechContent.innerText = `« ${text} »`;
        } else if (speechContent) {
            if (window.liveSessionTerminating) {
                speechContent.innerText = "« Clôture de la formation et au revoir... »";
            } else if (window.livePresentationReachedEnd) {
                speechContent.innerText = "« Synthèse finale et réponses à vos questions... »";
            } else {
                const sNum = window.currentLiveSlide || pageNum || 1;
                const total = window.liveTotalSlides || 1;
                speechContent.innerText = `« Échange en cours avec votre formateur (Étape ${sNum}/${total})... »`;
            }
        }
    } else if (state === 'listening') {
        if (vp) vp.classList.add('holo-listening');
        if (pill) {
            pill.className = 'holo-status-idle';
            pill.style.borderColor = '#000000';
            pill.style.background = '#f1f5f9';
            pill.style.color = '#000000';
        }
        if (statusText) statusText.innerText = "À votre écoute...";
        if (speechContent) {
            if (window.livePresentationReachedEnd) {
                speechContent.innerText = "« Avez-vous des questions sur l'ensemble de la formation ? Je suis à votre écoute. »";
            } else {
                speechContent.innerText = "« Je vous écoute... Posez votre question ou intervenez à tout moment. »";
            }
        }
    } else if (state === 'connecting') {
        if (statusText) statusText.innerText = "Connexion à T-chIA...";
        if (actionBtn) actionBtn.innerText = "Connexion...";
    } else { // idle
        if (pill) {
            pill.className = 'holo-status-idle';
            pill.style.borderColor = '#cbd5e1';
            pill.style.background = '#f1f5f9';
            pill.style.color = '#0f172a';
        }
        if (statusText) statusText.innerText = isConnected ? "T-chIA actif (Prêt)" : "T-chIA en veille";
        if (actionBtn) {
            actionBtn.innerText = isConnected ? "Mettre en pause la discussion" : "Lancer la formation interactive";
        }
    }
};

window.toggleHologramDiscussion = async function() {
    if (isConnected) {
        disconnect();
        setHologramState('idle');
    } else {
        setHologramState('connecting');
        await connect();
    }
};

// GESTION DU BOUTON ÉVALUATION EN MODE LIVE (GRISÉ TANT QUE NON SUIVIE)
function updateLiveEvalBtnState(hasCompleted) {
    const evalBtn = document.getElementById('detail-eval-btn');
    if (!evalBtn) return;
    if (hasCompleted) {
        evalBtn.disabled = false;
        evalBtn.style.background = '#e9041e';
        evalBtn.style.color = '#ffffff';
        evalBtn.style.cursor = 'pointer';
        evalBtn.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.25)';
        evalBtn.style.opacity = '1';
        evalBtn.title = "Tester et valider vos connaissances";
        evalBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Passer l'évaluation`;
    } else {
        evalBtn.disabled = true;
        evalBtn.style.background = '#cbd5e1';
        evalBtn.style.color = '#64748b';
        evalBtn.style.cursor = 'not-allowed';
        evalBtn.style.boxShadow = 'none';
        evalBtn.style.opacity = '0.85';
        evalBtn.title = "Veuillez suivre la formation jusqu'au bout pour débloquer l'évaluation";
        evalBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Évaluation verrouillée`;
    }
}
window.updateLiveEvalBtnState = updateLiveEvalBtnState;

function startLiveTutorMode(id) {
    const course = courses.find(c => c.id == id);
    if (!course) return;
    
    currentCourse = course;
    
    // Griser le bouton d'évaluation si la formation n'est pas encore suivie
    const hasFollowed = Boolean(course.has_completed_training || course.user_evaluation);
    updateLiveEvalBtnState(hasFollowed);
    window.liveTotalSlides = (course.slides_data && Array.isArray(course.slides_data) && course.slides_data.length > 0) ? course.slides_data.length : 1;
    window.currentLiveSlide = 1;
    window.livePresentationReachedEnd = false;
    window.finalQuestionsPromptSent = false;
    window.liveSessionTerminating = false;
    window.isDisconnectingGracefully = false;
    window.silenceCounter = 0;
    window.isTutorPaused = false;
    window.userInterrupted = false;
    window.userAskingQuestion = false;
    window.isModelTurnComplete = false;
    if (window.advanceSlideTimeout) {
        clearTimeout(window.advanceSlideTimeout);
        window.advanceSlideTimeout = null;
    }
    
    document.getElementById('detail-title').innerText = course.title;
    const detailTags = document.getElementById('detail-tags');
    if (detailTags) {
        detailTags.innerHTML = '';
    }
    
    // Configurer le téléchargement PDF unique standardisé
    const dlPdf = document.getElementById('detail-download-pdf');
    const miniDlPdf = document.getElementById('mini-download-pdf');
    if (course.pdf_url) {
        const downloadUrl = `/api/courses/${course.id}/download/pdf${currentUser ? '?user_id=' + currentUser.id : ''}`;
        if (dlPdf) {
            dlPdf.href = downloadUrl;
            dlPdf.style.display = 'inline-flex';
            dlPdf.onclick = () => { if (typeof trackDocumentDownload === 'function') trackDocumentDownload(course.id, 'PDF'); };
        }
        if (miniDlPdf) {
            miniDlPdf.href = downloadUrl;
            miniDlPdf.onclick = () => { if (typeof trackDocumentDownload === 'function') trackDocumentDownload(course.id, 'PDF'); };
        }
    } else {
        if (dlPdf) dlPdf.style.display = 'none';
        if (miniDlPdf) miniDlPdf.style.display = 'none';
    }

    // Le document reste MASQUÉ par défaut
    toggleCourseDocumentPanel(false);

    // Initialiser l'hologramme en veille active
    setHologramState('idle');
    const speechBox = document.getElementById('holo-speech-content');
    if (speechBox) {
        const tutorDisplayName = course.tutor_name ? `${course.tutor_name}, votre formateur` : "votre formateur";
        speechBox.innerText = `« Bonjour ! Je suis ${tutorDisplayName} pour la formation "${course.title}". Cliquez ci-dessus pour lancer notre échange en direct. »`;
    }
    
    // Initialiser le sélecteur de vitesse de l'IA Live
    const liveSpeedSelect = document.getElementById('live-speed-select');
    if (liveSpeedSelect) {
        liveSpeedSelect.value = String(currentLiveTutorSpeed);
    }

    // Si l'IA live était connectée, réinitialisation
    if (isConnected) {
        disconnect();
    }
    
    // Charger le PDF en arrière-plan pour la miniature
    if (course.pdf_url) {
        const url = 'http://127.0.0.1:8092' + course.pdf_url;
        pdfjsLib.getDocument(url).promise.then(doc => {
            pdfDoc = doc;
            const countEl = document.getElementById('page-count');
            if (countEl) countEl.textContent = doc.numPages;
            if (!window.liveTotalSlides || window.liveTotalSlides <= 1) {
                window.liveTotalSlides = doc.numPages;
            }
            pageNum = 1;
            window.currentLiveSlide = 1;
            renderPage(1);
        }).catch(err => {
            console.error("Erreur chargement PDF", err);
        });
    }
    
    window.navigateTo('details');
}

function renderPage(num) {
    if (!pdfDoc) return;
    pdfDoc.getPage(num).then(page => {
        const canvas = document.getElementById('pdf-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const viewport = page.getViewport({scale: 1.5});
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        page.render({ canvasContext: ctx, viewport: viewport });
        const pageNumEl = document.getElementById('page-num');
        if (pageNumEl) pageNumEl.textContent = num;
    });
}

const prevBtn = document.getElementById('prev-slide');
if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        if (pageNum <= 1) return;
        pageNum--;
        window.currentLiveSlide = pageNum;
        renderPage(pageNum);
    });
}

const nextBtn = document.getElementById('next-slide');
if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        if (!pdfDoc || pageNum >= pdfDoc.numPages) return;
        pageNum++;
        window.currentLiveSlide = pageNum;
        renderPage(pageNum);
    });
}

// =========================================================================
// MODE 1 : MODE PRÉSENTATION & AUDIO SYNCHRONISÉ AVEC DÉFILEMENT AUTO & RAG
// =========================================================================
let presentationPdfDoc = null;
let presentationPageNum = 1;
let presentationTotalPages = 1;
let presentationTimestamps = [];
let presentationMediaRecorder = null;
let presentationAudioChunks = [];
let isRagRecording = false;
let wasPresPausedForQuestion = false;

function pausePresentationForQuestion() {
    const presAudio = document.getElementById('presentation-audio');
    if (presAudio && !presAudio.paused) {
        presAudio.pause();
        wasPresPausedForQuestion = true;
        const btnResume = document.getElementById('presentation-resume-btn');
        if (btnResume) btnResume.style.display = 'inline-flex';
    }
    const ragAudio = document.getElementById('rag-audio-player');
    if (ragAudio && !ragAudio.paused) {
        ragAudio.pause();
    }
}

window.resumePresentationAudio = function() {
    const presAudio = document.getElementById('presentation-audio');
    if (presAudio) {
        const ragAudio = document.getElementById('rag-audio-player');
        if (ragAudio && !ragAudio.paused) {
            ragAudio.pause();
        }
        presAudio.play().then(() => {
            const btnResume = document.getElementById('presentation-resume-btn');
            if (btnResume) btnResume.style.display = 'none';
            wasPresPausedForQuestion = false;
        }).catch(err => {
            console.warn("Erreur reprise audio:", err);
        });
    }
};

let currentPresentationSpeed = 1.0;
function changePresentationSpeed(speed) {
    currentPresentationSpeed = parseFloat(speed) || 1.0;
    currentLiveTutorSpeed = currentPresentationSpeed;
    
    // Synchroniser le sélecteur du mode Live
    const liveSelect = document.getElementById('live-speed-select');
    if (liveSelect) {
        liveSelect.value = String(currentPresentationSpeed);
    }
    
    // Appliquer au lecteur de présentation avec préservation absolue de la voix (hauteur / timbre)
    const presAudio = document.getElementById('presentation-audio');
    if (presAudio) {
        presAudio.preservesPitch = true;
        presAudio.mozPreservesPitch = true;
        presAudio.webkitPreservesPitch = true;
        presAudio.playbackRate = currentPresentationSpeed;
    }
    
    // Appliquer au lecteur de questions RAG
    const ragAudio = document.getElementById('rag-audio-player');
    if (ragAudio) {
        ragAudio.preservesPitch = true;
        ragAudio.mozPreservesPitch = true;
        ragAudio.webkitPreservesPitch = true;
        ragAudio.playbackRate = currentPresentationSpeed;
    }
}
window.changePresentationSpeed = changePresentationSpeed;

let progressSaveTimeout = null;
function saveCurrentCourseProgress(courseId, slideNum, totalSlides, mode = 'presentation', completed = false) {
    if (mode === 'live') return; // Aucun suivi de progression par slide pour Gemini Live
    if (!currentUser || !currentUser.id || !courseId) return;
    const isAdminOrSuper = currentUser.role === 'admin' || currentUser.role === 'superadmin';
    if (isAdminOrSuper) return; // Ne pas enregistrer de progression pour les administrateurs
    
    // Mettre à jour l'objet en mémoire pour synchronisation immédiate
    const course = courses.find(c => c.id == courseId);
    if (course) {
        if (!course.user_progress) {
            course.user_progress = {};
        }
        course.user_progress.current_slide = slideNum;
        course.user_progress.total_slides = totalSlides;
        course.user_progress.progress_percent = Math.min(100, Math.round((slideNum / totalSlides) * 100));
        course.user_progress.last_mode = mode;
        if (completed || slideNum >= totalSlides) {
            course.user_progress.completed = true;
            course.has_completed_training = true;
        }
    }

    if (progressSaveTimeout) clearTimeout(progressSaveTimeout);
    progressSaveTimeout = setTimeout(() => {
        fetch(`http://127.0.0.1:8092/api/courses/${courseId}/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                current_slide: slideNum,
                total_slides: totalSlides,
                mode: mode,
                completed: completed
            })
        }).catch(err => console.warn("Erreur sauvegarde progression:", err));
    }, 300);
}
window.saveCurrentCourseProgress = saveCurrentCourseProgress;

function startPresentationMode(id, startFromSlide = 1) {
    const course = courses.find(c => c.id == id);
    if (!course) return;
    
    startFromSlide = Math.max(1, parseInt(startFromSlide) || 1);
    
    wasPresPausedForQuestion = false;
    const btnResume = document.getElementById('presentation-resume-btn');
    if (btnResume) btnResume.style.display = 'none';
    
    currentCourse = course;
    window.navigateTo('presentation');
    
    document.getElementById('presentation-title').innerText = course.title;
    const loadingEl = document.getElementById('presentation-loading');
    const canvasEl = document.getElementById('presentation-canvas');
    if (loadingEl) loadingEl.style.display = 'block';
    if (canvasEl) canvasEl.style.display = 'none';

    // Initialiser le sélecteur de vitesse de présentation
    const speedSelect = document.getElementById('presentation-speed-select');
    if (speedSelect) {
        speedSelect.value = String(currentPresentationSpeed);
    }

    // Boutons de téléchargement standardisés dans le header de présentation
    const presDlPdf = document.getElementById('presentation-download-pdf');
    if (presDlPdf) {
        if (course.pdf_url) {
            presDlPdf.href = `/api/courses/${course.id}/download/pdf${currentUser ? '?user_id=' + currentUser.id : ''}`;
            presDlPdf.style.display = 'inline-flex';
            presDlPdf.onclick = () => { if (typeof trackDocumentDownload === 'function') trackDocumentDownload(course.id, 'PDF'); };
        } else {
            presDlPdf.style.display = 'none';
        }
    }
    const presDlPptx = document.getElementById('presentation-download-pptx');
    if (presDlPptx) {
        if (course.pptx_url) {
            presDlPptx.href = `/api/courses/${course.id}/download/pptx${currentUser ? '?user_id=' + currentUser.id : ''}`;
            presDlPptx.style.display = 'inline-flex';
            presDlPptx.onclick = () => { if (typeof trackDocumentDownload === 'function') trackDocumentDownload(course.id, 'PPTX'); };
        } else {
            presDlPptx.style.display = 'none';
        }
    }

    // Le panneau de questions est masqué par défaut à l'ouverture du cours (Section 32)
    const chatSide = document.getElementById('presentation-chat-side');
    if (chatSide) chatSide.style.display = 'none';
    const btnPresToggleChat = document.getElementById('presentation-toggle-chat');
    if (btnPresToggleChat) {
        btnPresToggleChat.innerText = 'Afficher les questions';
        btnPresToggleChat.onclick = () => {
            const chatSideEl = document.getElementById('presentation-chat-side');
            if (chatSideEl) {
                const isHidden = (chatSideEl.style.display === 'none' || getComputedStyle(chatSideEl).display === 'none');
                chatSideEl.style.display = isHidden ? 'flex' : 'none';
                btnPresToggleChat.innerText = isHidden ? 'Masquer les questions' : 'Afficher les questions';
                setTimeout(() => {
                    if (presentationPdfDoc) renderPresentationPage(presentationPageNum);
                }, 60);
            }
        };
    }

    // Le bouton Évaluation n'est visible que si la personne a déjà terminé la formation
    const presEvalBtn = document.getElementById('presentation-eval-btn');
    if (presEvalBtn) {
        const hasFollowed = Boolean(course.has_completed_training || course.user_evaluation);
        presEvalBtn.style.display = hasFollowed ? 'inline-flex' : 'none';
    }
    closePresentationEndModal();
    
    // 1. Charger le document PDF
    if (course.pdf_url) {
        const url = 'http://127.0.0.1:8092' + course.pdf_url;
        pdfjsLib.getDocument(url).promise.then(doc => {
            presentationPdfDoc = doc;
            presentationTotalPages = doc.numPages;
            presentationPageNum = Math.min(startFromSlide, doc.numPages);
            initPresResizeObserver();
            requestAnimationFrame(() => {
                renderPresentationPage(presentationPageNum);
            });
        }).catch(err => {
            if (loadingEl) loadingEl.innerText = "Erreur de chargement du PDF de la présentation.";
            console.error("Erreur PDF présentation:", err);
        });
    }
    
    // 2. Initialiser l'audio et les timestamps
    const presAudio = document.getElementById('presentation-audio');
    const audioStatus = document.getElementById('presentation-audio-status');
    presentationTimestamps = [];
    
    if (presAudio) {
        presAudio.onended = () => {
            if (audioStatus) audioStatus.innerText = "Présentation terminée";
            handlePresentationCompleted();
            saveCurrentCourseProgress(course.id, presentationTotalPages || 1, presentationTotalPages || 1, 'presentation', true);
        };
        presAudio.onplay = () => {
            const btnResume = document.getElementById('presentation-resume-btn');
            if (btnResume) btnResume.style.display = 'none';
            const ragAudio = document.getElementById('rag-audio-player');
            if (ragAudio && !ragAudio.paused) {
                ragAudio.pause();
            }
            wasPresPausedForQuestion = false;
        };
    }
    
    if (presAudio && course.audio_url) {
        presAudio.src = 'http://127.0.0.1:8092' + course.audio_url;
        presAudio.preservesPitch = true;
        presAudio.mozPreservesPitch = true;
        presAudio.webkitPreservesPitch = true;
        presAudio.playbackRate = currentPresentationSpeed;
        if (audioStatus) audioStatus.innerText = "Audio prêt";
        
        // Charger les timestamps pour synchronisation automatique
        if (course.timestamps_url) {
            fetch('http://127.0.0.1:8092' + course.timestamps_url)
                .then(r => r.json())
                .then(data => {
                    presentationTimestamps = data;
                    if (audioStatus) audioStatus.innerText = "Synchronisé avec la voix";
                    
                    // Si reprise de progression, caler l'audio sur la diapositive cible
                    if (startFromSlide > 1) {
                        const targetSlide = presentationTimestamps.find(s => s.page === startFromSlide);
                        if (targetSlide) {
                            presAudio.currentTime = targetSlide.start;
                            presAudio.play().catch(e => console.log("Autoplay:", e));
                        }
                    }
                    
                    presAudio.ontimeupdate = () => {
                        const currentTime = presAudio.currentTime;
                        for (let i = 0; i < presentationTimestamps.length; i++) {
                            let slide = presentationTimestamps[i];
                            let isLast = (i === presentationTimestamps.length - 1);
                            if (currentTime >= slide.start && (currentTime < slide.end || (isLast && currentTime <= slide.end))) {
                                if (presentationPageNum !== slide.page) {
                                    presentationPageNum = slide.page;
                                    renderPresentationPage(presentationPageNum);
                                    saveCurrentCourseProgress(course.id, presentationPageNum, presentationTotalPages || presentationTimestamps.length, 'presentation');
                                }
                                break;
                            }
                        }
                    };
                })
                .catch(e => console.error("Erreur timestamps:", e));
        }
    } else if (presAudio) {
        presAudio.removeAttribute('src');
        if (audioStatus) audioStatus.innerText = "Aucun audio disponible";
    }
}

let currentPresRenderTask = null;

function renderPresentationPage(num) {
    if (!presentationPdfDoc) return;
    presentationPdfDoc.getPage(num).then(page => {
        const canvas = document.getElementById('presentation-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const pdfBox = document.getElementById('presentation-pdf-box');
        
        // Annuler tout rendu précédent en cours pour éviter les clignotements ou conflits
        if (currentPresRenderTask) {
            try { currentPresRenderTask.cancel(); } catch (e) {}
            currentPresRenderTask = null;
        }

        const isFs = !!document.fullscreenElement;
        const boxW = isFs ? window.innerWidth : (pdfBox ? pdfBox.clientWidth : 1000);
        const boxH = isFs ? window.innerHeight : (pdfBox ? pdfBox.clientHeight : 600);

        // Marge minimale en mode normal (0px en plein écran pour occuper 100% de la surface)
        const pad = isFs ? 0 : 8;
        const availW = Math.max(boxW - pad, 200);
        const availH = Math.max(boxH - pad, 150);

        // Calcul du meilleur ratio d'échelle pour remplir au maximum le conteneur
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const scaleX = availW / unscaledViewport.width;
        const scaleY = availH / unscaledViewport.height;
        const optimalScale = Math.min(scaleX, scaleY);

        // Facteur DPR (Device Pixel Ratio) pour une netteté cristalline (HD / Retina)
        const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
        const viewport = page.getViewport({ scale: optimalScale * dpr });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Dimensions CSS réelles pour occuper exactement tout l'espace calculé
        const displayW = Math.round(unscaledViewport.width * optimalScale);
        const displayH = Math.round(unscaledViewport.height * optimalScale);
        canvas.style.width = `${displayW}px`;
        canvas.style.height = `${displayH}px`;
        
        currentPresRenderTask = page.render({ canvasContext: ctx, viewport: viewport });
        currentPresRenderTask.promise.then(() => {
            const loadingEl = document.getElementById('presentation-loading');
            if (loadingEl) loadingEl.style.display = 'none';
            canvas.style.display = 'block';
            currentPresRenderTask = null;
        }).catch(err => {
            if (err && err.name !== 'RenderingCancelledException') {
                console.error("Erreur rendu diapositive:", err);
            }
        });
        
        const pageInfo = document.getElementById('presentation-page-info');
        if (pageInfo) pageInfo.innerText = `${num} / ${presentationTotalPages}`;

        const fsPageInfo = document.getElementById('fs-page-info');
        if (fsPageInfo) fsPageInfo.innerText = `${num} / ${presentationTotalPages}`;
        
        const progBar = document.getElementById('presentation-progress-bar');
        if (progBar) {
            const pct = (num / presentationTotalPages) * 100;
            progBar.style.width = pct + '%';
        }
    });
}

function jumpToPresentationSlide(page) {
    const presAudio = document.getElementById('presentation-audio');
    if (presAudio && presentationTimestamps && presentationTimestamps.length > 0) {
        const slide = presentationTimestamps.find(s => s.page === page);
        if (slide) {
            presAudio.currentTime = slide.start;
            presAudio.play().catch(e => console.log("Autoplay:", e));
        }
    }
    if (currentCourse) {
        saveCurrentCourseProgress(currentCourse.id, page, presentationTotalPages || 1, 'presentation', (page >= presentationTotalPages));
    }
}

function togglePresentationFullscreen() {
    const pdfBox = document.getElementById('presentation-pdf-box');
    if (!pdfBox) return;
    if (!document.fullscreenElement) {
        if (pdfBox.requestFullscreen) {
            pdfBox.requestFullscreen().catch(err => console.error("Fullscreen error:", err));
        } else if (pdfBox.webkitRequestFullscreen) {
            pdfBox.webkitRequestFullscreen();
        } else if (pdfBox.msRequestFullscreen) {
            pdfBox.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}
window.togglePresentationFullscreen = togglePresentationFullscreen;

function togglePresentationStageTheme() {
    const pdfBox = document.getElementById('presentation-pdf-box');
    if (!pdfBox) return;
    pdfBox.classList.toggle('dark-stage');
}
window.togglePresentationStageTheme = togglePresentationStageTheme;

let presResizeObserver = null;
function initPresResizeObserver() {
    const pdfBox = document.getElementById('presentation-pdf-box');
    if (!pdfBox || presResizeObserver) return;
    try {
        presResizeObserver = new ResizeObserver((entries) => {
            const isPresActive = document.getElementById('page-presentation')?.classList.contains('active');
            if (isPresActive && presentationPdfDoc) {
                clearTimeout(presResizeDebounce);
                presResizeDebounce = setTimeout(() => {
                    renderPresentationPage(presentationPageNum);
                }, 50);
            }
        });
        presResizeObserver.observe(pdfBox);
    } catch (e) {
        console.warn("ResizeObserver non supporté:", e);
    }
}
window.initPresResizeObserver = initPresResizeObserver;

// Détecteur de bascule plein écran
function handleFullscreenChange() {
    const isFs = !!document.fullscreenElement;
    const btnFs = document.getElementById('presentation-fullscreen');
    if (btnFs) {
        btnFs.innerHTML = isFs ? 'Réduire' : 'Plein écran';
    }
    const fsOverlay = document.getElementById('fullscreen-controls-overlay');
    if (fsOverlay) {
        fsOverlay.style.display = isFs ? 'flex' : 'none';
    }
    if (presentationPdfDoc) {
        setTimeout(() => {
            renderPresentationPage(presentationPageNum);
        }, 100);
    }
}
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);
document.addEventListener('MSFullscreenChange', handleFullscreenChange);

// Redimensionnement automatique de la fenêtre pour toujours occuper 100% de l'espace
let presResizeDebounce = null;
window.addEventListener('resize', () => {
    const isPresActive = document.getElementById('page-presentation')?.classList.contains('active');
    if (isPresActive && presentationPdfDoc) {
        clearTimeout(presResizeDebounce);
        presResizeDebounce = setTimeout(() => {
            renderPresentationPage(presentationPageNum);
        }, 120);
    }
});

// Navigation au clavier pour le mode présentation
document.addEventListener('keydown', (e) => {
    const isPresActive = document.getElementById('page-presentation')?.classList.contains('active');
    if (!isPresActive) return;

    // Ne pas intercepter si l'utilisateur est en train d'écrire dans un champ de texte
    if (document.activeElement && (document.activeElement.id === 'rag-chat-input' || document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        return;
    }

    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        const btnNext = document.getElementById('presentation-next');
        if (btnNext) btnNext.click();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        const btnPrev = document.getElementById('presentation-prev');
        if (btnPrev) btnPrev.click();
    } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        togglePresentationFullscreen();
    }
});

// Contrôles présentation principaux
const btnPresPrev = document.getElementById('presentation-prev');
if (btnPresPrev) {
    btnPresPrev.onclick = () => {
        if (presentationPageNum > 1) {
            presentationPageNum--;
            renderPresentationPage(presentationPageNum);
            jumpToPresentationSlide(presentationPageNum);
            if (currentCourse) {
                saveCurrentCourseProgress(currentCourse.id, presentationPageNum, presentationTotalPages || 1, 'presentation');
            }
        }
    };
}

const btnPresNext = document.getElementById('presentation-next');
if (btnPresNext) {
    btnPresNext.onclick = () => {
        if (presentationPdfDoc && presentationPageNum < presentationTotalPages) {
            presentationPageNum++;
            renderPresentationPage(presentationPageNum);
            jumpToPresentationSlide(presentationPageNum);
            if (currentCourse) {
                saveCurrentCourseProgress(currentCourse.id, presentationPageNum, presentationTotalPages, 'presentation', (presentationPageNum === presentationTotalPages));
            }
            if (presentationPageNum === presentationTotalPages) {
                const presAudio = document.getElementById('presentation-audio');
                if (!presAudio || !presAudio.src || presAudio.paused) {
                    handlePresentationCompleted();
                }
            }
        } else if (presentationPdfDoc && presentationPageNum >= presentationTotalPages) {
            handlePresentationCompleted();
        }
    };
}

function handlePresentationCompleted() {
    if (!currentCourse) return;

    // 1. Débloquer et afficher le bouton Évaluation dans le header de présentation
    const presEvalBtn = document.getElementById('presentation-eval-btn');
    if (presEvalBtn) {
        presEvalBtn.style.display = 'inline-flex';
    }

    // 1b. Débloquer le bouton Évaluation en Mode Live (Hologramme)
    if (typeof updateLiveEvalBtnState === 'function') {
        updateLiveEvalBtnState(true);
    }

    // 2. Mémoriser localement que la formation a été suivie
    currentCourse.has_completed_training = true;
    const courseInList = courses.find(c => c.id === currentCourse.id);
    if (courseInList) {
        courseInList.has_completed_training = true;
    }

    // 3. Débloquer le mode évaluation dans la modale de choix
    const evalCard = document.getElementById('mode-card-evaluation');
    if (evalCard) {
        evalCard.style.display = 'block';
    }

    // 4. Enregistrer la complétion sur le serveur (uniquement pour les apprenants)
    const isAdminOrSuper = currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin');
    if (currentUser && currentUser.id && !isAdminOrSuper) {
        fetch(`http://127.0.0.1:8092/api/courses/${currentCourse.id}/complete_training`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id })
        }).catch(err => console.warn("Erreur complete_training:", err));

        saveCurrentCourseProgress(currentCourse.id, presentationTotalPages || 1, presentationTotalPages || 1, 'presentation', true);
    }

    // 5. Afficher la modale de félicitations et d'accès au Quiz (uniquement pour les apprenants)
    if (!isAdminOrSuper) {
        const endModal = document.getElementById('presentation-end-modal');
        const courseTitleEl = document.getElementById('presentation-end-course-title');
        if (courseTitleEl) {
            courseTitleEl.innerText = `Félicitations pour avoir suivi "${currentCourse.title}". Vous pouvez désormais valider vos acquis en passant le Quiz d'évaluation.`;
        }
        if (endModal && document.getElementById('page-presentation')?.classList.contains('active') && endModal.style.display !== 'flex') {
            endModal.style.display = 'flex';
        }
    }
}
window.handlePresentationCompleted = handlePresentationCompleted;

window.startEvaluationFromEndModal = function() {
    closePresentationEndModal();
    if (currentCourse) {
        startCurrentCourseEvaluation();
    }
};

window.restartPresentation = function() {
    closePresentationEndModal();
    if (currentCourse && currentUser && currentUser.id) {
        fetch(`http://127.0.0.1:8092/api/courses/${currentCourse.id}/reset_progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id })
        }).catch(err => console.warn("Erreur reset_progress:", err));
        if (currentCourse.user_progress) {
            currentCourse.user_progress.current_slide = 1;
            currentCourse.user_progress.progress_percent = 0.0;
        }
    }
    presentationPageNum = 1;
    renderPresentationPage(1);
    jumpToPresentationSlide(1);
};

window.closePresentationEndModal = function() {
    const endModal = document.getElementById('presentation-end-modal');
    if (endModal) {
        endModal.style.display = 'none';
    }
};

const btnPresFullscreen = document.getElementById('presentation-fullscreen');
if (btnPresFullscreen) {
    btnPresFullscreen.onclick = () => {
        togglePresentationFullscreen();
    };
}

// Contrôles superposés en mode plein écran
const fsBtnPrev = document.getElementById('fs-btn-prev');
if (fsBtnPrev) fsBtnPrev.onclick = () => btnPresPrev?.click();

const fsBtnNext = document.getElementById('fs-btn-next');
if (fsBtnNext) fsBtnNext.onclick = () => btnPresNext?.click();

const fsBtnExit = document.getElementById('fs-btn-exit');
if (fsBtnExit) fsBtnExit.onclick = () => togglePresentationFullscreen();

const btnPresToggleChat = document.getElementById('presentation-toggle-chat');
if (btnPresToggleChat) {
    btnPresToggleChat.onclick = () => {
        const chatSide = document.getElementById('presentation-chat-side');
        if (chatSide) {
            const isHidden = (chatSide.style.display === 'none' || getComputedStyle(chatSide).display === 'none');
            chatSide.style.display = isHidden ? 'flex' : 'none';
            btnPresToggleChat.innerText = isHidden ? 'Masquer les questions' : 'Afficher les questions';
            // Réadapter la largeur de la diapositive dès que le chat est affiché ou masqué
            setTimeout(() => {
                if (presentationPdfDoc) renderPresentationPage(presentationPageNum);
            }, 60);
        }
    };
}

// ==========================================
// ASSISTANT CHAT RAG (TEXTE & MICROPHONE)
// ==========================================
const ragChatInput = document.getElementById('rag-chat-input');
const ragChatSend = document.getElementById('rag-chat-send');
const ragChatHistory = document.getElementById('presentation-chat-history');
const ragMicBtn = document.getElementById('rag-mic-btn');
const ragAudioPlayer = document.getElementById('rag-audio-player');

if (ragChatSend && ragChatInput) {
    ragChatSend.onclick = () => sendRagChatMessage(null);
    ragChatInput.onkeypress = (e) => {
        if (e.key === 'Enter') sendRagChatMessage(null);
    };
}

let speechRecognitionInstance = null;
const isWebSpeechSupported = ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

if (ragMicBtn) {
    ragMicBtn.onclick = () => {
        if (isRagRecording) {
            stopRagVoiceRecording();
        } else {
            startRagVoiceRecording();
        }
    };
}

function startRagVoiceRecording() {
    pausePresentationForQuestion();
    if (isWebSpeechSupported) {
        try {
            const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
            speechRecognitionInstance = new SpeechRec();
            speechRecognitionInstance.lang = 'fr-FR';
            speechRecognitionInstance.continuous = false;
            speechRecognitionInstance.interimResults = false;
            
            isRagRecording = true;
            ragMicBtn.classList.add('mic-recording-pulse');
            
            speechRecognitionInstance.onresult = (event) => {
                const transcript = event.results[0][0].transcript.trim();
                stopRagVoiceRecording();
                if (transcript) {
                    sendRagChatMessage(null, transcript);
                }
            };
            
            speechRecognitionInstance.onerror = (event) => {
                console.warn("Web Speech error:", event.error);
                stopRagVoiceRecording();
                if (event.error === 'not-allowed') {
                    alert("Accès au microphone refusé.");
                }
            };
            
            speechRecognitionInstance.onend = () => {
                stopRagVoiceRecording();
            };
            
            speechRecognitionInstance.start();
            return;
        } catch (e) {
            console.warn("Web Speech init error, fallback MediaRecorder:", e);
        }
    }
    
    // Fallback MediaRecorder si Web Speech n'est pas supporté
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        presentationMediaRecorder = new MediaRecorder(stream);
        presentationMediaRecorder.start();
        isRagRecording = true;
        ragMicBtn.classList.add('mic-recording-pulse');
        presentationAudioChunks = [];
        
        presentationMediaRecorder.addEventListener('dataavailable', event => {
            presentationAudioChunks.push(event.data);
        });
        
        presentationMediaRecorder.addEventListener('stop', () => {
            const audioBlob = new Blob(presentationAudioChunks, { type: 'audio/webm' });
            sendRagChatMessage(audioBlob, null);
            stream.getTracks().forEach(track => track.stop());
        });
    }).catch(err => {
        alert("Erreur d'accès au microphone : " + err);
    });
}

function stopRagVoiceRecording() {
    if (speechRecognitionInstance && isRagRecording) {
        try { speechRecognitionInstance.stop(); } catch(e){}
    }
    if (presentationMediaRecorder && presentationMediaRecorder.state === 'recording') {
        presentationMediaRecorder.stop();
    }
    isRagRecording = false;
    ragMicBtn.classList.remove('mic-recording-pulse');
}

window.clearRagChatHistory = function() {
    if (ragChatHistory) {
        ragChatHistory.innerHTML = `
            <div class="chat-msg chat-msg-ai">
                Historique effacé. Posez votre question sur cette formation.
            </div>
        `;
    }
};

function sendRagChatMessage(audioBlob = null, directText = null) {
    if (!currentCourse) return;
    pausePresentationForQuestion();
    const text = directText || (ragChatInput ? ragChatInput.value.trim() : '');
    if (!text && !audioBlob) return;
    
    // Message utilisateur (question brute uniquement)
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-msg chat-msg-user';
    if (audioBlob) {
        userMsg.innerHTML = '<span style="opacity: 0.85; font-style: italic;">...</span>';
    } else {
        userMsg.textContent = text;
    }
    ragChatHistory.appendChild(userMsg);
    
    if (ragChatInput) ragChatInput.value = '';
    ragChatHistory.scrollTop = ragChatHistory.scrollHeight;
    
    // Bulle chargement
    const aiMsg = document.createElement('div');
    aiMsg.className = 'chat-msg chat-msg-ai';
    aiMsg.innerHTML = '<span style="opacity: 0.85; font-style: italic;">Recherche en cours...</span>';
    ragChatHistory.appendChild(aiMsg);
    ragChatHistory.scrollTop = ragChatHistory.scrollHeight;
    
    const formData = new FormData();
    formData.append('pdf_filename', currentCourse.pdf_url || currentCourse.base_filename || '');
    if (audioBlob) {
        formData.append('audio', audioBlob, 'question.webm');
    } else {
        formData.append('message', text);
    }
    
    fetch('/api/chat', {
        method: 'POST',
        body: formData
    })
    .then(async response => {
        let data;
        try {
            data = await response.json();
        } catch (jsonErr) {
            data = { error: `Erreur du serveur (${response.status})` };
        }
        
        if (!response.ok || data.error) {
            aiMsg.innerHTML = `<span style="color:red; font-weight:bold;">Erreur:</span> ${data.error || 'Une erreur est survenue.'}`;
            if (wasPresPausedForQuestion) {
                const resumeContainer = document.createElement('div');
                resumeContainer.style.marginTop = '10px';
                resumeContainer.innerHTML = `
                    <button onclick="resumePresentationAudio()" class="action-btn-sm" style="background: #000000; color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" title="Reprendre l'explication de la présentation où elle s'était arrêtée">
                        Reprendre la présentation
                    </button>
                `;
                aiMsg.appendChild(resumeContainer);
            }
        } else {
            // Affichage direct du texte transcrit pour la question vocale
            if (data.transcription) {
                userMsg.textContent = data.transcription;
            }
            
            let formattedResponse = (data.response || '')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');
                
            // Affichage direct et instantané de la réponse (< 0.5s)
            aiMsg.innerHTML = formattedResponse;
            if (wasPresPausedForQuestion) {
                const resumeContainer = document.createElement('div');
                resumeContainer.style.marginTop = '10px';
                resumeContainer.innerHTML = `
                    <button onclick="resumePresentationAudio()" class="action-btn-sm" style="background: #000000; color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" title="Reprendre l'explication de la présentation où elle s'était arrêtée">
                        Reprendre la présentation
                    </button>
                `;
                aiMsg.appendChild(resumeContainer);
            }
            ragChatHistory.scrollTop = ragChatHistory.scrollHeight;
            
            // Génération et lecture audio en tâche de fond (asynchrone avec la même voix du cours)
            if (data.response) {
                const tutorVoice = currentCourse ? (currentCourse.edge_voice || currentCourse.tutor_voice) : null;
                fetch('/api/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        text: data.response,
                        course_id: currentCourse ? currentCourse.id : null,
                        voice: tutorVoice
                    })
                })
                .then(r => r.json())
                .then(ttsData => {
                    if (ttsData.audio_url && ragAudioPlayer) {
                        ragAudioPlayer.preservesPitch = true;
                        ragAudioPlayer.mozPreservesPitch = true;
                        ragAudioPlayer.webkitPreservesPitch = true;
                        ragAudioPlayer.playbackRate = currentPresentationSpeed;
                        ragAudioPlayer.src = ttsData.audio_url;
                        ragAudioPlayer.play().catch(e => console.log("Lecture audio RAG:", e));
                    }
                })
                .catch(e => console.log("TTS background error:", e));
            }
        }
        ragChatHistory.scrollTop = ragChatHistory.scrollHeight;
    })
    .catch(err => {
        aiMsg.innerHTML = `<span style='color:red;'>Erreur de communication avec le serveur: ${err.message || err}</span>`;
        if (wasPresPausedForQuestion) {
            const resumeContainer = document.createElement('div');
            resumeContainer.style.marginTop = '10px';
            resumeContainer.innerHTML = `
                <button onclick="resumePresentationAudio()" class="action-btn-sm" style="background: #000000; color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" title="Reprendre l'explication de la présentation où elle s'était arrêtée">
                    Reprendre la présentation
                </button>
            `;
            aiMsg.appendChild(resumeContainer);
        }
        ragChatHistory.scrollTop = ragChatHistory.scrollHeight;
    });
}

window.editCourse = function(id) {
    const course = courses.find(c => c.id == id);
    if (!course) return;
    
    window.navigateTo('creation');
    
    document.getElementById('course-id').value = course.id;
    document.getElementById('course-title').value = course.title || '';
    document.getElementById('course-desc').value = course.desc || '';
    document.getElementById('course-domain').value = course.domain || '';
    document.getElementById('course-duration').value = course.duration || '';
    document.getElementById('course-level').value = course.level || 'Débutant';
    
    const voiceSelect = document.getElementById('course-tutor-voice');
    if (voiceSelect) {
        voiceSelect.value = course.tutor_voice || 'auto';
    }
    
    const fileInput = document.getElementById('course-file');
    if (fileInput) {
        fileInput.required = false;
        fileInput.value = '';
    }
    
    const visSelect = document.getElementById('course-visibility');
    if (visSelect) visSelect.value = course.visibility || 'assigned';
    
    const dirInput = document.getElementById('course-target-directions');
    if (dirInput) dirInput.value = course.target_directions || '';
    
    const postInput = document.getElementById('course-target-postes');
    if (postInput) postInput.value = course.target_postes || '';
    
    // Miniature existante
    const existingThumbInput = document.getElementById('course-existing-thumbnail');
    const previewBox = document.getElementById('course-thumbnail-preview-box');
    const previewImg = document.getElementById('course-thumbnail-preview-img');
    const thumbInput = document.getElementById('course-thumbnail');
    if (thumbInput) thumbInput.value = '';
    
    if (course.thumbnail_url) {
        if (existingThumbInput) existingThumbInput.value = course.thumbnail_url;
        if (previewImg) previewImg.src = course.thumbnail_url;
        if (previewBox) previewBox.style.display = 'block';
    } else {
        removeCourseThumbnail();
    }
    
    toggleCourseVisibilityFields();
    
    document.getElementById('submit-btn').innerText = 'Mettre à jour la formation';
};

window.deleteCourse = async function(id) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette formation ?")) {
        try {
            await fetch('http://127.0.0.1:8092/api/courses/' + id, { method: 'DELETE' });
            await loadCourses();
        } catch(e) {
            console.error("Erreur suppression:", e);
        }
    }
};

// --- INTELLIGENCE ARTIFICIELLE (GEMINI WEBSOCKET) ---
let ws = null;
let isConnected = false;
let audioStream = null;
let processor = null;
let gainNode = null;
let recordingContext = null;
let playbackContext = null;
let nextPlayTime = 0;

const micBtn = document.getElementById('mic-btn');
const apiKey = window.config ? window.config.GEMINI_API_KEY : null;

micBtn.addEventListener('click', async () => {
    if (!apiKey || apiKey === 'votre_cle_api_gemini_ici') {
        alert("Veuillez configurer votre clé API dans le fichier config.js");
        return;
    }

    if (isConnected) {
        disconnect();
    } else {
        await connect();
    }
});

function getCurrentPageContext() {
    const isAdminOrSuper = currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin');
    const isDashboardActive = document.getElementById('page-dashboard')?.classList.contains('active');
    const isDetailsActive = document.getElementById('page-details')?.classList.contains('active');
    const isConsultationActive = document.getElementById('page-consultation')?.classList.contains('active');
    const isUsersActive = document.getElementById('page-users')?.classList.contains('active');
    const isAssignmentsActive = document.getElementById('page-assignments')?.classList.contains('active');
    const isCreationActive = document.getElementById('page-creation')?.classList.contains('active');

    if (isDashboardActive && isAdminOrSuper) {
        return {
            type: 'admin_dashboard',
            idleText: 'Analyse du TB Admin',
            connectedText: 'Arrêter Analyse TB',
            connectingText: 'Connexion Analyse TB...'
        };
    } else if (isDashboardActive && !isAdminOrSuper) {
        return {
            type: 'user_dashboard',
            idleText: 'Mon Suivi Formation',
            connectedText: 'Déconnecter Suivi',
            connectingText: 'Connexion Suivi...'
        };
    } else if (isDetailsActive && currentCourse) {
        return {
            type: 'course_tutor',
            idleText: `Tuteur IA : ${currentCourse.title || 'Cours'}`,
            connectedText: 'Arrêter le Tuteur',
            connectingText: 'Connexion Tuteur...'
        };
    } else if (isConsultationActive) {
        return {
            type: 'catalog',
            idleText: ' Guide du Catalogue',
            connectedText: 'Déconnecter Guide',
            connectingText: 'Connexion Guide...'
        };
    } else if (isAssignmentsActive) {
        return {
            type: 'assignments',
            idleText: 'Assistant Parcours & Assignations',
            connectedText: 'Déconnecter Assistant',
            connectingText: 'Connexion Assistant...'
        };
    } else if (isUsersActive) {
        return {
            type: 'users',
            idleText: 'Assistant Gestion Utilisateurs',
            connectedText: 'Déconnecter Assistant',
            connectingText: 'Connexion Assistant...'
        };
    } else if (isCreationActive) {
        return {
            type: 'creation',
            idleText: 'Assistant Création de Cours',
            connectedText: 'Déconnecter Assistant',
            connectingText: 'Connexion Assistant...'
        };
    }

    return {
        type: 'default',
        idleText: 'Assistant IA Live',
        connectedText: 'Déconnecter IA',
        connectingText: 'Connexion...'
    };
}

function updateAssistantButtonUI() {
    const aiAssistant = document.getElementById('ai-assistant');
    const isDetailsActive = document.getElementById('page-details')?.classList.contains('active');
    if (isDetailsActive) {
        if (aiAssistant) aiAssistant.style.display = 'none';
        return;
    } else if (currentUser && aiAssistant) {
        aiAssistant.style.display = 'block';
    }

    const btn = document.getElementById('mic-btn');
    if (!btn) return;
    const ctx = getCurrentPageContext();
    if (isConnected) {
        btn.className = 'btn-listening';
        btn.innerText = ctx.connectedText;
    } else {
        btn.className = 'btn-idle';
        btn.innerText = ctx.idleText;
    }
}

function getSlideTeachingPayload(slideNum) {
    if (!currentCourse) return { title: 'Général', bullets: '', narration: '' };
    const slides = Array.isArray(currentCourse.slides_data) ? currentCourse.slides_data : [];
    const scriptList = Array.isArray(currentCourse.script) ? currentCourse.script : [];
    const idx = Math.max(0, slideNum - 1);
    const s = slides[idx] || {};
    const title = s.titre || `Partie ${slideNum}`;
    const bullets = (s.puces && Array.isArray(s.puces)) ? s.puces.join(' ; ') : '';
    const narration = scriptList[idx] || s.narration || '';
    return { title, bullets, narration };
}

async function connect() {
    const pageCtx = getCurrentPageContext();
    try {
        recordingContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        playbackContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        nextPlayTime = playbackContext.currentTime;
        micBtn.innerText = pageCtx.connectingText;
    } catch (e) {
        console.error(e);
        resetUI();
        return;
    }

    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    ws = new WebSocket(url);

    ws.onopen = () => {
        let systemPrompt = `Tu es l'assistant IA de l'application 'IA Formation'. Discute avec l'utilisateur, réponds à ses questions de manière naturelle et aide-le.`;
        let welcomeMsg = "Bonjour ! Accueille-moi brièvement sur l'application 'IA Formation' et demande-moi comment tu peux m'aider.";

        if (pageCtx.type === 'admin_dashboard') {
            // Mode Tableau de Bord Administrateur : interaction exclusive sur les données du dashboard
            const dashboardData = getAdminDashboardSummaryJson();
            const dashboardJsonString = JSON.stringify(dashboardData, null, 2);

            systemPrompt = `Tu es l'analyste officiel et expert vocal du Tableau de Bord Administrateur de l'application 'IA Formation'.
L'administrateur (${dashboardData.utilisateur_connecte.nom_complet}) se trouve actuellement sur la page "Tableau de Bord Administrateur".

DONNÉES EN TEMPS RÉEL DU TABLEAU DE BORD (JSON) :
${dashboardJsonString}

CONSIGNES STRICTES POUR TON INTERACTION VOCALE :
1. TON RÔLE : Tu es l'analyste du Tableau de Bord Administrateur. Ton interaction porte STRICTEMENT et UNIQUEMENT sur le contenu, les indicateurs clés et les formations de ce tableau de bord.
2. ÉLÉMENTS CLÉS À DÉCRIRE :
   - Nombre total de formations : ${dashboardData.kpis_principaux.total_formations}
   - Volume horaire total : ${dashboardData.kpis_principaux.volume_horaire_total_heures} heures
   - Domaines différents : ${dashboardData.kpis_principaux.domaines_differents_count}
   - Répartition détaillée par niveau : Débutant (${dashboardData.repartition_par_niveau['Débutant']}), Intermédiaire (${dashboardData.repartition_par_niveau['Intermédiaire']}), Avancé (${dashboardData.repartition_par_niveau['Avancé']})
   - Répartition par domaine : ${Object.entries(dashboardData.formations_par_domaine).map(([d, c]) => `${d} (${c})`).join(', ') || 'Aucun domaine pour le moment'}
3. PÉRIMÈTRE EXCLUSIF : Ne parle que de ce tableau de bord, de ces statistiques et de ces formations. Si l'administrateur te pose une question générale hors de propos, recentre poliment sur l'analyse de ce dashboard.
4. ÉLOCUTION ORALE : Sois concis, direct, vivant et très clair. Parle naturellement comme un collègue analyste qui commente le tableau de bord à l'oral.
5. ENGAGEMENT : Termine ton accueil en invitant l'administrateur à te demander des précisions sur un indicateur ou sur le catalogue.`;

            welcomeMsg = "Bonjour ! Présente-moi et décris de manière synthétique et vivante tous les chiffres clés du tableau de bord administrateur affiché.";

        } else if (pageCtx.type === 'course_tutor' && currentCourse) {
            let slides = Array.isArray(currentCourse.slides_data) ? currentCourse.slides_data : [];
            let scriptList = Array.isArray(currentCourse.script) ? currentCourse.script : [];
            let totalSlides = slides.length || (pdfDoc ? pdfDoc.numPages : 1);
            window.liveTotalSlides = totalSlides;
            window.currentLiveSlide = 1;
            window.livePresentationReachedEnd = false;
            window.finalQuestionsPromptSent = false;
            window.liveSessionTerminating = false;
            window.isDisconnectingGracefully = false;
            window.silenceCounter = 0;
            window.isTutorPaused = false;
            window.userInterrupted = false;
            window.userAskingQuestion = false;
            window.isModelTurnComplete = false;
            if (window.advanceSlideTimeout) {
                clearTimeout(window.advanceSlideTimeout);
                window.advanceSlideTimeout = null;
            }

            let formattedSteps = [];
            for (let idx = 0; idx < totalSlides; idx++) {
                const s = slides[idx] || {};
                const scriptText = scriptList[idx] || s.narration || '';
                const title = s.titre || `Partie ${idx + 1}`;
                const bullets = (s.puces && Array.isArray(s.puces)) ? s.puces.join(' ; ') : '';
                formattedSteps.push(`### Étape ${idx + 1} sur ${totalSlides} : ${title}
- Points clés du support visuel : ${bullets || 'Non spécifiés'}
- Trame narrative préparée : ${scriptText || 'Non spécifiée'}`);
            }
            const courseGuideText = formattedSteps.join('\n\n');
            
            const tutorLiveName = currentCourse.tutor_name || 'votre formateur';
            systemPrompt = `Tu t'appelles ${tutorLiveName}, formateur d'entreprise d'élite à la Société Générale Côte d'Ivoire (SGCI), expert passionné, chaleureux, bienveillant et pédagogue.
Tu es en direct pour dispenser vocalement l'intégralité de la formation officielle "${currentCourse.title}" à l'apprenant en tête-à-tête.

STRUCTURE ET CONTENU OFFICIEL DU COURS (À DISPENSER ÉTAPE PAR ÉTAPE) :
Pour chaque étape (de 1 à ${totalSlides}), tu disposes à la fois des points clés du support visuel et de la trame narrative audio préparée. Ton rôle est de faire le matching parfait entre les deux pour délivrer une explication riche, claire et vivante :

${courseGuideText}

RÈGLES D'OR DE TON COMPORTEMENT (100% HUMAIN, RÉACTIF ET PÉDAGOGIQUE) :

1. DISPENSATION NATURELLE ET INTERDICTION DE PARLER DE DIAPOSITIVE OU DE LIRE DES NOTES :
   - Tu es un véritable formateur en face-à-face. L'apprenant NE DOIT JAMAIS avoir l'impression que tu lis un document ou des notes préparées.
   - INTERDICTION STRICTE ET FORMELLE de prononcer les mots : "diapositive", "slide", "diapo", "transparent", "écran", "sur cette image", "comme vous le voyez", "notes", "puces".
   - Tu t'exprimes avec TES PROPRES MOTS, des métaphores parlantes et des exemples concrets du secteur bancaire, en suivant fidèlement la trame et les concepts de l'étape en cours.
   - Synchronisation visuelle discrète : à chaque nouvelle étape abordée, appelle l'outil \`changeSlide\` avec le numéro correspondant (\`slideNumber\`) pour afficher le support à l'apprenant sans jamais le mentionner à l'oral.

2. ÉCOUTE ACTIVE, RÉPONSE AUX QUESTIONS ET GESTION DES INTERRUPTIONS :
   - L'apprenant est libre d'interrompre et de poser une question à tout moment pendant ton explication.
   - DÈS QUE L'APPRENANT PREND LA PAROLE : ARRÊTE-TOI IMMÉDIATEMENT. Ne poursuis pas ton explication.
   - Écoute sa question avec attention et bienveillance.
   - Réponds de manière précise, concrète et humaine à son interrogation en t'appuyant sur ton expertise.
   - Après ta réponse, demande brièvement : "Est-ce que c'est plus clair pour vous ? Souhaitez-vous qu'on reprenne la suite du cours ?".
   - Dès que l'apprenant confirme qu'il a compris ou souhaite continuer, reprends immédiatement la formation là où elle s'était arrêtée.

3. GESTION DES ORDRES D'ARRÊT ET DE PAUSE :
   - Si l'apprenant te demande de t'arrêter ou de faire une pause ("arrête-toi", "stop", "attends", "pause", "une minute") :
     * Appelle immédiatement l'outil \`pauseCourse\`.
     * Confirme très brièvement avec chaleur : "Bien sûr, je me mets en pause. Prenez votre temps, dites-moi simplement 'on reprend' ou 'continue' quand vous êtes prêt."
     * Tais-toi complètement. Ne reprends pas la parole de toi-même tant qu'il ne t'a pas invité expressément à reprendre.
   - Dès qu'il dit "on reprend", "c'est bon", "continue" :
     * Appelle l'outil \`resumeCourse\` et continue la formation.

4. PROGRESSION CONTINUE ET CONCLUSION DE LA FORMATION :
   - Tu dispenses chaque étape du cours l'une après l'autre, de l'étape 1 à l'étape ${totalSlides}.
   - À la dernière étape, après avoir expliqué les notions, propose une courte synthèse chaleureuse et demande à l'apprenant s'il a des questions sur l'ensemble de la formation.
   - Dès qu'il n'y a plus de questions et que la session est terminée, remercie-le chaleureusement et appelle l'outil \`finishTrainingSession\` pour clore la formation et déverrouiller son évaluation.

5. LANGUE STRICTEMENT FRANÇAISE :
   - Tout l'échange se déroule EXCLUSIVEMENT en Français.
   - En cas d'incompréhension ou de bruit, NE DEMANDE JAMAIS S'IL FAUT CHANGER DE LANGUE. Demande poliment en français : "Pardonnez-moi, je n'ai pas bien saisi votre question, pouvez-vous me la répéter s'il vous plaît ?".`;
            
            const p1 = getSlideTeachingPayload(1);
            welcomeMsg = `Bonjour ! Je démarre notre session de formation sur "${currentCourse.title}". Accueille-moi chaleureusement en une phrase, puis commence immédiatement à dispenser la première partie du cours en appelant changeSlide(1) et en expliquant de manière vivante son contenu sans jamais prononcer le mot diapositive :
Thème : "${p1.title}"
Notions clés du support : "${p1.bullets}"
Trame préparée : "${p1.narration}"`;

        } else if (pageCtx.type === 'catalog') {
            const courseTitles = (courses || []).map(c => `"${c.title}" (${c.domain || 'Général'}, ${c.duration || 0}h, ${c.level || 'Débutant'})`).join(', ');
            systemPrompt = `Tu es le Guide du Catalogue de formations de l'application 'IA Formation'.
Voici les formations actuellement disponibles dans le catalogue : ${courseTitles || 'Aucune formation pour le moment'}.
Aide l'utilisateur à découvrir les formations, conseille-le selon ses besoins et ses centres d'intérêt, avec clarté et bienveillance.`;
            welcomeMsg = "Bonjour ! Présente-moi le catalogue de formations et demande-moi quel domaine ou sujet m'intéresse.";

        } else if (pageCtx.type === 'assignments') {
            systemPrompt = `Tu es l'assistant expert des Parcours Pédagogiques et Assignations de l'application 'IA Formation'.
Tu conseilles l'administrateur sur la création des règles d'attribution automatique et le ciblage des collaborateurs selon leur direction, poste ou statut de contrat.`;
            welcomeMsg = "Bonjour ! Comment puis-je vous assister dans la configuration de vos parcours et assignations de formation ?";

        } else if (pageCtx.type === 'users') {
            const usersSummary = (window.allUsers || []).map(u => ({
                matricule: u.matricule,
                nom_complet: `${u.nom || ''} ${u.prenom || ''}`.trim(),
                direction: u.direction || 'Non définie',
                poste: u.poste || 'Non défini',
                role: u.role,
                statut_contrat: u.statut_contrat || 'CDI',
                cours_assignes: u.assigned_courses_count || 0
            }));
            systemPrompt = `Tu es l'assistant expert de la Gestion des Utilisateurs de l'application 'IA Formation'.
L'administrateur se trouve sur le Répertoire des Utilisateurs (${usersSummary.length} utilisateurs enregistrés).

DONNÉES EN TEMPS RÉEL DES UTILISATEURS (JSON) :
${JSON.stringify(usersSummary, null, 2)}

CONSIGNES :
1. Aide l'administrateur à consulter l'annuaire des collaborateurs et leurs profils.
2. Réponds précisément sur le nombre d'utilisateurs, leurs rôles (Admin, Apprenant, Super Admin), leurs directions, postes et contrats.
3. Sois concis, clair et professionnel à l'oral.`;

            welcomeMsg = `Bonjour ! Je peux vous aider à parcourir l'annuaire des ${usersSummary.length} collaborateurs ou répondre à vos questions sur leurs profils. Que souhaitez-vous savoir ?`;

        } else if (pageCtx.type === 'user_dashboard') {
            const assignedCourses = (courses || []).filter(c => c.is_assigned);
            systemPrompt = `Tu es le coach d'apprentissage personnel de l'utilisateur sur 'IA Formation'.
L'utilisateur a ${assignedCourses.length} formation(s) assignée(s) : ${assignedCourses.map(c => c.title).join(', ') || 'Aucune formation assignée pour le moment'}.
Encourage-le et réponds à ses questions sur son parcours personnel.`;
            welcomeMsg = "Bonjour ! Résume-moi mes formations assignées et comment je peux progresser.";
        }
        
        // Résolution de la voix du formateur pour Gemini Live (garantit la même voix que le cours)
        let liveVoiceName = "Puck";
        if (pageCtx.type === 'course_tutor' && currentCourse) {
            if (currentCourse.gemini_voice) {
                liveVoiceName = currentCourse.gemini_voice;
            } else {
                const v = (currentCourse.tutor_voice || '').toLowerCase();
                if (v === 'sophie' || v.includes('denise')) liveVoiceName = "Aoede";
                else if (v === 'marc' || v.includes('remy')) liveVoiceName = "Fenrir";
                else if (v === 'camille' || v.includes('vivienne')) liveVoiceName = "Kore";
                else liveVoiceName = "Puck";
            }
        }

        let setupData = {
            model: "models/gemini-3.1-flash-live-preview",
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: liveVoiceName
                        }
                    }
                }
            }
        };

        if (pageCtx.type === 'course_tutor') {
            setupData.tools = [
                {
                    functionDeclarations: [
                        {
                            name: "changeSlide",
                            description: "Synchronise discrètement l'affichage visuel de l'apprenant sur l'étape du cours correspondante (commence à 1). À appeler à chaque nouveau thème abordé.",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    slideNumber: {
                                        type: "INTEGER",
                                        description: "Numéro de l'étape en cours d'explication (commence à 1)"
                                    },
                                    isLastSlide: {
                                        type: "BOOLEAN",
                                        description: "Vrai s'il s'agit de la dernière étape ou conclusion"
                                    }
                                },
                                required: ["slideNumber"]
                            }
                        },
                        {
                            name: "pauseCourse",
                            description: "Met la formation en pause lorsque l'apprenant le demande ('pause', 'arrête-toi', 'attends', 'stop').",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    reason: {
                                        type: "STRING",
                                        description: "Raison de la pause"
                                    }
                                }
                            }
                        },
                        {
                            name: "resumeCourse",
                            description: "Reprend la formation après une pause lorsque l'apprenant indique qu'il est prêt ('continue', 'on reprend', 'c'est bon').",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    resumeSlide: {
                                        type: "INTEGER",
                                        description: "Numéro de l'étape à reprendre"
                                    }
                                }
                            }
                        },
                        {
                            name: "finishTrainingSession",
                            description: "À appeler dès que toute la formation et la présentation sont terminées et qu'il n'y a plus de questions de l'apprenant pour clore la formation et te déconnecter.",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    reason: {
                                        type: "STRING",
                                        description: "Raison de la clôture (ex: 'formation_terminee')"
                                    }
                                }
                            }
                        }
                    ]
                }
            ];
        }

        ws.send(JSON.stringify({ setup: setupData }));
        ws.welcomeMessage = welcomeMsg;
    };

    ws.onmessage = async (event) => {
        let textData = event.data;
        if (textData instanceof Blob) {
            textData = await textData.text();
        }

        let msg;
        try {
            msg = JSON.parse(textData);
        } catch (e) { return; }

        if (msg.setupComplete) {
            isConnected = true;
            micBtn.className = 'btn-listening';
            micBtn.innerText = pageCtx.connectedText;
            startRecording();
            
            ws.send(JSON.stringify({
                clientContent: {
                    turns: [{
                        role: "user",
                        parts: [{ text: ws.welcomeMessage }]
                    }],
                    turnComplete: true
                }
            }));
            
        } else if (msg.toolCall) {
            const calls = msg.toolCall.functionCalls || [];
            const functionResponses = [];
            for (let call of calls) {
                if (call.name === 'changeSlide') {
                    const page = call.args ? Number(call.args.slideNumber) : 1;
                    if (page && page > 0) {
                        window.currentLiveSlide = page;
                        pageNum = page;
                        renderPage(page);
                    }
                    if (call.args && call.args.isLastSlide) {
                        window.livePresentationReachedEnd = true;
                    }
                    functionResponses.push({
                        id: call.id,
                        response: { output: { success: true, currentPage: window.currentLiveSlide || page } }
                    });
                } else if (call.name === 'pauseCourse') {
                    window.isTutorPaused = true;
                    if (window.advanceSlideTimeout) {
                        clearTimeout(window.advanceSlideTimeout);
                        window.advanceSlideTimeout = null;
                    }
                    stopAudioPlayback();
                    if (typeof setHologramState === 'function') {
                        setHologramState('idle', 'Formation en pause à votre demande. Dites "continue" ou "on reprend" quand vous êtes prêt.');
                    }
                    functionResponses.push({
                        id: call.id,
                        response: { output: { success: true, paused: true } }
                    });
                } else if (call.name === 'resumeCourse') {
                    window.isTutorPaused = false;
                    window.userInterrupted = false;
                    window.userAskingQuestion = false;
                    const resumePage = (call.args && call.args.resumeSlide) ? Number(call.args.resumeSlide) : (window.currentLiveSlide || 1);
                    if (resumePage && resumePage > 0) {
                        window.currentLiveSlide = resumePage;
                        pageNum = resumePage;
                        renderPage(resumePage);
                    }
                    functionResponses.push({
                        id: call.id,
                        response: { output: { success: true, resumedSlide: window.currentLiveSlide } }
                    });
                } else if (call.name === 'finishTrainingSession') {
                    window.livePresentationReachedEnd = true;
                    window.liveSessionTerminating = true;
                    if (typeof handlePresentationCompleted === 'function') {
                        handlePresentationCompleted();
                    }
                    if (currentCourse) {
                        currentCourse.has_completed_training = true;
                        updateLiveEvalBtnState(true);
                    }
                    functionResponses.push({
                        id: call.id,
                        response: { output: { success: true, status: "terminating" } }
                    });
                    scheduleGracefulDisconnect();
                } else {
                    functionResponses.push({
                        id: call.id,
                        response: { output: { success: true } }
                    });
                }
            }
            if (ws && ws.readyState === WebSocket.OPEN && functionResponses.length > 0) {
                ws.send(JSON.stringify({
                    toolResponse: {
                        functionResponses: functionResponses
                    }
                }));
            }
        } else if (msg.serverContent) {
            if (msg.serverContent.interrupted) {
                console.log("[Gemini Live] Interruption détectée par le serveur : coupure audio immédiate");
                stopAudioPlayback();
                if (window.advanceSlideTimeout) {
                    clearTimeout(window.advanceSlideTimeout);
                    window.advanceSlideTimeout = null;
                }
                window.userInterrupted = true;
                window.userAskingQuestion = true;
            }
            if (msg.serverContent.modelTurn && msg.serverContent.modelTurn.parts) {
                window.isModelTurnComplete = false;
                const parts = msg.serverContent.modelTurn.parts;
                for (let part of parts) {
                    if (part.inlineData && part.inlineData.data) {
                        playAudioChunk(part.inlineData.data);
                    }
                    if (part.text) {
                        const lt = part.text.toLowerCase();
                        if (lt.includes("conclut notre") || lt.includes("fin de notre formation") || lt.includes("résume l'essentiel de notre parcours") || lt.includes("terminé notre présentation")) {
                            window.livePresentationReachedEnd = true;
                        }
                    }
                }
            }
            if (msg.serverContent.turnComplete) {
                window.isModelTurnComplete = true;
                if (document.getElementById('page-details')?.classList.contains('active')) {
                    if (!activeAudioSources || activeAudioSources.length === 0 || (playbackContext && playbackContext.currentTime >= nextPlayTime)) {
                        handleTutorTurnFinished();
                    }
                }
            }
        }
    };

    ws.onclose = (event) => {
        console.warn("WebSocket fermé:", event.code, event.reason);
        if (event.code !== 1000 && event.code !== 1005) {
            alert("Déconnexion de l'IA (Code " + event.code + "). " + (event.reason || "C'est probablement un problème de quota de clé API ou de modèle non supporté."));
        }
        disconnect();
    };
    ws.onerror = (err) => { 
        console.error("Erreur WebSocket:", err); 
        disconnect(); 
    };
}

function scheduleGracefulDisconnect() {
    if (window.isDisconnectingGracefully) return;
    window.isDisconnectingGracefully = true;
    window.liveSessionTerminating = true;

    // Laisser le temps à l'audio d'au revoir de se terminer proprement
    let delayMs = 1500;
    if (playbackContext && nextPlayTime > playbackContext.currentTime) {
        delayMs = Math.max(1200, ((nextPlayTime - playbackContext.currentTime) * 1000) + 800);
    }

    setTimeout(() => {
        if (typeof handlePresentationCompleted === 'function') {
            handlePresentationCompleted();
        }
        if (isConnected) {
            disconnect();
        }
        if (typeof setHologramState === 'function') {
            setHologramState('idle');
        }
        const speechContent = document.getElementById('holo-speech-content');
        if (speechContent) {
            speechContent.innerText = "« Formation terminée. Merci pour votre attention ! La session est déconnectée. »";
        }
        window.isDisconnectingGracefully = false;
    }, delayMs);
}

function disconnect() {
    if (ws) { 
        try { ws.close(); } catch(e){} 
        ws = null; 
    }
    if (window.advanceSlideTimeout) {
        clearTimeout(window.advanceSlideTimeout);
        window.advanceSlideTimeout = null;
    }
    stopAudioPlayback();
    stopRecording();
    isConnected = false;
    window.silenceCounter = 0;
    window.livePresentationReachedEnd = false;
    window.finalQuestionsPromptSent = false;
    window.liveSessionTerminating = false;
    window.isDisconnectingGracefully = false;
    window.isTutorPaused = false;
    window.userInterrupted = false;
    window.userAskingQuestion = false;
    window.isModelTurnComplete = false;
    resetUI();
    if (typeof setHologramState === 'function') {
        setHologramState('idle');
    }
}

function resetUI() {
    updateAssistantButtonUI();
}

async function startRecording() {
    try {
        audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 16000,
                channelCount: 1
            }
        });
    } catch (err) {
        console.error("Erreur micro:", err);
        disconnect();
        return;
    }

    const source = recordingContext.createMediaStreamSource(audioStream);
    processor = recordingContext.createScriptProcessor(4096, 1, 1);
    gainNode = recordingContext.createGain();
    gainNode.gain.value = 0;

    source.connect(processor);
    processor.connect(gainNode);
    gainNode.connect(recordingContext.destination);

    processor.onaudioprocess = (e) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        
        // Calcul du volume pour détecter la voix
        let sum = 0;
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
            sum += Math.abs(inputData[i]);
            let s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        let volume = sum / inputData.length;
        
        // Coupure audio immédiate (Barge-in) : si l'utilisateur prend la parole
        const aiSpeaking = playbackContext && (playbackContext.currentTime < nextPlayTime);
        if (volume > 0.025) {
            if (aiSpeaking) {
                console.log("[Gemini Live] Prise de parole détectée au micro : interruption immédiate de la voix IA");
                stopAudioPlayback();
            }
            if (window.advanceSlideTimeout) {
                clearTimeout(window.advanceSlideTimeout);
                window.advanceSlideTimeout = null;
            }
            window.userInterrupted = true;
            window.userAskingQuestion = true;
        }

        // Animation de l'hologramme & gestion douce de la fin du cours
        if (currentCourse && document.getElementById('page-details')?.classList.contains('active')) {
            if (window.liveSessionTerminating || window.isDisconnectingGracefully) {
                return;
            }

            if (aiSpeaking || volume > 0.015) {
                window.silenceCounter = 0;
                if (!aiSpeaking && volume > 0.015) {
                    if (typeof setHologramState === 'function') setHologramState('listening');
                }
            } else {
                if (typeof setHologramState === 'function') setHologramState('idle');
                window.silenceCounter = (window.silenceCounter || 0) + (inputData.length / 16000);
                
                // Uniquement lorsque la fin de la formation a été atteinte : déconnexion en douceur après 6 secondes de silence
                if (window.livePresentationReachedEnd && window.silenceCounter >= 6.0) {
                    window.silenceCounter = 0;
                    if (ws && isConnected) {
                        if (window.finalQuestionsPromptSent) {
                            scheduleGracefulDisconnect();
                        } else {
                            window.finalQuestionsPromptSent = true;
                            ws.send(JSON.stringify({
                                clientContent: {
                                    turns: [{
                                        role: "user",
                                        parts: [{ text: "(Silence de l'apprenant. La formation est terminée et il n'a plus de questions. Conclus chaleureusement en une courte phrase d'adieu pour terminer et appelle impérativement finishTrainingSession pour clore la formation.)" }]
                                    }],
                                    turnComplete: true
                                }
                            }));
                            // Sécurité de déconnexion si l'IA tarde à appeler le tool
                            setTimeout(() => {
                                if (isConnected && window.livePresentationReachedEnd) {
                                    scheduleGracefulDisconnect();
                                }
                            }, 5000);
                        }
                    }
                }
            }
        }

        const uint8 = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < uint8.byteLength; i++) {
            binary += String.fromCharCode(uint8[i]);
        }
        const base64 = btoa(binary);

        ws.send(JSON.stringify({
            realtimeInput: {
                audio: { mimeType: "audio/pcm;rate=16000", data: base64 }
            }
        }));
    };
}

function stopRecording() {
    stopAudioPlayback();
    if (processor) { processor.disconnect(); processor = null; }
    if (gainNode) { gainNode.disconnect(); gainNode = null; }
    if (audioStream) { audioStream.getTracks().forEach(track => track.stop()); audioStream = null; }
    if (recordingContext) { recordingContext.close(); recordingContext = null; }
    if (playbackContext) { playbackContext.close(); playbackContext = null; }
    if (typeof setHologramState === 'function') setHologramState('idle');
}

let currentLiveTutorSpeed = 1.0;
function changeLiveTutorSpeed(speed) {
    currentLiveTutorSpeed = parseFloat(speed) || 1.0;
    currentPresentationSpeed = currentLiveTutorSpeed;
    
    // Synchroniser le sélecteur du mode Présentation
    const presSelect = document.getElementById('presentation-speed-select');
    if (presSelect) {
        presSelect.value = String(currentLiveTutorSpeed);
    }
}
window.changeLiveTutorSpeed = changeLiveTutorSpeed;

// Algorithme SOLA (Synchronized Overlap-Add) : modifie la vitesse en préservant à 100% le pitch et la voix d'origine
function timeStretchPitchPreserved(samples, speed, sampleRate = 24000) {
    if (!speed || Math.abs(speed - 1.0) < 0.02 || samples.length < 480) {
        return samples;
    }
    
    const winSize = Math.floor(sampleRate * 0.02); // 20ms = 480 échantillons
    const overlap = Math.floor(winSize * 0.5);      // 10ms = 240 échantillons
    const hopOut = winSize - overlap;               // 240
    const hopIn = Math.max(1, Math.round(hopOut * speed));
    const maxSearch = Math.floor(sampleRate * 0.008); // 8ms = 192 échantillons
    
    const nIn = samples.length;
    if (nIn < winSize + maxSearch) {
        return samples;
    }
    
    const estOut = Math.floor(nIn / speed) + winSize + 256;
    const output = new Float32Array(estOut);
    
    const fadeIn = new Float32Array(overlap);
    const fadeOut = new Float32Array(overlap);
    for (let i = 0; i < overlap; i++) {
        fadeIn[i] = i / overlap;
        fadeOut[i] = 1.0 - fadeIn[i];
    }
    
    for (let i = 0; i < winSize; i++) {
        output[i] = samples[i];
    }
    
    let outPos = hopOut;
    let inPos = hopIn;
    
    while (inPos + winSize + maxSearch < nIn) {
        let bestOffset = 0;
        let bestCorr = -Infinity;
        
        const searchStart = Math.max(0, inPos - Math.floor(maxSearch / 2));
        const searchEnd = Math.min(nIn - winSize, inPos + Math.floor(maxSearch / 2));
        
        for (let s = searchStart; s <= searchEnd; s += 2) {
            let corr = 0;
            for (let j = 0; j < overlap; j += 4) {
                corr += output[outPos + j] * samples[s + j];
            }
            if (corr > bestCorr) {
                bestCorr = corr;
                bestOffset = s - inPos;
            }
        }
        
        const actualIn = inPos + bestOffset;
        for (let j = 0; j < overlap; j++) {
            output[outPos + j] = output[outPos + j] * fadeOut[j] + samples[actualIn + j] * fadeIn[j];
        }
        for (let j = overlap; j < winSize; j++) {
            output[outPos + j] = samples[actualIn + j];
        }
        
        outPos += hopOut;
        inPos += hopIn;
    }
    
    return output.subarray(0, outPos);
}

let activeAudioSources = [];

function stopAudioPlayback() {
    if (activeAudioSources && activeAudioSources.length > 0) {
        for (const src of activeAudioSources) {
            try {
                src.onended = null;
                src.stop();
                src.disconnect();
            } catch (e) {}
        }
        activeAudioSources = [];
    }
    if (playbackContext) {
        nextPlayTime = playbackContext.currentTime;
    }
    if (typeof setHologramState === 'function') {
        setHologramState('idle');
    }
}
window.stopAudioPlayback = stopAudioPlayback;

function playAudioChunk(base64Data) {
    if (!playbackContext) return;
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) { bytes[i] = binaryStr.charCodeAt(i); }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) { float32[i] = int16[i] / 32768.0; }
    
    const speed = currentLiveTutorSpeed || 1.0;
    
    // Modulation temporelle avec conservation intégrale du timbre et de la hauteur vocale (Pitch-Preserved)
    const processedFloat32 = (Math.abs(speed - 1.0) < 0.02)
        ? float32
        : timeStretchPitchPreserved(float32, speed, 24000);

    const buffer = playbackContext.createBuffer(1, processedFloat32.length, 24000);
    buffer.getChannelData(0).set(processedFloat32);
    
    const source = playbackContext.createBufferSource();
    source.buffer = buffer;
    
    // playbackRate reste à 1.0 afin de ne JAMAIS altérer la hauteur de la voix (pas d'effet écureuil/monstre)
    source.playbackRate.value = 1.0;

    source.connect(playbackContext.destination);
    if (nextPlayTime < playbackContext.currentTime) { nextPlayTime = playbackContext.currentTime; }
    source.start(nextPlayTime);
    nextPlayTime += buffer.duration;

    activeAudioSources.push(source);

    source.onended = () => {
        const idx = activeAudioSources.indexOf(source);
        if (idx > -1) activeAudioSources.splice(idx, 1);
        if (document.getElementById('page-details')?.classList.contains('active')) {
            if (playbackContext && playbackContext.currentTime >= nextPlayTime) {
                if (typeof setHologramState === 'function') setHologramState('idle');
                if (window.isModelTurnComplete) {
                    handleTutorTurnFinished();
                }
            }
        }
    };

    if (document.getElementById('page-details')?.classList.contains('active')) {
        if (typeof setHologramState === 'function') setHologramState('speaking');
    }
}

function handleTutorTurnFinished() {
    if (!currentCourse || !isConnected || !ws || ws.readyState !== WebSocket.OPEN) return;
    const isDetails = document.getElementById('page-details')?.classList.contains('active');
    if (!isDetails) return;
    if (window.liveSessionTerminating || window.isDisconnectingGracefully) return;
    if (window.isTutorPaused) return;

    if (window.advanceSlideTimeout) {
        clearTimeout(window.advanceSlideTimeout);
        window.advanceSlideTimeout = null;
    }

    // 1. SI L'APPRENANT AVAIT POSÉ UNE QUESTION OU INTERROMPU :
    if (window.userAskingQuestion || window.userInterrupted) {
        // Le formateur a terminé sa réponse à la question.
        // On laisse une pause de 4.5 secondes à l'apprenant pour lui permettre de réagir ou poser une autre question.
        window.advanceSlideTimeout = setTimeout(() => {
            if (!isConnected || !ws || ws.readyState !== WebSocket.OPEN) return;
            if (window.isTutorPaused || window.liveSessionTerminating) return;
            
            const aiSpeaking = playbackContext && (playbackContext.currentTime < nextPlayTime);
            if (aiSpeaking) return;

            window.userAskingQuestion = false;
            window.userInterrupted = false;

            // Reprendre naturellement le cours à l'étape actuelle si la formation n'est pas achevée
            if (!window.livePresentationReachedEnd) {
                const curSlide = window.currentLiveSlide || 1;
                const p = getSlideTeachingPayload(curSlide);
                window.isModelTurnComplete = false;
                ws.send(JSON.stringify({
                    clientContent: {
                        turns: [{
                            role: "user",
                            parts: [{
                                text: `(L'apprenant n'a pas d'autre question. Poursuis naturellement la formation là où elle s'était arrêtée, à l'étape en cours (${curSlide} sur ${window.liveTotalSlides} : "${p.title}"). Assure une transition chaleureuse et fluide, termine d'expliquer les concepts clés et prépare la suite, sans jamais prononcer le mot diapositive.)`
                            }]
                        }],
                        turnComplete: true
                    }
                }));
            }
        }, 4500);
        return;
    }

    // 2. SI TOUTES LES ÉTAPES DU COURS ONT DÉJÀ ÉTÉ COUVERTES :
    if (window.livePresentationReachedEnd) return;

    // 3. ENCHAÎNEMENT NATUREL ET CONTINU DU COURS ÉTAPE PAR ÉTAPE :
    // Respiration humaine naturelle de 2.2 secondes entre les étapes
    window.advanceSlideTimeout = setTimeout(() => {
        if (!isConnected || !ws || ws.readyState !== WebSocket.OPEN) return;
        if (window.isTutorPaused || window.liveSessionTerminating) return;
        if (window.userAskingQuestion || window.userInterrupted) return;
        
        const aiSpeaking = playbackContext && (playbackContext.currentTime < nextPlayTime);
        if (aiSpeaking) return;

        const nextSlide = (window.currentLiveSlide || 1) + 1;
        if (nextSlide <= (window.liveTotalSlides || 1)) {
            window.currentLiveSlide = nextSlide;
            pageNum = nextSlide;
            renderPage(nextSlide);
            
            const p = getSlideTeachingPayload(nextSlide);
            const isLast = (nextSlide === window.liveTotalSlides);
            window.isModelTurnComplete = false;
            
            ws.send(JSON.stringify({
                clientContent: {
                    turns: [{
                        role: "user",
                        parts: [{
                            text: `(Passe maintenant à l'étape suivante du cours : étape ${nextSlide} sur ${window.liveTotalSlides}. Appelle discrètement changeSlide(${nextSlide}${isLast ? ', true' : ''}). Explique chaleureusement et de manière vivante son contenu en faisant le matching parfait entre le support et le script préparé.
Thème : "${p.title}"
Notions clés du support : "${p.bullets}"
Trame narrative préparée : "${p.narration}"
Reste 100% naturel, ne prononce aucun terme comme diapositive ou slide, parle comme un vrai formateur d'entreprise SGCI.)`
                        }]
                    }],
                    turnComplete: true
                }
            }));
        } else {
            // Fin de toutes les étapes du cours atteinte
            window.livePresentationReachedEnd = true;
            window.isModelTurnComplete = false;
            ws.send(JSON.stringify({
                clientContent: {
                    turns: [{
                        role: "user",
                        parts: [{
                            text: `(Toutes les étapes du cours ont été présentées. Fais une courte synthèse chaleureuse de l'essentiel à retenir pour l'apprenant. Demande-lui s'il a des questions sur l'ensemble de la formation avant de conclure.)`
                        }]
                    }],
                    turnComplete: true
                }
            }));
        }
    }, 2200);
}

// ==========================================================================
// MODULE : ÉVALUATION INTERACTIVE & DIAGNOSTIC PÉDAGOGIQUE IA
// ==========================================================================
let currentEvalQuiz = null;
let currentEvalIndex = 0;
let currentEvalAnswers = {}; // { questionId: selectedOptionIndex }
let lastEvalDiagnostic = null;
let currentEvalLatestResult = null;

window.startCurrentCourseEvaluation = function() {
    const course = (currentCourse && currentCourse.id) ? currentCourse : (typeof selectedCourseForModal !== 'undefined' && selectedCourseForModal && selectedCourseForModal.id ? selectedCourseForModal : null);
    if (!course) {
        alert("Veuillez d'abord sélectionner une formation.");
        return;
    }
    const hasFollowed = Boolean(course.has_completed_training || course.user_evaluation);
    if (!hasFollowed) {
        alert("Vous devez d'abord suivre la formation jusqu'au bout pour débloquer l'évaluation.");
        return;
    }
    startEvaluationMode(course.id);
};

window.startEvaluationMode = async function(courseId) {
    const course = courses.find(c => c.id == courseId);
    if (!course) {
        alert("Formation introuvable");
        return;
    }
    const hasFollowed = Boolean(course.has_completed_training || course.user_evaluation);
    if (!hasFollowed) {
        alert("Vous devez d'abord suivre la formation jusqu'au bout pour débloquer l'évaluation.");
        return;
    }
    currentCourse = course;
    
    // Mettre en pause tout audio en cours
    if (typeof presentationAudio !== 'undefined' && presentationAudio) {
        try { presentationAudio.pause(); } catch (e) {}
    }
    if (typeof audioPlayer !== 'undefined' && audioPlayer) {
        try { audioPlayer.pause(); } catch (e) {}
    }

    // Basculer vers la page d'évaluation
    window.navigateTo('evaluation');

    // Réinitialiser les états
    currentEvalQuiz = null;
    currentEvalIndex = 0;
    currentEvalAnswers = {};
    lastEvalDiagnostic = null;
    currentEvalLatestResult = null;

    // Titres et métadonnées
    const titleEl = document.getElementById('eval-course-title');
    if (titleEl) titleEl.innerText = course.title;
    const domainEl = document.getElementById('eval-course-domain');
    if (domainEl) domainEl.innerText = course.domain || 'Formation continue SGCI';
    
    // Afficher écran intro et masquer les autres
    document.getElementById('eval-screen-intro').style.display = 'block';
    document.getElementById('eval-screen-questions').style.display = 'none';
    document.getElementById('eval-screen-loading').style.display = 'none';
    document.getElementById('eval-screen-results').style.display = 'none';

    // Charger les questions et l'éventuelle évaluation passée depuis l'API
    const userId = currentUser ? currentUser.id : '';
    try {
        const res = await fetch(`http://127.0.0.1:8092/api/courses/${courseId}/quiz?user_id=${userId}`);
        const data = await res.json();
        if (data.success && data.questions && data.questions.length > 0) {
            currentEvalQuiz = data;
            const qCountEl = document.getElementById('eval-intro-qcount');
            if (qCountEl) qCountEl.innerText = data.questions.length;

            currentEvalLatestResult = data.latest_evaluation || null;
            const pastResultEl = document.getElementById('eval-intro-past-result');
            const startBtnText = document.getElementById('eval-intro-start-text');

            if (currentEvalLatestResult) {
                if (pastResultEl) pastResultEl.style.display = 'block';
                const scoreEl = document.getElementById('eval-intro-past-score');
                if (scoreEl) scoreEl.innerText = `${Math.round(currentEvalLatestResult.score)}%`;
                
                const badgeEl = document.getElementById('eval-intro-past-badge');
                if (badgeEl) {
                    const isPassed = currentEvalLatestResult.passed;
                    badgeEl.innerText = isPassed ? 'Validé' : 'À consolider';
                    badgeEl.style.background = isPassed ? '#f1f5f9' : '#fee2e2';
                    badgeEl.style.color = isPassed ? '#000000' : '#b91c1c';
                }

                const dateEl = document.getElementById('eval-intro-past-date');
                if (dateEl && currentEvalLatestResult.completed_at) {
                    try {
                        const d = new Date(currentEvalLatestResult.completed_at);
                        dateEl.innerText = `Effectué le ${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
                    } catch (e) {
                        dateEl.innerText = currentEvalLatestResult.completed_at;
                    }
                }

                if (startBtnText) startBtnText.innerText = 'Repasser une nouvelle évaluation';
            } else {
                if (pastResultEl) pastResultEl.style.display = 'none';
                if (startBtnText) startBtnText.innerText = 'Commencer le test maintenant';
            }
        } else {
            alert(data.error || "Impossible de charger le questionnaire d'évaluation pour ce cours.");
            window.navigateTo('presentation');
        }
    } catch (err) {
        console.error("Erreur chargement quiz:", err);
        alert("Erreur lors de la récupération du questionnaire d'évaluation.");
    }
};

window.viewPastEvaluationDiagnostic = function() {
    if (!currentEvalLatestResult || !currentEvalLatestResult.diagnostic) {
        alert("Aucun diagnostic enregistré pour cette évaluation.");
        return;
    }
    lastEvalDiagnostic = currentEvalLatestResult.diagnostic;
    document.getElementById('eval-screen-intro').style.display = 'none';
    document.getElementById('eval-screen-questions').style.display = 'none';
    document.getElementById('eval-screen-loading').style.display = 'none';
    document.getElementById('eval-screen-results').style.display = 'block';
    renderEvaluationResults(currentEvalLatestResult.diagnostic);
};

window.exitEvaluation = function() {
    if (currentCourse) {
        startPresentationMode(currentCourse.id);
    } else {
        window.navigateTo('consultation');
    }
};

window.startQuizQuestions = function() {
    if (!currentEvalQuiz || !currentEvalQuiz.questions || currentEvalQuiz.questions.length === 0) {
        alert("Aucune question disponible pour ce test.");
        return;
    }
    currentEvalIndex = 0;
    currentEvalAnswers = {};

    document.getElementById('eval-screen-intro').style.display = 'none';
    document.getElementById('eval-screen-questions').style.display = 'block';
    document.getElementById('eval-screen-results').style.display = 'none';
    document.getElementById('eval-screen-loading').style.display = 'none';

    renderCurrentQuizQuestion();
};

function renderCurrentQuizQuestion() {
    if (!currentEvalQuiz) return;
    const questions = currentEvalQuiz.questions;
    const total = questions.length;
    const q = questions[currentEvalIndex];
    if (!q) return;

    // Progression
    const progText = document.getElementById('eval-progress-text');
    if (progText) progText.innerText = `Question ${currentEvalIndex + 1} sur ${total}`;
    
    const percent = Math.round(((currentEvalIndex + 1) / total) * 100);
    const fillEl = document.getElementById('eval-progress-bar-fill');
    if (fillEl) fillEl.style.width = `${percent}%`;

    const badgeEl = document.getElementById('eval-current-concept-badge');
    if (badgeEl) badgeEl.innerText = q.concept ? `Notion : ${q.concept}` : 'Notion clé';

    // Question
    const qTextEl = document.getElementById('eval-question-text');
    if (qTextEl) qTextEl.innerText = `${currentEvalIndex + 1}. ${q.question}`;

    // Options
    const container = document.getElementById('eval-options-container');
    if (!container) return;
    container.innerHTML = '';

    const letters = ['A', 'B', 'C', 'D', 'E'];
    const currentSelected = currentEvalAnswers[q.id !== undefined ? q.id : currentEvalIndex];

    (q.options || []).forEach((opt, optIdx) => {
        const isSelected = currentSelected === optIdx;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `eval-option-btn ${isSelected ? 'selected' : ''}`;
        btn.onclick = () => selectQuizOption(q.id !== undefined ? q.id : currentEvalIndex, optIdx);

        btn.innerHTML = `
            <div class="eval-option-radio"></div>
            <div style="display: flex; gap: 8px; align-items: baseline; flex: 1;">
                <strong style="color: ${isSelected ? '#e9041e' : '#475569'}; min-width: 22px;">${letters[optIdx] || optIdx + 1}.</strong>
                <span style="line-height: 1.45;">${opt}</span>
            </div>
        `;
        container.appendChild(btn);
    });

    // Boutons de navigation
    const prevBtn = document.getElementById('eval-btn-prev');
    const nextBtn = document.getElementById('eval-btn-next');
    const submitBtn = document.getElementById('eval-btn-submit');

    if (prevBtn) prevBtn.style.visibility = (currentEvalIndex > 0) ? 'visible' : 'hidden';

    if (currentEvalIndex === total - 1) {
        if (nextBtn) nextBtn.style.display = 'none';
        if (submitBtn) submitBtn.style.display = 'inline-flex';
    } else {
        if (nextBtn) nextBtn.style.display = 'inline-flex';
        if (submitBtn) submitBtn.style.display = 'none';
    }
}

window.selectQuizOption = function(qId, optIdx) {
    currentEvalAnswers[qId] = optIdx;
    renderCurrentQuizQuestion();
};

window.prevQuizQuestion = function() {
    if (currentEvalIndex > 0) {
        currentEvalIndex--;
        renderCurrentQuizQuestion();
    }
};

window.nextQuizQuestion = function() {
    if (currentEvalQuiz && currentEvalIndex < currentEvalQuiz.questions.length - 1) {
        currentEvalIndex++;
        renderCurrentQuizQuestion();
    }
};

let oralMediaRecorder = null;
let oralAudioChunks = [];
let oralRecordedBlob = null;

window.submitEvaluation = async function() {
    if (!currentEvalQuiz || !currentCourse) return;
    const questions = currentEvalQuiz.questions;
    const total = questions.length;

    // Vérifier si toutes les questions sont répondues
    const answeredCount = Object.keys(currentEvalAnswers).length;
    if (answeredCount < total) {
        const confirmSubmit = confirm(`Vous avez répondu à ${answeredCount} question(s) sur ${total}. Voulez-vous tout de même soumettre vos réponses écrites ?`);
        if (!confirmSubmit) return;
    }

    // Afficher écran de chargement IA
    document.getElementById('eval-screen-questions').style.display = 'none';
    document.getElementById('eval-screen-loading').style.display = 'block';

    try {
        const payload = {
            user_id: currentUser ? currentUser.id : null,
            answers: currentEvalAnswers
        };

        const res = await fetch(`/api/courses/${currentCourse.id}/quiz/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success && data.evaluation) {
            lastEvalDiagnostic = data.evaluation;
            
            // Vérifier si la formation est assignée : si oui, épreuve orale obligatoire (Section 26 & 27)
            const isAssigned = Boolean(currentCourse.is_assigned);
            if (isAssigned) {
                document.getElementById('eval-screen-loading').style.display = 'none';
                document.getElementById('eval-screen-oral').style.display = 'block';
                
                // Charger la question orale depuis l'API
                try {
                    const oRes = await fetch(`/api/courses/${currentCourse.id}/oral_questions?user_id=${currentUser ? currentUser.id : ''}`);
                    const oData = await oRes.json();
                    if (oData.success && oData.oral_questions && oData.oral_questions.length > 0) {
                        const q1 = oData.oral_questions[0];
                        const qEl = document.getElementById('eval-oral-question-text');
                        if (qEl) qEl.innerText = q1.question;
                    }
                } catch (eOral) {
                    console.warn("Erreur chargement consigne orale:", eOral);
                }
                return;
            }

            // Formation publique : validation par QCM direct (100% QCM, seuil 70%)
            renderEvaluationResults(data.evaluation);
            if (currentUser && typeof loadCourses === 'function') {
                loadCourses();
            }
        } else {
            alert(data.error || "Une erreur est survenue lors de l'évaluation de vos réponses.");
            document.getElementById('eval-screen-loading').style.display = 'none';
            document.getElementById('eval-screen-questions').style.display = 'block';
        }
    } catch (err) {
        console.error("Erreur submitEvaluation:", err);
        alert("Erreur de connexion au serveur pour l'évaluation.");
        document.getElementById('eval-screen-loading').style.display = 'none';
        document.getElementById('eval-screen-questions').style.display = 'block';
    }
};

window.startOralRecording = async function() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        oralAudioChunks = [];
        oralMediaRecorder = new MediaRecorder(stream);
        oralMediaRecorder.ondataavailable = e => { if (e.data.size > 0) oralAudioChunks.push(e.data); };
        oralMediaRecorder.onstop = () => {
            oralRecordedBlob = new Blob(oralAudioChunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(oralRecordedBlob);
            const player = document.getElementById('eval-oral-audio-playback');
            if (player) {
                player.src = audioUrl;
                document.getElementById('oral-audio-player-box').style.display = 'block';
            }
            stream.getTracks().forEach(t => t.stop());
        };
        oralMediaRecorder.start();
        document.getElementById('btn-start-record-oral').style.display = 'none';
        document.getElementById('btn-stop-record-oral').style.display = 'inline-flex';
        const st = document.getElementById('oral-recording-status');
        if (st) {
            st.innerText = "🔴 Enregistrement vocal en cours... Parlez clairement.";
            st.style.color = "#dc2626";
        }
    } catch (e) {
        console.warn("Microphone access error:", e);
        alert("Impossible d'accéder au micro. Vous pouvez rédiger directement votre argumentation dans la zone de texte prévue ci-dessous.");
    }
};

window.stopOralRecording = function() {
    if (oralMediaRecorder && oralMediaRecorder.state === 'recording') {
        oralMediaRecorder.stop();
    }
    document.getElementById('btn-start-record-oral').style.display = 'inline-flex';
    document.getElementById('btn-stop-record-oral').style.display = 'none';
    const st = document.getElementById('oral-recording-status');
    if (st) {
        st.innerText = "✅ Enregistrement terminé. Vous pouvez réécouter votre enregistrement ci-dessous.";
        st.style.color = "#000000";
    }
};

window.backToQcmFromOral = function() {
    document.getElementById('eval-screen-oral').style.display = 'none';
    document.getElementById('eval-screen-questions').style.display = 'block';
};

window.submitOralAndFinish = async function() {
    if (!currentCourse) return;
    const writtenText = (document.getElementById('eval-oral-text-response')?.value || '').trim();
    if (!oralRecordedBlob && !writtenText) {
        alert("Veuillez enregistrer votre réponse orale ou saisir votre argumentation par écrit.");
        return;
    }

    document.getElementById('eval-screen-oral').style.display = 'none';
    document.getElementById('eval-screen-loading').style.display = 'block';

    try {
        const formData = new FormData();
        formData.append('user_id', currentUser ? currentUser.id : 1);
        formData.append('response_text', writtenText);
        if (oralRecordedBlob) {
            formData.append('audio', oralRecordedBlob, 'oral_response.webm');
        }

        const res = await fetch(`/api/courses/${currentCourse.id}/oral_evaluation`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            renderOralEvaluationResults(data);
        } else {
            alert(data.error || "Erreur lors de la notation de l'épreuve orale.");
            document.getElementById('eval-screen-loading').style.display = 'none';
            document.getElementById('eval-screen-oral').style.display = 'block';
        }
    } catch (e) {
        console.error("submitOralAndFinish error:", e);
        alert("Erreur de connexion au serveur.");
        document.getElementById('eval-screen-loading').style.display = 'none';
        document.getElementById('eval-screen-oral').style.display = 'block';
    }
};

function renderOralEvaluationResults(oralData) {
    document.getElementById('eval-screen-loading').style.display = 'none';
    document.getElementById('eval-screen-results').style.display = 'block';

    const isPassed = oralData.passed;
    const finalScore = Math.round(oralData.final_score || oralData.score_oral || 0);
    const qcmScore = Math.round(oralData.qcm_score || 0);
    const oralScore = Math.round(oralData.score_oral || 0);

    const circleEl = document.getElementById('eval-result-circle');
    if (circleEl) circleEl.className = isPassed ? 'score-circle-passed' : 'score-circle-failed';

    const percentEl = document.getElementById('eval-result-score-percent');
    if (percentEl) percentEl.innerText = `${finalScore}%`;

    const fracEl = document.getElementById('eval-result-score-fraction');
    if (fracEl) fracEl.innerText = `${finalScore}/100`;

    const badgeEl = document.getElementById('eval-result-badge');
    if (badgeEl) {
        badgeEl.innerText = isPassed ? 'Certifié SGCI / Validé' : 'Non validé (Seuil 70%)';
        badgeEl.style.background = isPassed ? '#f1f5f9' : '#fee2e2';
        badgeEl.style.color = isPassed ? '#000000' : '#b91c1c';
    }

    const headingEl = document.getElementById('eval-result-heading');
    if (headingEl) {
        headingEl.innerText = isPassed ? 'Félicitations ! Formation certifiée SGCI' : 'Objectif non atteint (Seuil de validation: 70%)';
    }

    const subtextEl = document.getElementById('eval-result-subtext');
    if (subtextEl) {
        subtextEl.innerText = isPassed
            ? 'Vous avez validé avec succès les composantes écrite et orale de ce parcours bancaire.'
            : 'Votre note combinée est inférieure au seuil de 70%. Révisez vos acquis avant de repasser l\'épreuve.';
    }

    // Afficher la pondération 70% Écrit / 30% Oral
    const weightsBox = document.getElementById('eval-result-weights-breakdown');
    if (weightsBox) {
        weightsBox.style.display = 'block';
        const wQ = document.getElementById('eval-weight-qcm');
        if (wQ) wQ.innerText = `${qcmScore}%`;
        const wO = document.getElementById('eval-weight-oral');
        if (wO) wO.innerText = `${oralScore}%`;
    }

    const bilanEl = document.getElementById('eval-diagnostic-bilan');
    if (bilanEl) {
        bilanEl.innerText = oralData.feedback || "Synthèse de l'épreuve orale et écrite établie par T-chIA.";
    }

    if (currentUser && typeof loadCourses === 'function') {
        loadCourses();
    }
}

function renderEvaluationResults(evalData) {
    document.getElementById('eval-screen-loading').style.display = 'none';
    document.getElementById('eval-screen-results').style.display = 'block';

    const isPassed = evalData.passed;
    const score = evalData.score || 0;
    const total = evalData.total || 0;
    const correctCount = evalData.correct_count || 0;

    // 1. Cercle & Score
    const circleEl = document.getElementById('eval-result-circle');
    if (circleEl) circleEl.className = isPassed ? 'score-circle-passed' : 'score-circle-failed';
    
    const percentEl = document.getElementById('eval-result-score-percent');
    if (percentEl) percentEl.innerText = `${Math.round(score)}%`;
    
    const fracEl = document.getElementById('eval-result-score-fraction');
    if (fracEl) fracEl.innerText = `${correctCount}/${total}`;

    const badgeEl = document.getElementById('eval-result-badge');
    if (badgeEl) {
        badgeEl.innerText = isPassed ? 'Validé avec succès' : 'Non validé';
        badgeEl.style.background = isPassed ? '#f1f5f9' : '#fee2e2';
        badgeEl.style.color = isPassed ? '#000000' : '#b91c1c';
    }

    const headingEl = document.getElementById('eval-result-heading');
    if (headingEl) {
        headingEl.innerText = isPassed ? 'Félicitations ! Module validé' : 'Objectif non atteint (Score requis: 70%)';
    }

    const subtextEl = document.getElementById('eval-result-subtext');
    if (subtextEl) {
        subtextEl.innerText = isPassed 
            ? 'Vos acquis sont solides. Vous avez démontré une assimilation complète des notions clés.'
            : 'Ne vous découragez pas ! Consultez le diagnostic ci-dessous pour cibler vos points à consolider.';
    }

    // 2. Bilan Pédagogique IA
    const bilanEl = document.getElementById('eval-diagnostic-bilan');
    if (bilanEl) {
        bilanEl.innerText = evalData.bilan_pedagogique || "Bilan de l'évaluation établi par le Tuteur IA.";
    }

    // 3. Notions Acquises
    const acquisesContainer = document.getElementById('eval-notions-acquises-list');
    if (acquisesContainer) {
        acquisesContainer.innerHTML = '';
        const acquises = evalData.notions_acquises || [];
        if (acquises.length > 0) {
            acquises.forEach(item => {
                const row = document.createElement('div');
                row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13.5px;';
                row.innerHTML = `
                    <span style="font-weight: 700; color: #000000;">${item.concept}</span>
                    <span class="eval-concept-pill concept-acquired">Maîtrisé</span>
                `;
                acquisesContainer.appendChild(row);
            });
        } else {
            acquisesContainer.innerHTML = `<p style="color: #64748b; font-size: 13px; font-style: italic; margin: 0;">Aucune notion entièrement validée lors de cette tentative.</p>`;
        }
    }

    // 4. Notions à Renforcer
    const renforcerContainer = document.getElementById('eval-notions-renforcer-list');
    if (renforcerContainer) {
        renforcerContainer.innerHTML = '';
        const aRenforcer = evalData.notions_a_renforcer || [];
        if (aRenforcer.length > 0) {
            aRenforcer.forEach(item => {
                const row = document.createElement('div');
                row.style.cssText = 'display: flex; flex-direction: column; gap: 4px; padding: 10px 14px; background: #fff5f5; border-radius: 8px; border: 1px solid #fca5a5; font-size: 13px;';
                row.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <strong style="color: #e9041e;">${item.concept}</strong>
                        <span class="eval-concept-pill concept-review">À consolider</span>
                    </div>
                    <span style="color: #78350f; font-size: 12px; margin-top: 2px;">${item.conseil || 'Concept à approfondir'}</span>
                `;
                renforcerContainer.appendChild(row);
            });
        } else {
            renforcerContainer.innerHTML = `<p style="color: #000000; font-size: 13px; font-weight: 700; margin: 0;">Parfait ! Aucune notion fragile détectée sur cette évaluation.</p>`;
        }
    }

    // 5. Corrigé Pédagogique Détaillé
    const reviewList = document.getElementById('eval-questions-review-list');
    if (reviewList) {
        reviewList.innerHTML = '';
        const letters = ['A', 'B', 'C', 'D', 'E'];

        (evalData.results_by_question || []).forEach((res, i) => {
            const itemCard = document.createElement('div');
            itemCard.className = `eval-review-item ${res.is_correct ? 'correct' : 'incorrect'}`;

            const userAnsText = (res.user_answer !== null && res.options && res.options[res.user_answer] !== undefined)
                ? `${letters[res.user_answer] || ''}. ${res.options[res.user_answer]}`
                : 'Aucune réponse fournie';

            const correctAnsText = (res.options && res.options[res.correct_index] !== undefined)
                ? `${letters[res.correct_index] || ''}. ${res.options[res.correct_index]}`
                : 'Réponse exacte';

            itemCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 800; font-size: 14px; color: #0f172a;">Question ${i + 1}</span>
                    <span style="font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 12px; background: ${res.is_correct ? '#f1f5f9' : '#fee2e2'}; color: ${res.is_correct ? '#000000' : '#b91c1c'}; border: 1px solid ${res.is_correct ? '#cbd5e1' : '#fca5a5'};">
                        ${res.is_correct ? 'Correct (+1 pt)' : 'Incorrect (0 pt)'}
                    </span>
                </div>
                <div style="font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 12px;">
                    ${res.question}
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; font-size: 13px;">
                    <div style="padding: 8px 12px; background: ${res.is_correct ? '#f8fafc' : '#fee2e2'}; border-radius: 6px; border: 1px solid ${res.is_correct ? '#cbd5e1' : '#fecaca'};">
                        <strong style="color: ${res.is_correct ? '#000000' : '#b91c1c'};">Votre réponse :</strong><br>
                        <span style="color: #334155;">${userAnsText}</span>
                    </div>
                    <div style="padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #cbd5e1;">
                        <strong style="color: #000000;">Bonne réponse :</strong><br>
                        <span style="color: #334155;">${correctAnsText}</span>
                    </div>
                </div>
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #475569; line-height: 1.5;">
                    <strong style="color: #e9041e;">Explication pédagogique de l'IA :</strong> ${res.explication || 'Non fournie'}
                </div>
            `;
            reviewList.appendChild(itemCard);
        });
    }

    // 6. Section Renforcement
    const reinfSection = document.getElementById('eval-reinforcement-section');
    const reinfSummary = document.getElementById('eval-reinforcement-summary');
    const aRenforcer = evalData.notions_a_renforcer || [];
    if (reinfSection && reinfSummary) {
        if (aRenforcer.length > 0 && evalData.synthese_renforcement) {
            reinfSection.style.display = 'block';
            reinfSummary.innerText = evalData.synthese_renforcement;
        } else if (isPassed) {
            reinfSection.style.display = 'none';
        } else {
            reinfSection.style.display = 'block';
            reinfSummary.innerText = "Revoir l'ensemble des diapositives du cours et interroger le Tuteur IA pour dissiper vos doutes.";
        }
    }
}

window.retakeCurrentEvaluation = function() {
    if (!currentEvalQuiz) return;
    startQuizQuestions();
};

window.launchReinforcementWithAiTutor = function() {
    if (!currentCourse) return;
    const weakConcepts = (lastEvalDiagnostic && lastEvalDiagnostic.notions_a_renforcer) 
        ? lastEvalDiagnostic.notions_a_renforcer.map(n => n.concept).join(', ') 
        : '';

    // Basculer sur le mode présentation
    startPresentationMode(currentCourse.id);

    // Ouvrir le volet de questions/chat RAG
    const chatDrawer = document.getElementById('presentation-chat-drawer');
    if (chatDrawer && chatDrawer.classList.contains('chat-hidden')) {
        togglePresentationChat(true);
    }

    // Pré-remplir la question et l'envoyer au Tuteur IA
    const chatInput = document.getElementById('rag-chat-input');
    if (chatInput) {
        const questionPrompt = weakConcepts 
            ? `Bonjour Tuteur, suite à mon évaluation sur "${currentCourse.title}", je souhaite consolider les notions suivantes : ${weakConcepts}. Peux-tu m'expliquer clairement ces notions avec des exemples concrets ?`
            : `Bonjour Tuteur, peux-tu me faire un récapitulatif pédagogique des points essentiels de la formation "${currentCourse.title}" ?`;
        
        chatInput.value = questionPrompt;
        setTimeout(() => {
            if (typeof sendRagQuestion === 'function') {
                sendRagQuestion();
            }
        }, 600);
    }
};

// --- HISTORIQUE DES ÉVALUATIONS & CERTIFICATIONS ---
function formatEvaluationDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return `${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch (e) {
        return dateStr;
    }
}

function createEvaluationHistoryCard(ev) {
    const card = document.createElement('div');
    card.style.cssText = 'background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.02);';

    const isPassed = ev.passed;
    const scoreVal = Math.round(ev.score);
    const dateFormatted = formatEvaluationDate(ev.completed_at);

    card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 14px; min-width: 240px; flex: 1;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: ${isPassed ? '#f1f5f9' : '#fee2e2'}; color: ${isPassed ? '#000000' : '#b91c1c'}; font-size: 14px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 2px solid ${isPassed ? '#000000' : '#fecaca'};">
                ${scoreVal}%
            </div>
            <div>
                <h4 style="margin: 0 0 3px 0; font-size: 14.5px; color: #0f172a; font-weight: 800;">${ev.course_title || 'Formation'}</h4>
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span style="font-size: 11.5px; color: #000000; font-weight: 600;">${ev.course_domain || 'SGCI'}</span>
                    <span style="font-size: 11.5px; color: #94a3b8;">•</span>
                    <span style="font-size: 11.5px; color: #64748b;">${dateFormatted}</span>
                    <span style="font-size: 11px; font-weight: 700; padding: 1px 8px; border-radius: 10px; background: ${isPassed ? '#f1f5f9' : '#fee2e2'}; color: ${isPassed ? '#000000' : '#b91c1c'};">
                        ${isPassed ? 'Validé' : 'À consolider'}
                    </span>
                </div>
            </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
            <button type="button" onclick="viewHistoricalEvaluation(${ev.course_id}, ${ev.id})" class="action-btn-sm" style="background: #000000; color: white; border: none; padding: 7px 14px; border-radius: 6px; font-weight: 700; font-size: 12.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                Voir le bilan IA
            </button>
        </div>
    `;
    return card;
}

window.loadProfileEvaluations = async function(userId) {
    const listEl = document.getElementById('profile-evals-list');
    const countEl = document.getElementById('profile-evals-count');
    if (!listEl) return;

    listEl.innerHTML = '<div style="font-size: 12px; color: #64748b; font-style: italic;">Chargement de l\'historique...</div>';

    try {
        const res = await fetch(`http://127.0.0.1:8092/api/users/${userId}/evaluations`);
        const data = await res.json();
        if (data.success && data.evaluations && data.evaluations.length > 0) {
            if (countEl) countEl.innerText = `${data.evaluations.length} test(s)`;
            listEl.innerHTML = '';
            data.evaluations.forEach(ev => {
                const item = document.createElement('div');
                item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12.5px;';
                const isPassed = ev.passed;
                const dFormatted = formatEvaluationDate(ev.completed_at);
                item.innerHTML = `
                    <div style="min-width: 0; flex: 1; padding-right: 10px;">
                        <strong style="color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${ev.course_title}</strong>
                        <span style="font-size: 11px; color: #64748b;">${dFormatted} • Score: <b style="color: ${isPassed ? '#000000' : '#b91c1c'};">${Math.round(ev.score)}%</b></span>
                    </div>
                    <button type="button" onclick="viewHistoricalEvaluation(${ev.course_id}, ${ev.id})" class="action-btn-sm" style="background: #000000; color: white; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 4px; border: none; cursor: pointer; flex-shrink: 0;">
                        Voir bilan
                    </button>
                `;
                listEl.appendChild(item);
            });
        } else {
            if (countEl) countEl.innerText = '0 test';
            listEl.innerHTML = '<div style="font-size: 12px; color: #94a3b8; font-style: italic;">Aucune évaluation enregistrée pour le moment.</div>';
        }
    } catch (e) {
        console.error("Erreur loadProfileEvaluations:", e);
        listEl.innerHTML = '<div style="font-size: 12px; color: #ef4444;">Erreur lors du chargement des évaluations.</div>';
    }
};

window.openEvaluationsHistoryModal = async function() {
    if (!currentUser) {
        alert("Veuillez vous connecter pour consulter vos évaluations.");
        return;
    }
    const modal = document.getElementById('evaluations-history-modal');
    if (modal) modal.style.display = 'flex';

    const listEl = document.getElementById('history-modal-list');
    const emptyEl = document.getElementById('history-modal-empty');
    if (listEl) listEl.innerHTML = '<div style="text-align:center; padding: 25px; color:#64748b; font-size: 14px;">Chargement de votre historique d\'évaluations...</div>';
    if (emptyEl) emptyEl.style.display = 'none';

    try {
        const res = await fetch(`/api/users/${currentUser.id}/evaluations`);
        const data = await res.json();
        if (data.success && data.evaluations && data.evaluations.length > 0) {
            if (emptyEl) emptyEl.style.display = 'none';
            if (listEl) {
                listEl.innerHTML = '';
                data.evaluations.forEach(ev => {
                    const card = createEvaluationHistoryCard(ev);
                    listEl.appendChild(card);
                });
            }
        } else {
            if (listEl) listEl.innerHTML = '';
            if (emptyEl) emptyEl.style.display = 'block';
        }
    } catch (e) {
        console.error("Erreur openEvaluationsHistoryModal:", e);
        if (listEl) listEl.innerHTML = '<div style="color:#ef4444; text-align:center; padding: 20px;">Erreur de communication avec le serveur.</div>';
    }
};

window.closeEvaluationsHistoryModal = function() {
    const modal = document.getElementById('evaluations-history-modal');
    if (modal) modal.style.display = 'none';
};

window.viewHistoricalEvaluation = async function(courseId, evalId) {
    if (typeof closeEvaluationsHistoryModal === 'function') closeEvaluationsHistoryModal();
    if (typeof closeUserProfileModal === 'function') closeUserProfileModal();

    const course = courses.find(c => c.id == courseId);
    if (course) {
        currentCourse = course;
    }
    window.navigateTo('evaluation');

    document.getElementById('eval-screen-intro').style.display = 'none';
    document.getElementById('eval-screen-questions').style.display = 'none';
    document.getElementById('eval-screen-loading').style.display = 'block';
    document.getElementById('eval-screen-results').style.display = 'none';

    try {
        const res = await fetch(`/api/evaluations/${evalId}`);
        const data = await res.json();
        if (data.success && data.evaluation && data.evaluation.diagnostic) {
            const ev = data.evaluation;
            document.getElementById('eval-course-title').innerText = ev.course_title || (currentCourse ? currentCourse.title : 'Évaluation');
            document.getElementById('eval-course-domain').innerText = ev.course_domain || 'SGCI';

            lastEvalDiagnostic = ev.diagnostic;
            renderEvaluationResults(ev.diagnostic);
        } else {
            alert("Impossible de charger les détails de cette évaluation.");
            window.navigateTo('consultation');
        }
    } catch (e) {
        console.error("Erreur viewHistoricalEvaluation:", e);
        alert("Erreur lors de la récupération des détails.");
        window.navigateTo('consultation');
    }
};

// Ping régulier d'activité (Heartbeat en temps réel pour le pilotage RH / Direction)
setInterval(() => {
    if (currentUser && currentUser.id) {
        const activeCId = currentCourse ? currentCourse.id : null;
        fetch('/api/user/ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                course_id: activeCId,
                module_id: null
            })
        }).catch(() => {});
    }
}, 45000);

// Initialisation générale
loadCourses();
updateDashboard();
updateAssistantButtonUI();

// Vérifier si un utilisateur est déjà connecté (initialisation avec contrôle de consentement RGPD)
const savedUser = sessionStorage.getItem('ia_formation_user');
if (savedUser) {
    try {
        currentUser = JSON.parse(savedUser);
        fetch(`/api/user/consent-status?user_id=${currentUser.id}`)
            .then(r => r.json())
            .then(cData => {
                if (cData && !cData.accepted) {
                    document.getElementById('login-screen').style.display = 'none';
                    document.getElementById('disclosure-modal').style.display = 'flex';
                } else {
                    applyAuthState();
                }
            })
            .catch(() => applyAuthState());
    } catch (e) {
        console.error("Erreur parsing savedUser:", e);
    }
}

// --- GESTION DU THÈME VISUEL (BLANC, GRIS, NOIR) ---
window.setAppTheme = function(themeName) {
    const validThemes = ['blanc', 'gris', 'noir'];
    const theme = validThemes.includes(themeName) ? themeName : 'blanc';
    
    if (document.body) {
        document.body.classList.remove('theme-blanc', 'theme-gris', 'theme-noir');
        document.body.classList.add(`theme-${theme}`);
    }

    validThemes.forEach(t => {
        const btn = document.getElementById(`theme-btn-${t}`);
        if (btn) {
            if (t === theme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });

    try {
        localStorage.setItem('tchia_theme', theme);
    } catch (e) {
        console.warn("Erreur sauvegarde thème:", e);
    }
};

window.initAppTheme = function() {
    let saved = 'blanc';
    try {
        saved = localStorage.getItem('tchia_theme') || 'blanc';
    } catch (e) {
        saved = 'blanc';
    }
    window.setAppTheme(saved);
};

window.initAppTheme();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.initAppTheme());
}

