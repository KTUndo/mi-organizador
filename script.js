// ========================================
// CONFIGURACIÓN DE SUPABASE
// ========================================
// IMPORTANTE: Reemplaza estos valores con los de tu proyecto
const SUPABASE_URL = 'https://opnqnffmwtlmrpoiguek.supabase.co/rest/v1/'
const SUPABASE_ANON_KEY = 'sb_publishable_w15prroiYtWGE6b8IEs_OA_UeyyDHNL'

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let currentUser = null

// ========================================
// AUTENTICACIÓN
// ========================================

// Verificar si hay usuario logueado al cargar la página
async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
        currentUser = session.user
        showApp()
    } else {
        showAuth()
    }
}

// Manejar login y registro
async function handleAuth(action) {
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value

    if (!email || !password) {
        alert('Omple tots els camps')
        return
    }

    try {
        if (action === 'register') {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password
            })
            if (error) throw error
            alert('Compte creat! Comprova el teu correu per confirmar.')
        } else {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            })
            if (error) throw error
            currentUser = data.user
            showApp()
        }
    } catch (error) {
        alert('Error: ' + error.message)
    }
}

// Cerrar sesión
async function logout() {
    await supabase.auth.signOut()
    currentUser = null
    showAuth()
}

// Mostrar sección de autenticación
function showAuth() {
    document.getElementById('auth-section').style.display = 'block'
    document.getElementById('main-app').style.display = 'none'
    document.getElementById('email').value = ''
    document.getElementById('password').value = ''
}

// Mostrar aplicación principal
function showApp() {
    document.getElementById('auth-section').style.display = 'none'
    document.getElementById('main-app').style.display = 'block'
    document.getElementById('user-display').textContent = currentUser.email
    loadTasks()
}

// ========================================
// GESTIÓN DE TAREAS
// ========================================

// Cargar todas las tareas del usuario
async function loadTasks() {
    try {
        const { data: tasks, error } = await supabase
            .from('Tasca')
            .select(`
                id,
                Titol,
                Completada,
                fk_tipo,
                fk_recordatori,
                Tipo (
                    Tipo
                ),
                Recordatori (
                    fecha_fin
                )
            `)
            .eq('fk_usuario', currentUser.id)
            .order('id', { ascending: false })

        if (error) throw error

        renderTasks(tasks || [])
    } catch (error) {
        console.error('Error carregant tasques:', error)
        alert('Error carregant les tasques')
    }
}

// Renderizar lista de tareas
function renderTasks(tasks) {
    const taskList = document.getElementById('task-list')
    taskList.innerHTML = ''

    if (tasks.length === 0) {
        taskList.innerHTML = '<li style="text-align:center; padding:20px; color:#999;">No hi ha tasques encara</li>'
        return
    }

    tasks.forEach(task => {
        const li = document.createElement('li')
        li.className = `task-item ${task.Completada ? 'completed' : ''}`

        const tipo = task.Tipo?.Tipo || 'general'
        const fecha = task.Recordatori?.fecha_fin ? new Date(task.Recordatori.fecha_fin).toLocaleDateString('ca-ES') : 'Sense data'

        li.innerHTML = `
            <div class="info">
                <span class="badge badge-${tipo.toLowerCase()}">${tipo}</span>
                <strong>${task.Titol}</strong>
                <small style="color:#888;">📅 ${fecha}</small>
            </div>
            <div style="display:flex;gap:8px;">
                ${!task.Completada ? `<button class="btn-done" onclick="toggleTask(${task.id}, true)">✓</button>` : ''}
                <button class="btn-del" onclick="deleteTask(${task.id})">🗑️</button>
            </div>
        `
        taskList.appendChild(li)
    })
}

// Añadir nueva tarea
async function addTask() {
    const taskName = document.getElementById('task-name').value
    const taskType = document.getElementById('task-type').value
    const taskDate = document.getElementById('task-date').value

    if (!taskName) {
        alert('Escriu un nom per la tasca')
        return
    }

    try {
        // 1. Crear el recordatorio si hay fecha
        let recordatoriId = null
        if (taskDate) {
            const { data: recordatori, error: recError } = await supabase
                .from('Recordatori')
                .insert({
                    fecha_inicio: taskDate,
                    fecha_fin: taskDate
                })
                .select()
                .single()

            if (recError) throw recError
            recordatoriId = recordatori.id
        }

        // 2. Obtener el ID del tipo
        const { data: tipos, error: tipoError } = await supabase
            .from('Tipo')
            .select('id, Tipo')
            .ilike('Tipo', taskType)
            .single()

        if (tipoError) throw tipoError

        // 3. Crear la tarea
        const { error: taskError } = await supabase
            .from('Tasca')
            .insert({
                Titol: taskName,
                Completada: false,
                fk_usuario: currentUser.id,
                fk_tipo: tipos.id,
                fk_recordatori: recordatoriId
            })

        if (taskError) throw taskError

        // Limpiar formulario y recargar
        document.getElementById('task-name').value = ''
        document.getElementById('task-date').value = ''
        loadTasks()

    } catch (error) {
        console.error('Error afegint tasca:', error)
        alert('Error afegint la tasca: ' + error.message)
    }
}

// Marcar tarea como completada
async function toggleTask(taskId, completed) {
    try {
        const { error } = await supabase
            .from('Tasca')
            .update({ Completada: completed })
            .eq('id', taskId)

        if (error) throw error
        loadTasks()
    } catch (error) {
        console.error('Error actualitzant tasca:', error)
    }
}

// Eliminar tarea
async function deleteTask(taskId) {
    if (!confirm('Segur que vols eliminar aquesta tasca?')) return

    try {
        const { error } = await supabase
            .from('Tasca')
            .delete()
            .eq('id', taskId)

        if (error) throw error
        loadTasks()
    } catch (error) {
        console.error('Error eliminant tasca:', error)
    }
}

// ========================================
// INICIALIZACIÓN
// ========================================

// Verificar usuario al cargar la página
checkUser()
