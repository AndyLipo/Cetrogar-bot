let stream = null;
let scanning = false;
let qrCode = null;
let currentData = null;

// Verificar que todos los elementos necesarios existan
window.addEventListener('load', () => {
    console.log('Verificando elementos...');

    const requiredElements = [
        'qrCanvas', 'qrResult', 'productForm', 'video', 'canvas',
        'etiqueta', 'fecha', 'suc', 'codigo', 'descripcion', 'noRemito'
    ];

    requiredElements.forEach(id => {
        if (!document.getElementById(id)) {
            console.error('Elemento no encontrado:', id);
        }
    });

    // Cargar configuración
    const savedUrl = localStorage.getItem('googleScriptUrl');
    if (savedUrl) {
        document.getElementById('scriptUrl').value = savedUrl;
    }

    // Auto-completar fecha actual
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fecha').value = today;
});

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

// Función para mostrar mensajes
function showMessage(elementId, message) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error('Elemento de mensaje no encontrado:', elementId);
        return;
    }

    element.textContent = message;
    element.style.display = 'block';

    // Ocultar otros mensajes
    const allMessages = document.querySelectorAll('.success-message, .error-message');
    allMessages.forEach(msg => {
        if (msg.id !== elementId) {
            msg.style.display = 'none';
        }
    });

    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

// Central - Generar QR
document.getElementById('productForm').addEventListener('submit', function (e) {
    e.preventDefault();
    generateQR();
});

function generateQR() {
    // Verificar que el canvas del QR existe
    const qrCanvas = document.getElementById('qrCanvas');
    const qrResult = document.getElementById('qrResult');

    if (!qrCanvas || !qrResult) {
        console.error('Elementos del QR no encontrados');
        showMessage('centralError', 'Error: Elementos de QR no configurados');
        return;
    }

    const formData = {
        etiqueta: document.getElementById('etiqueta').value,
        fecha: formatDate(document.getElementById('fecha').value),
        suc: document.getElementById('suc').value,
        codAutorizacion: document.getElementById('codAutorizacion').value,
        codigo: document.getElementById('codigo').value,
        descripcion: document.getElementById('descripcion').value,
        motivo: document.getElementById('motivo').value,
        noRemito: document.getElementById('noRemito').value,
        condicion: document.getElementById('condicion').value,
        comentarios: document.getElementById('comentarios').value,
        control: document.getElementById('control').value,
        cantidad: document.getElementById('cantidad').value,
        familia: document.getElementById('familia').value,
        falla: document.getElementById('falla').value,
        proveedor: document.getElementById('proveedor').value
    };

    // Validar campos requeridos
    if (!formData.etiqueta || !formData.codigo || !formData.descripcion) {
        showMessage('centralError', 'Por favor completa los campos requeridos');
        return;
    }

    // Guardar datos para el QR
    currentData = formData;

    // Generar QR con todos los datos
    try {
        qrCode = new QRious({
            element: qrCanvas,
            value: JSON.stringify(formData),
            size: 300,
            background: 'white',
            foreground: 'black',
            level: 'H'
        });

        // Mostrar QR
        qrResult.style.display = 'block';

        // SOLO generar QR, NO enviar a Google Sheets
        showMessage('centralSuccess', 'QR generado correctamente. Escanéalo en sucursal para registrar.');

    } catch (error) {
        console.error('Error generando QR:', error);
        showMessage('centralError', 'Error al generar el QR: ' + error.message);
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
}

function downloadQR() {
    const canvas = document.getElementById('qrCanvas');
    if (!canvas) {
        console.error('Canvas del QR no encontrado');
        showMessage('centralError', 'Error: No se puede descargar el QR');
        return;
    }

    try {
        const link = document.createElement('a');
        const codigo = document.getElementById('codigo').value || 'producto';
        link.download = `QR_${codigo}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('QR descargado correctamente');
    } catch (error) {
        console.error('Error al descargar QR:', error);
        showMessage('centralError', 'Error al descargar el QR: ' + error.message);
    }
}

// Sucursal - Scanner QR
function startScanner() {
    scanning = true;
    document.getElementById('startScanner').style.display = 'none';
    document.getElementById('stopScanner').style.display = 'inline-flex';
    document.getElementById('video').style.display = 'block';

    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: 'environment'
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

    // ENVIAR A GOOGLE SHEETS SOLO AL ESCANEAR
    sendDataToGoogleSheets(data, true);

    showMessage('sucursalSuccess', 'Datos escaneados y enviados al inventario');
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

// Función PARA ENVIAR DATOS a Google Sheets (solo al escanear)
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
        condicion: data.condicion || '',
        comentarios: data.comentarios || '',
        control: data.control || '',
        cantidad: data.cantidad || '1',
        familia: data.familia || '',
        falla: data.falla || '',
        proveedor: data.proveedor || 'Sin proveedor'
    };

    console.log("Enviando datos al escanear:", payload);

    // Usar fetch con no-cors para evitar ventana emergente
    try {
        fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(payload).toString()
        })
            .then(() => {
                console.log('Datos enviados silenciosamente a Google Sheets');
                if (isNewScan) {
                    showMessage('sucursalSuccess', '✅ Datos enviados correctamente al inventario');
                }
            })
            .catch(error => {
                console.error('Error en envío fetch:', error);
                sendWithHiddenIframe(scriptUrl, payload, isNewScan);
            });

    } catch (error) {
        console.error('Error en envío principal:', error);
        sendWithHiddenIframe(scriptUrl, payload, isNewScan);
    }
}

// Método alternativo con iframe invisible
function sendWithHiddenIframe(scriptUrl, payload, isNewScan) {
    const iframe = document.createElement('iframe');
    iframe.name = 'hiddenFrame';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = scriptUrl;
    form.target = 'hiddenFrame';
    form.style.display = 'none';

    Object.keys(payload).forEach(key => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = payload[key];
        form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();

    setTimeout(() => {
        document.body.removeChild(form);
        document.body.removeChild(iframe);
        console.log('Datos enviados mediante iframe oculto');
        if (isNewScan) {
            showMessage('sucursalSuccess', '✅ Datos registrados en el inventario');
        }
    }, 2000);
}