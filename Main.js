let stream = null;
let scanning = false;
let qrCode = null;
let currentData = null;

// Configuración
function showSection(sectionName) {
    // Ocultar todas las secciones
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));

    // Mostrar sección seleccionada
    document.getElementById(sectionName).classList.add('active');

    // Actualizar botones de navegación
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function saveConfig() {
    const scriptUrl = document.getElementById('scriptUrl').value;

    if (!scriptUrl) {
        showMessage('configError', 'Por favor ingresá la URL del Google Script');
        return;
    }

    localStorage.setItem('googleScriptUrl', scriptUrl);
    showMessage('configSuccess', 'Configuración guardada correctamente');
}

// Cargar configuración al inicio
window.addEventListener('load', () => {
    const savedUrl = localStorage.getItem('googleScriptUrl');
    if (savedUrl) {
        document.getElementById('scriptUrl').value = savedUrl;
    }

    // Auto-completar fecha actual
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fecha').value = today;
});

// Función para mostrar mensajes
function showMessage(elementId, message) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => {
        element.style.display = 'none';
    }, 3000);
}

// Central - Generar QR
document.getElementById('productForm').addEventListener('submit', function (e) {
    e.preventDefault();
    generateQR();
});

function generateQR() {
    const formData = {
        etiqueta: document.getElementById('etiqueta').value,
        fecha: formatDate(document.getElementById('fecha').value),
        suc: document.getElementById('suc').value,
        codAutorizacion: document.getElementById('codAutorizacion').value,
        codigo: document.getElementById('codigo').value,
        descripcion: document.getElementById('descripcion').value,
        motivo: document.getElementById('motivo').value,
        noRemito: document.getElementById('noRemito').value,
        proveedor: document.getElementById('proveedor').value
    };

    // Guardar datos para posible envío
    currentData = formData;

    // Generar QR con todos los datos
    qrCode = new QRious({
        element: document.getElementById('qrCanvas'),
        value: JSON.stringify(formData),
        size: 300,
        background: 'white',
        foreground: 'black'
    });

    // Mostrar QR
    document.getElementById('qrResult').style.display = 'block';

    // Enviar a Google Sheets
    sendDataToGoogleSheets(formData, false);

    showMessage('centralSuccess', 'Producto guardado y QR generado correctamente');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
}

function downloadQR() {
    const canvas = document.getElementById('qrCanvas');
    const link = document.createElement('a');
    link.download = `QR_${document.getElementById('codigo').value}.png`;
    link.href = canvas.toDataURL();
    link.click();
}

// Sucursal - Scanner QR
function startScanner() {
    scanning = true;
    document.getElementById('startScanner').style.display = 'none';
    document.getElementById('stopScanner').style.display = 'inline-flex';
    document.getElementById('video').style.display = 'block';

    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: 'environment' // Cámara trasera en móviles
        }
    })
        .then(function (mediaStream) {
            stream = mediaStream;
            const video = document.getElementById('video');
            video.srcObject = stream;
            video.play();

            // Comenzar a escanear
            scanQRCode();
        })
        .catch(function (err) {
            showMessage('sucursalError', 'Error al acceder a la cámara: ' + err.message);
            stopScanner();
        });
}

function stopScanner() {
    scanning = false;
    document.getElementById('startScanner').style.display = 'inline-flex';
    document.getElementById('stopScanner').style.display = 'none';
    document.getElementById('video').style.display = 'none';

    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

function processScannedData(data) {
    // Mostrar datos escaneados
    const dataDisplay = document.getElementById('dataDisplay');
    let htmlContent = '<strong>Datos del producto:</strong><br>';

    Object.keys(data).forEach(key => {
        if (data[key]) {
            htmlContent += `<strong>${key}:</strong> ${data[key]}<br>`;
        }
    });

    dataDisplay.innerHTML = htmlContent;
    document.getElementById('scannedData').style.display = 'block';

    // Enviar a Google Sheets
    sendDataToGoogleSheets(data, true);

    showMessage('sucursalSuccess', 'Datos agregados al inventario correctamente');
}

function scanQRCode() {
    if (!scanning) return;

    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

            // Verificar que jsQR esté disponible
            if (typeof jsQR === 'undefined') {
                console.error('jsQR no está cargado');
                showMessage('sucursalError', 'Error: Librería de scanner no cargada');
                stopScanner();
                return;
            }

            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
                try {
                    const data = JSON.parse(code.data);
                    processScannedData(data);
                    stopScanner();
                    return;
                } catch (e) {
                    console.error('Error parsing QR data:', e);
                    showMessage('sucursalError', 'Código QR inválido o dañado');
                }
            }
        } catch (error) {
            console.error('Error en el proceso de escaneo:', error);
        }
    }

    if (scanning) {
        requestAnimationFrame(scanQRCode);
    }
}

// Función PARA ENVIAR DATOS a Google Sheets
function sendDataToGoogleSheets(data, isNewScan = false) {
    const scriptUrl = localStorage.getItem('googleScriptUrl');

    if (!scriptUrl) {
        showMessage(isNewScan ? 'sucursalError' : 'centralError', '❌ Error: No está configurada la URL de la API. Ve a Configuración.');
        return;
    }

    const payload = {
        etiqueta: data.etiqueta || 'Sin etiqueta',
        fecha: data.fecha || new Date().toLocaleDateString('es-AR'),
        suc: data.suc || 'Sin sucursal',
        codAutorizacion: data.codAutorizacion || 'N/A',
        codigo: data.codigo || 'Sin código',
        descripcion: data.descripcion || 'Sin descripción',
        motivo: data.motivo || 'Ninguno',
        noRemito: data.noRemito || '0',
        proveedor: data.proveedor || 'Sin proveedor'
    };

    console.log("Enviando este payload:", payload);

    // Crear un formulario temporal
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = scriptUrl;
    form.target = '_blank';
    form.style.display = 'none';

    // Agregar TODOS los campos como inputs hidden individuales
    Object.keys(payload).forEach(key => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = payload[key];
        form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();

    console.log('Datos enviados mediante formulario');
    showMessage(isNewScan ? 'sucursalSuccess' : 'centralSuccess', '✅ Datos enviados correctamente.');

    // Limpiar después de enviar
    setTimeout(() => {
        document.body.removeChild(form);
    }, 1000);
}