
        // ==================== JSON DATA LOADER ====================
        const DataLoader = {
            loadJSON: async (filename) => {
                try {
                    const response = await fetch(`./data/${filename}`);
                    if (!response.ok) {
                        console.warn(`Could not load ${filename} from /data folder`);
                        return null;
                    }
                    return await response.json();
                } catch (error) {
                    console.error(`Error loading ${filename}:`, error);
                    return null;
                }
            },

            initializeData: async () => {
                try {
                    // Load students from JSON
                    const studentsData = await DataLoader.loadJSON('students.json');
                    if (studentsData && Array.isArray(studentsData)) {
                        Storage.set('students', studentsData);
                        console.log('Students loaded from students.json');
                    }

                    // Load tests from JSON
                    const testsData = await DataLoader.loadJSON('tests.json');
                    if (testsData && Array.isArray(testsData)) {
                        Storage.set('tests', testsData);
                        console.log('Tests loaded from tests.json');
                    }

                    // Load admin password from JSON
                    const adminData = await DataLoader.loadJSON('admin.json');
                    if (adminData && adminData.password) {
                        Storage.set('adminPassword', adminData.password);
                        console.log('Admin password loaded from admin.json');
                    }

                    // Load test results from JSON (if exists)
                    const resultsData = await DataLoader.loadJSON('results.json');
                    if (resultsData && Array.isArray(resultsData)) {
                        Storage.set('testResults', resultsData);
                        console.log('Results loaded from results.json');
                    }

                    console.log('Data initialization complete');
                } catch (error) {
                    console.error('Error during data initialization:', error);
                }
            }
        };

        // ==================== DATA STORAGE MANAGER ====================
        const Storage = {
            get: (key) => {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : null;
            },
            set: (key, value) => {
                localStorage.setItem(key, JSON.stringify(value));
            },
            remove: (key) => {
                localStorage.removeItem(key);
            }
        };

        // ==================== DATA MODELS ====================
        const DB = {
            admin: {
                getPassword: () => Storage.get('adminPassword') || null,
                setPassword: (password) => Storage.set('adminPassword', password)
            },
            students: {
                getAll: () => Storage.get('students') || [],
                add: (student) => {
                    const students = DB.students.getAll();
                    students.push(student);
                    Storage.set('students', students);
                },
                update: (code, updatedStudent) => {
                    const students = DB.students.getAll();
                    const index = students.findIndex(s => s.code === code);
                    if (index !== -1) {
                        students[index] = { ...students[index], ...updatedStudent };
                        Storage.set('students', students);
                    }
                },
                delete: (code) => {
                    let students = DB.students.getAll();
                    students = students.filter(s => s.code !== code);
                    Storage.set('students', students);
                },
                findByCode: (code) => {
                    const students = DB.students.getAll();
                    return students.find(s => s.code === code);
                },
                generateCode: () => {
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                    let code;
                    let exists;
                    do {
                        code = '';
                        for (let i = 0; i < 6; i++) {
                            code += chars.charAt(Math.floor(Math.random() * chars.length));
                        }
                        exists = DB.students.findByCode(code);
                    } while (exists);
                    return code;
                }
            },
            tests: {
                getAll: () => Storage.get('tests') || [],
                add: (test) => {
                    const tests = DB.tests.getAll();
                    test.id = Date.now().toString();
                    tests.push(test);
                    Storage.set('tests', tests);
                    return test.id;
                },
                update: (id, updatedTest) => {
                    const tests = DB.tests.getAll();
                    const index = tests.findIndex(t => t.id === id);
                    if (index !== -1) {
                        tests[index] = { ...tests[index], ...updatedTest };
                        Storage.set('tests', tests);
                    }
                },
                delete: (id) => {
                    let tests = DB.tests.getAll();
                    tests = tests.filter(t => t.id !== id);
                    Storage.set('tests', tests);
                    // Also delete all results for this test
                    const results = DB.results.getAll();
                    const filteredResults = results.filter(r => r.testId !== id);
                    Storage.set('testResults', filteredResults);
                },
                findById: (id) => {
                    const tests = DB.tests.getAll();
                    return tests.find(t => t.id === id);
                }
            },
            results: {
                getAll: () => Storage.get('testResults') || [],
                add: (result) => {
                    const results = DB.results.getAll();
                    results.push(result);
                    Storage.set('testResults', results);
                },
                hasAttempted: (studentCode, testId) => {
                    const results = DB.results.getAll();
                    return results.some(r => r.studentCode === studentCode && r.testId === testId);
                },
                getResult: (studentCode, testId) => {
                    const results = DB.results.getAll();
                    return results.find(r => r.studentCode === studentCode && r.testId === testId);
                }
            }
        };

        // ==================== CURRENT STATE ====================
        const State = {
            currentUser: null,
            currentUserType: null,
            currentTest: null,
            testStartTime: null,
            timerInterval: null,
            userAnswers: {}
        };

        // ==================== UI MANAGER ====================
        const UI = {
            render: (html) => {
                document.getElementById('mainContent').innerHTML = html;
            },
            setHeader: (title, subtitle = '') => {
                document.getElementById('headerTitle').textContent = title;
                document.getElementById('headerSubtitle').textContent = subtitle;
            },
            showAlert: (message, type = 'danger') => {
                const alertDiv = document.createElement('div');
                alertDiv.className = `alert alert-${type}`;
                alertDiv.textContent = message;
                document.getElementById('mainContent').insertAdjacentElement('afterbegin', alertDiv);
                setTimeout(() => alertDiv.remove(), 5000);
            }
        };

        // ==================== NAVIGATION MANAGER ====================
        const Nav = {
            showLoginPage: () => {
                // Prevent back navigation after logout
                history.pushState(null, null, location.href);
                window.onpopstate = () => {
                    history.go(1);
                };

                UI.setHeader('Welcome To Blacksiege STMS Portal', 'Please login to continue');
                UI.render(`
                    <div class="login-container">
                        <div class="login-selector">
                            <button class="btn active" onclick="Nav.switchLogin('admin')">Admin Login</button>
                            <button class="btn" onclick="Nav.switchLogin('student')">Student Login</button>
                        </div>
                        <div id="loginForm">
                            ${Nav.getAdminLoginForm()}
                        </div>
                    </div>
                `);
            },
            switchLogin: (type) => {
                const buttons = document.querySelectorAll('.login-selector button');
                buttons.forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
                
                const form = type === 'admin' ? Nav.getAdminLoginForm() : Nav.getStudentLoginForm();
                document.getElementById('loginForm').innerHTML = form;
            },
            getAdminLoginForm: () => `
                <div class="card">
                    <h3>Admin Login</h3>
                    <form onsubmit="Auth.adminLogin(event)">
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" id="adminPassword" required placeholder="Enter admin password">
                        </div>
                        <button type="submit" class="btn btn-primary btn-full">Login</button>
                    </form>
                </div>
            `,
            getStudentLoginForm: () => `
                <div class="card">
                    <h3>Student Login</h3>
                    <form onsubmit="Auth.studentLogin(event)">
                        <div class="form-group">
                            <label>Student Code</label>
                            <input type="text" id="studentCode" required placeholder="Enter 6-character code" maxlength="6" style="text-transform: uppercase;">
                        </div>
                        <button type="submit" class="btn btn-primary btn-full">Login</button>
                    </form>
                </div>
            `,
            showAdminDashboard: () => {
                // Prevent back navigation
                history.pushState(null, null, location.href);
                
                UI.setHeader('Admin Dashboard', 'Manage students and tests');
                UI.render(`
                    <div class="admin-nav">
                        <button class="btn btn-secondary" onclick="Nav.showAdminSection('password')">Change Password</button>
                        <button class="btn btn-secondary" onclick="Nav.showAdminSection('students')">Manage Students</button>
                        <button class="btn btn-secondary" onclick="Nav.showAdminSection('tests')">Manage Tests</button>
                        <button class="btn btn-success" onclick="Admin.exportData()">📥 Export Data</button>
                        <button class="btn btn-success" onclick="document.getElementById('importFile').click()">📤 Import Data</button>
                        <button class="btn btn-danger logout-btn" onclick="Auth.logout()">Logout</button>
                    </div>
                    <input type="file" id="importFile" accept=".json" style="display: none;" onchange="Admin.importData(event)">
                    <div id="adminSection">
                        ${Admin.getPasswordSection()}
                    </div>
                `);
            },
            showAdminSection: (section) => {
                let content = '';
                if (section === 'password') content = Admin.getPasswordSection();
                else if (section === 'students') content = Admin.getStudentsSection();
                else if (section === 'tests') content = Admin.getTestsSection();
                
                document.getElementById('adminSection').innerHTML = content;
            },
            showStudentDashboard: () => {
                // Prevent back navigation
                history.pushState(null, null, location.href);
                
                const student = State.currentUser;
                UI.setHeader('Student Dashboard', `Welcome, ${student.name}!`);
                
                const tests = DB.tests.getAll();
                const availableTests = tests.filter(test => 
                    !DB.results.hasAttempted(student.code, test.id)
                );
                const completedTests = tests.filter(test => 
                    DB.results.hasAttempted(student.code, test.id)
                );

                UI.render(`
                    <div style="margin-bottom: 20px;">
                        <button class="btn btn-danger" onclick="Auth.logout()">Logout</button>
                    </div>
                    
                    ${availableTests.length > 0 ? `
                        <div class="card">
                            <h3>Available Tests</h3>
                            ${availableTests.map(test => `
                                <div class="test-item">
                                    <div class="test-info">
                                        <strong>${test.title}</strong>
                                        <div style="margin-top: 5px; font-size: 14px; color: #6c757d;">
                                            ${test.questions.length} Questions • ${test.timeLimit} Minutes • Pass: ${test.passingPercentage}%
                                        </div>
                                    </div>
                                    <button class="btn btn-primary" onclick="Student.viewTest('${test.id}')">Start</button>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<div class="card"><p>No tests available at the moment.</p></div>'}

                    ${completedTests.length > 0 ? `
                        <div class="card">
                            <h3>Completed Tests</h3>
                            ${completedTests.map(test => {
                                const result = DB.results.getResult(student.code, test.id);
                                return `
                                    <div class="test-item">
                                        <div class="test-info">
                                            <strong>${test.title}</strong>
                                            <div style="margin-top: 5px; font-size: 14px; color: #6c757d;">
                                                Score: ${result.percentage}% • ${result.passed ? '<span style="color: #28a745;">PASSED</span>' : '<span style="color: #dc3545;">FAILED</span>'}
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : ''}
                `);
            }
        };

        // ==================== AUTHENTICATION ====================
        const Auth = {
            adminLogin: (e) => {
                e.preventDefault();
                const password = document.getElementById('adminPassword').value;
                const savedPassword = DB.admin.getPassword();

                if (!savedPassword) {
                    // First time setup
                    DB.admin.setPassword(password);
                    State.currentUser = { type: 'admin' };
                    State.currentUserType = 'admin';
                    Nav.showAdminDashboard();
                } else if (savedPassword === password) {
                    State.currentUser = { type: 'admin' };
                    State.currentUserType = 'admin';
                    Nav.showAdminDashboard();
                } else {
                    UI.showAlert('Invalid password!');
                }
            },
            studentLogin: (e) => {
                e.preventDefault();
                const code = document.getElementById('studentCode').value.toUpperCase();
                const student = DB.students.findByCode(code);

                if (!student) {
                    UI.showAlert('Invalid student code!');
                    return;
                }

                State.currentUser = student;
                State.currentUserType = 'student';
                Nav.showStudentDashboard();
            },
            logout: () => {
                // Clear test state if any
                if (State.timerInterval) {
                    clearInterval(State.timerInterval);
                }
                
                State.currentUser = null;
                State.currentUserType = null;
                State.currentTest = null;
                State.testStartTime = null;
                State.timerInterval = null;
                State.userAnswers = {};
                
                Nav.showLoginPage();
            }
        };

        // ==================== ADMIN FUNCTIONS ====================
        const Admin = {
            getPasswordSection: () => `
                <div class="card">
                    <h3>Change Admin Password</h3>
                    <form onsubmit="Admin.changePassword(event)">
                        <div class="form-group">
                            <label>New Password</label>
                            <input type="password" id="newPassword" required>
                        </div>
                        <div class="form-group">
                            <label>Confirm Password</label>
                            <input type="password" id="confirmPassword" required>
                        </div>
                        <button type="submit" class="btn btn-primary">Update Password</button>
                    </form>
                </div>
            `,
            changePassword: (e) => {
                e.preventDefault();
                const newPass = document.getElementById('newPassword').value;
                const confirmPass = document.getElementById('confirmPassword').value;

                if (newPass !== confirmPass) {
                    UI.showAlert('Passwords do not match!');
                    return;
                }

                DB.admin.setPassword(newPass);
                UI.showAlert('Password updated successfully!', 'success');
                e.target.reset();
            },
            getStudentsSection: () => {
                const students = DB.students.getAll();
                return `
                    <div class="card">
                        <h3>Add New Student</h3>
                        <form onsubmit="Admin.addStudent(event)">
                            <div class="form-group">
                                <label>Student Name</label>
                                <input type="text" id="studentName" required>
                            </div>
                            <button type="submit" class="btn btn-primary">Add Student</button>
                        </form>
                    </div>

                    <div class="card">
                        <h3>All Students (${students.length})</h3>
                        ${students.length === 0 ? '<p>No students added yet.</p>' : students.map(student => `
                            <div class="student-item">
                                <div class="student-info">
                                    <strong>${student.name}</strong>
                                    <span class="student-code">${student.code}</span>
                                </div>
                                <div class="actions">
                                    <button class="btn btn-danger" onclick="Admin.deleteStudent('${student.code}')">Delete</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            },
            addStudent: (e) => {
                e.preventDefault();
                const name = document.getElementById('studentName').value;
                const code = DB.students.generateCode();

                DB.students.add({ name, code });
                UI.showAlert(`Student added! Code: ${code}`, 'success');
                Nav.showAdminSection('students');
            },
            deleteStudent: (code) => {
                if (confirm('Are you sure you want to delete this student?')) {
                    DB.students.delete(code);
                    Nav.showAdminSection('students');
                }
            },
            getTestsSection: () => {
                const tests = DB.tests.getAll();
                return `
                    <div class="card">
                        <button class="btn btn-primary" onclick="Admin.showTestModal()">Create New Test</button>
                    </div>

                    <div class="card">
                        <h3>All Tests (${tests.length})</h3>
                        ${tests.length === 0 ? '<p>No tests created yet.</p>' : tests.map(test => `
                            <div class="test-item">
                                <div class="test-info">
                                    <strong>${test.title}</strong>
                                    <div style="margin-top: 5px; font-size: 14px; color: #6c757d;">
                                        ${test.questions.length} Questions • ${test.timeLimit} min • Pass: ${test.passingPercentage}%
                                    </div>
                                </div>
                                <div class="actions">
                                    <button class="btn btn-secondary" onclick="Admin.viewTest('${test.id}')">View</button>
                                    <button class="btn btn-danger" onclick="Admin.deleteTest('${test.id}')">Delete</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            },
            showTestModal: (testId = null) => {
                const test = testId ? DB.tests.findById(testId) : null;
                const modalHtml = `
                    <div class="modal" id="testModal">
                        <div class="modal-content">
                            <h3>${test ? 'Edit Test' : 'Create New Test'}</h3>
                            <form onsubmit="Admin.saveTest(event, ${test ? `'${test.id}'` : 'null'})">
                                <div class="form-group">
                                    <label>Test Title</label>
                                    <input type="text" id="testTitle" required value="${test ? test.title : ''}">
                                </div>
                                <div class="form-group">
                                    <label>Instructions</label>
                                    <textarea id="testInstructions" rows="3" required>${test ? test.instructions : ''}</textarea>
                                </div>
                                <div class="form-group">
                                    <label>Time Limit (minutes)</label>
                                    <input type="number" id="testTimeLimit" required min="1" value="${test ? test.timeLimit : '30'}">
                                </div>
                                <div class="form-group">
                                    <label>Passing Percentage (%)</label>
                                    <input type="number" id="testPassingPercentage" required min="1" max="100" value="${test ? test.passingPercentage : '60'}">
                                </div>
                                <div id="questionsContainer"></div>
                                <button type="button" class="btn btn-secondary" onclick="Admin.addQuestionField()">Add Question</button>
                                <div style="margin-top: 20px; display: flex; gap: 10px;">
                                    <button type="submit" class="btn btn-primary">Save Test</button>
                                    <button type="button" class="btn btn-secondary" onclick="Admin.closeTestModal()">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                `;
                
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                
                // Load existing questions if editing
                if (test && test.questions) {
                    test.questions.forEach((q, index) => {
                        Admin.addQuestionField(q, index);
                    });
                } else {
                    Admin.addQuestionField();
                }
            },
            addQuestionField: (question = null, index = null) => {
                const container = document.getElementById('questionsContainer');
                const qIndex = index !== null ? index : container.children.length;
                
                const questionHtml = `
                    <div class="question-builder" data-question-index="${qIndex}">
                        <h4>Question ${qIndex + 1}</h4>
                        <div class="form-group">
                            <label>Question Text</label>
                            <input type="text" class="question-text" required value="${question ? question.text : ''}">
                        </div>
                        <div class="options-container">
                            ${question && question.options ? question.options.map((opt, i) => `
                                <div class="option-input">
                                    <input type="text" class="option-text" required value="${opt}" placeholder="Option ${i + 1}">
                                    <input type="radio" name="correct-${qIndex}" value="${i}" ${question.correctAnswer === i ? 'checked' : ''}>
                                    <label>Correct</label>
                                    ${i >= 3 ? `<button type="button" class="btn btn-danger" style="padding: 5px 10px;" onclick="this.parentElement.remove()">×</button>` : ''}
                                </div>
                            `).join('') : `
                                <div class="option-input">
                                    <input type="text" class="option-text" required placeholder="Option 1">
                                    <input type="radio" name="correct-${qIndex}" value="0" checked>
                                    <label>Correct</label>
                                </div>
                                <div class="option-input">
                                    <input type="text" class="option-text" required placeholder="Option 2">
                                    <input type="radio" name="correct-${qIndex}" value="1">
                                    <label>Correct</label>
                                </div>
                                <div class="option-input">
                                    <input type="text" class="option-text" required placeholder="Option 3">
                                    <input type="radio" name="correct-${qIndex}" value="2">
                                    <label>Correct</label>
                                </div>
                            `}
                        </div>
                        <button type="button" class="btn btn-secondary" style="margin-top: 10px;" onclick="Admin.addOptionField(${qIndex})">Add Option</button>
                        ${qIndex > 0 ? `<button type="button" class="btn btn-danger" style="margin-top: 10px; margin-left: 10px;" onclick="this.parentElement.remove()">Remove Question</button>` : ''}
                    </div>
                `;
                
                container.insertAdjacentHTML('beforeend', questionHtml);
            },
            addOptionField: (qIndex) => {
                const questionDiv = document.querySelector(`[data-question-index="${qIndex}"]`);
                const optionsContainer = questionDiv.querySelector('.options-container');
                const optionCount = optionsContainer.children.length;
                
                if (optionCount >= 6) {
                    alert('Maximum 6 options allowed per question');
                    return;
                }
                
                const optionHtml = `
                    <div class="option-input">
                        <input type="text" class="option-text" required placeholder="Option ${optionCount + 1}">
                        <input type="radio" name="correct-${qIndex}" value="${optionCount}">
                        <label>Correct</label>
                        <button type="button" class="btn btn-danger" style="padding: 5px 10px;" onclick="this.parentElement.remove()">×</button>
                    </div>
                `;
                
                optionsContainer.insertAdjacentHTML('beforeend', optionHtml);
            },
            saveTest: (e, testId) => {
                e.preventDefault();
                
                const title = document.getElementById('testTitle').value;
                const instructions = document.getElementById('testInstructions').value;
                const timeLimit = parseInt(document.getElementById('testTimeLimit').value);
                const passingPercentage = parseInt(document.getElementById('testPassingPercentage').value);
                
                const questionDivs = document.querySelectorAll('.question-builder');
                const questions = [];
                
                questionDivs.forEach((qDiv, index) => {
                    const text = qDiv.querySelector('.question-text').value;
                    const optionInputs = qDiv.querySelectorAll('.option-text');
                    const options = Array.from(optionInputs).map(input => input.value);
                    const correctRadio = qDiv.querySelector(`input[name="correct-${index}"]:checked`);
                    const correctAnswer = correctRadio ? parseInt(correctRadio.value) : 0;
                    
                    questions.push({ text, options, correctAnswer });
                });
                
                if (questions.length === 0) {
                    alert('Please add at least one question');
                    return;
                }
                
                const test = { title, instructions, timeLimit, passingPercentage, questions };
                
                if (testId) {
                    DB.tests.update(testId, test);
                } else {
                    DB.tests.add(test);
                }
                
                Admin.closeTestModal();
                Nav.showAdminSection('tests');
                UI.showAlert('Test saved successfully!', 'success');
            },
            closeTestModal: () => {
                const modal = document.getElementById('testModal');
                if (modal) modal.remove();
            },
            viewTest: (testId) => {
                const test = DB.tests.findById(testId);
                if (!test) return;
                
                const modalHtml = `
                    <div class="modal" id="viewTestModal">
                        <div class="modal-content">
                            <h3>${test.title}</h3>
                            <p><strong>Instructions:</strong> ${test.instructions}</p>
                            <p><strong>Time Limit:</strong> ${test.timeLimit} minutes</p>
                            <p><strong>Passing Percentage:</strong> ${test.passingPercentage}%</p>
                            <h4>Questions (${test.questions.length}):</h4>
                            ${test.questions.map((q, i) => `
                                <div style="margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                                    <p><strong>Q${i + 1}:</strong> ${q.text}</p>
                                    <ul style="margin: 10px 0; padding-left: 20px;">
                                        ${q.options.map((opt, j) => `
                                            <li style="${j === q.correctAnswer ? 'color: #28a745; font-weight: bold;' : ''}">${opt} ${j === q.correctAnswer ? '✓' : ''}</li>
                                        `).join('')}
                                    </ul>
                                </div>
                            `).join('')}
                            <button class="btn btn-secondary" onclick="document.getElementById('viewTestModal').remove()">Close</button>
                        </div>
                    </div>
                `;
                
                document.body.insertAdjacentHTML('beforeend', modalHtml);
            },
            deleteTest: (testId) => {
                if (confirm('Are you sure you want to delete this test? All student results will also be deleted.')) {
                    DB.tests.delete(testId);
                    Nav.showAdminSection('tests');
                }
            },
            exportData: () => {
                const data = {
                    adminPassword: localStorage.getItem('adminPassword'),
                    students: localStorage.getItem('students'),
                    tests: localStorage.getItem('tests'),
                    testResults: localStorage.getItem('testResults'),
                    exportDate: new Date().toISOString(),
                    version: '1.0'
                };
                
                const jsonStr = JSON.stringify(data, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `test-system-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                UI.showAlert('Data exported successfully! Check your downloads folder.', 'success');
            },
            importData: (event) => {
                const file = event.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        
                        // Validate data structure
                        if (!data.adminPassword && !data.students && !data.tests) {
                            throw new Error('Invalid backup file format');
                        }
                        
                        // Confirm before overwriting
                        if (!confirm('⚠️ WARNING: This will REPLACE all current data!\n\nAre you sure you want to import this backup?\n\nCurrent data will be permanently lost!')) {
                            event.target.value = '';
                            return;
                        }
                        
                        // Import data
                        if (data.adminPassword) localStorage.setItem('adminPassword', data.adminPassword);
                        if (data.students) localStorage.setItem('students', data.students);
                        if (data.tests) localStorage.setItem('tests', data.tests);
                        if (data.testResults) localStorage.setItem('testResults', data.testResults);
                        
                        UI.showAlert('Data imported successfully! Reloading...', 'success');
                        setTimeout(() => location.reload(), 1500);
                        
                    } catch (error) {
                        UI.showAlert('Error importing data: ' + error.message);
                        console.error('Import error:', error);
                    }
                    
                    // Reset file input
                    event.target.value = '';
                };
                reader.readAsText(file);
            }
        };

        // ==================== STUDENT FUNCTIONS ====================
        const Student = {
            viewTest: (testId) => {
                const test = DB.tests.findById(testId);
                if (!test) return;
                
                // Check if already attempted
                if (DB.results.hasAttempted(State.currentUser.code, testId)) {
                    UI.showAlert('You have already attempted this test!');
                    return;
                }
                
                State.currentTest = test;
                
                UI.setHeader(test.title, '');
                UI.render(`
                    <div class="test-instructions">
                        <h3>Test Instructions</h3>
                        <p>${test.instructions}</p>
                        <div class="test-meta">
                            <div>⏱️ Time Limit: ${test.timeLimit} minutes</div>
                            <div>📝 Questions: ${test.questions.length}</div>
                            <div>✅ Passing: ${test.passingPercentage}%</div>
                        </div>
                    </div>
                    <div style="text-align: center; margin-top: 30px;">
                        <button class="btn btn-primary" onclick="Student.startTest()" style="font-size: 18px; padding: 15px 40px;">Start Test</button>
                        <button class="btn btn-secondary" onclick="Nav.showStudentDashboard()" style="font-size: 18px; padding: 15px 40px; margin-left: 15px;">Back</button>
                    </div>
                `);
            },
            startTest: () => {
                // Prevent navigation during test
                window.onpopstate = (e) => {
                    e.preventDefault();
                    if (confirm('Are you sure you want to leave the test? Your progress will be lost.')) {
                        Student.submitTest(true);
                    } else {
                        history.pushState(null, null, location.href);
                    }
                };
                history.pushState(null, null, location.href);
                
                const test = State.currentTest;
                State.testStartTime = Date.now();
                State.userAnswers = {};
                
                // Start timer
                Student.startTimer(test.timeLimit);
                
                // Render questions
                UI.render(`
                    <div style="margin-bottom: 100px;">
                        ${test.questions.map((q, index) => `
                            <div class="test-question">
                                <div class="question-text">Question ${index + 1}: ${q.text}</div>
                                <div class="options">
                                    ${q.options.map((opt, optIndex) => `
                                        <label class="option">
                                            <input type="radio" name="q${index}" value="${optIndex}" onchange="Student.saveAnswer(${index}, ${optIndex})">
                                            ${opt}
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="text-align: center; padding: 20px; position: fixed; bottom: 0; left: 0; right: 0; background: white; box-shadow: 0 -2px 10px rgba(0,0,0,0.1);">
                        <button class="btn btn-primary" onclick="Student.submitTest()" style="font-size: 18px; padding: 15px 40px;">Submit Test</button>
                    </div>
                `);
            },
            startTimer: (minutes) => {
                const endTime = Date.now() + (minutes * 60 * 1000);
                
                const timerDiv = document.createElement('div');
                timerDiv.id = 'testTimer';
                timerDiv.className = 'timer';
                document.body.appendChild(timerDiv);
                
                State.timerInterval = setInterval(() => {
                    const remaining = endTime - Date.now();
                    
                    if (remaining <= 0) {
                        clearInterval(State.timerInterval);
                        Student.submitTest(true);
                        return;
                    }
                    
                    const mins = Math.floor(remaining / 60000);
                    const secs = Math.floor((remaining % 60000) / 1000);
                    
                    timerDiv.textContent = `⏱️ ${mins}:${secs.toString().padStart(2, '0')}`;
                    
                    if (remaining < 60000) {
                        timerDiv.classList.add('warning');
                    }
                }, 1000);
            },
            saveAnswer: (questionIndex, answerIndex) => {
                State.userAnswers[questionIndex] = answerIndex;
            },
            submitTest: (timeUp = false) => {
                if (!timeUp && !confirm('Are you sure you want to submit the test?')) {
                    return;
                }
                
                // Clear timer
                if (State.timerInterval) {
                    clearInterval(State.timerInterval);
                    const timerDiv = document.getElementById('testTimer');
                    if (timerDiv) timerDiv.remove();
                }
                
                // Calculate results
                const test = State.currentTest;
                let correct = 0;
                let incorrect = 0;
                
                test.questions.forEach((q, index) => {
                    const userAnswer = State.userAnswers[index];
                    if (userAnswer !== undefined && userAnswer === q.correctAnswer) {
                        correct++;
                    } else {
                        incorrect++;
                    }
                });
                
                const total = test.questions.length;
                const unanswered = total - correct - incorrect;
                const percentage = Math.round((correct / total) * 100);
                const passed = percentage >= test.passingPercentage;
                
                // Save result
                DB.results.add({
                    studentCode: State.currentUser.code,
                    testId: test.id,
                    correct,
                    incorrect,
                    unanswered,
                    percentage,
                    passed,
                    timestamp: new Date().toISOString()
                });
                
                // Show result
                Student.showResult(test, correct, incorrect, unanswered, percentage, passed);
            },
            showResult: (test, correct, incorrect, unanswered, percentage, passed) => {
                // Prevent back navigation
                history.pushState(null, null, location.href);
                window.onpopstate = () => {
                    history.go(1);
                };
                
                UI.setHeader('Test Result',  State.currentUser.name.toString());// Here is result
                UI.render(`
                    <div class="result-container ${passed ? 'pass' : 'fail'}">
                        <h2>${passed ? '🎉 Congratulations! You Passed!' : '😔 Sorry! You Failed'}</h2>
                        <div class="result-stats">
                            <div class="stat-box">
                                <h3 style="color: #28a745;">${correct}</h3>
                                <p>Correct</p>
                            </div>
                            <div class="stat-box">
                                <h3 style="color: #dc3545;">${incorrect}</h3>
                                <p>Incorrect</p>
                            </div>
                            <div class="stat-box">
                                <h3 style="color: #6c757d;">${unanswered}</h3>
                                <p>Unanswered</p>
                            </div>
                            <div class="stat-box">
                                <h3 style="color: #667eea;">${percentage}%</h3>
                                <p>Score</p>
                            </div>
                        </div>
                        <div style="margin-top: 30px;">
                            <p style="font-size: 18px; color: #6c757d; margin-bottom: 20px;">
                                Required: ${test.passingPercentage}% • Your Score: ${percentage}%
                            </p>
                            <button class="btn btn-primary" onclick="Auth.logout()" style="font-size: 18px; padding: 15px 40px;">Go to Login</button>
                        </div>
                    </div>
                `);
            }
        };

        // ==================== INITIALIZE APPLICATION ====================
        window.onload = async () => {
            // Load data from JSON files first
            await DataLoader.initializeData();
            // Then show login page
            Nav.showLoginPage();
        };

        // Prevent accidental page refresh during test
        window.addEventListener('beforeunload', (e) => {
            if (State.currentTest && State.testStartTime) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    