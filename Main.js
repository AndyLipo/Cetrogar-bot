let stream = null;
let modifyStream = null;
let scanning = false;
let modifyScanning = false;
let qrCode = null;
let currentData = null;
let existingEtiquetas = new Set();

// Verificar que todos los elementos necesarios existan
window.addEventListener('load', () => {
    console.log('Verificando elementos...');

    const requiredElements = [
        'qrCanvas', 'qrResult', 'productForm', 'video', 'canvas',
        'modifyVideo', 'modifyCanvas', 'modifyForm',
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
    document.getElementById('modifyFecha').value = today;

    // Cargar etiquetas existentes
    cargarEtiquetasExistentes();

    // Probar conexión después de cargar
    setTimeout(() => {
        const scriptUrl = localStorage.getItem('googleScriptUrl');
        if (scriptUrl) {
            console.log('URL de Google Script configurada:', scriptUrl);
            if (!scriptUrl.includes('/macros/') || !scriptUrl.includes('/exec')) {
                showMessage('configError', '⚠️ La URL parece incorrecta. Debe terminar en /exec');
            } else {
                console.log('✅ URL de Google Script tiene formato correcto');
            }
        } else {
            console.log('ℹ️ No hay URL de Google Script configurada');
        }
    }, 1000);
});

// Configuración
function showSection(sectionName) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));
    document.getElementById(sectionName).classList.add('active');

    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    const activeButton = Array.from(buttons).find(btn =>
        btn.textContent.includes(sectionName.split('-')[0].trim()) ||
        btn.textContent.includes(sectionName)
    );

    if (activeButton) {
        activeButton.classList.add('active');
    }
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

// Función para cargar etiquetas existentes
function cargarEtiquetasExistentes() {
    existingEtiquetas = new Set(['1001', '1002', '1003', '73287']);
}

// Central - Generar QR
document.getElementById('productForm').addEventListener('submit', function (e) {
    e.preventDefault();
    generateQR();
});

function generateQR() {
    const qrCanvas = document.getElementById('qrCanvas');
    const qrResult = document.getElementById('qrResult');

    if (!qrCanvas || !qrResult) {
        showMessage('centralError', 'Error: Elementos de QR no configurados');
        return;
    }

    const formData = obtenerDatosFormulario('productForm');
    if (!formData.etiqueta || !formData.codigo || !formData.descripcion) {
        showMessage('centralError', 'Por favor completa los campos requeridos');
        return;
    }

    currentData = formData;

    try {
        qrCode = new QRious({
            element: qrCanvas,
            value: JSON.stringify(formData),
            size: 300,
            background: 'white',
            foreground: 'black',
            level: 'H'
        });

        qrResult.style.display = 'block';
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

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(function (mediaStream) {
            stream = mediaStream;
            const video = document.getElementById('video');
            video.srcObject = stream;
            video.play();
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
    const dataDisplay = document.getElementById('dataDisplay');
    let htmlContent = '<strong>Datos del producto:</strong><br>';

    Object.keys(data).forEach(key => {
        if (data[key]) {
            htmlContent += `<strong>${key}:</strong> ${data[key]}<br>`;
        }
    });

    dataDisplay.innerHTML = htmlContent;
    document.getElementById('scannedData').style.display = 'block';
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
                    console.error('Error parsing QR data:', e, 'Data:', code.data);
                    showMessage('sucursalError', 'Código QR inválido. Asegúrate de escanear un QR generado por esta app.');
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

// Modificación - Scanner QR
function startModifyScanner() {
    modifyScanning = true;
    document.getElementById('startModifyScanner').style.display = 'none';
    document.getElementById('stopModifyScanner').style.display = 'inline-flex';
    document.getElementById('modifyVideo').style.display = 'block';

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(function (mediaStream) {
            modifyStream = mediaStream;
            const video = document.getElementById('modifyVideo');
            video.srcObject = modifyStream;
            video.play();
            scanModifyQRCode();
        })
        .catch(function (err) {
            showMessage('modifyError', 'Error al acceder a la cámara: ' + err.message);
            stopModifyScanner();
        });
}

function stopModifyScanner() {
    modifyScanning = false;
    document.getElementById('startModifyScanner').style.display = 'inline-flex';
    document.getElementById('stopModifyScanner').style.display = 'none';
    document.getElementById('modifyVideo').style.display = 'none';

    if (modifyStream) {
        modifyStream.getTracks().forEach(track => track.stop());
        modifyStream = null;
    }
}

function scanModifyQRCode() {
    if (!modifyScanning) return;

    const video = document.getElementById('modifyVideo');
    const canvas = document.getElementById('modifyCanvas');
    const context = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            if (typeof jsQR === 'undefined' || !jsQR) {
                showMessage('modifyError', 'Error: La librería de scanner no se cargó correctamente');
                stopModifyScanner();
                return;
            }

            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
            });

            if (code) {
                console.log('QR detectado:', code);
                try {
                    const data = JSON.parse(code.data);
                    cargarDatosParaModificacion(data);
                    stopModifyScanner();
                    return;
                } catch (e) {
                    console.error('Error parsing QR data:', e, 'Data:', code.data);
                    showMessage('modifyError', 'Código QR inválido. Asegúrate de escanear un QR generado por esta app.');
                }
            }
        } catch (error) {
            console.error('Error en el proceso de escaneo:', error);
        }
    }

    if (modifyScanning) {
        requestAnimationFrame(scanModifyQRCode);
    }
}



function cargarDatosParaModificacion(data) {
    console.log('📝 Cargando datos para modificación:', data);

    if (!data || typeof data !== 'object') {
        showMessage('modifyError', 'Formato de QR inválido');
        return;
    }

    try {
        // Mapear campos de datos a IDs de formulario
        const fieldMap = {
            etiqueta: 'modifyEtiqueta',
            fecha: 'modifyFecha',
            suc: 'modifySuc',
            codAutorizacion: 'modifyCodAutorizacion',
            codigo: 'modifyCodigo',
            descripcion: 'modifyDescripcion',
            motivo: 'modifyMotivo',
            noRemito: 'modifyNoRemito',
            condicion: 'modifyCondicion',
            comentarios: 'modifyComentarios',
            control: 'modifyControl',
            cantidad: 'modifyCantidad',
            familia: 'modifyFamilia',
            falla: 'modifyFalla',
            proveedor: 'modifyProveedor'
        };

        // Llenar campos del formulario
        Object.keys(fieldMap).forEach(key => {
            const fieldId = fieldMap[key];
            const fieldElement = document.getElementById(fieldId);

            if (fieldElement && data[key] !== undefined) {
                if (key === 'fecha') {
                    fieldElement.value = convertirFechaFormato(data[key]);
                } else {
                    fieldElement.value = data[key];
                }
                console.log(`✅ Campo ${fieldId} llenado:`, data[key]);
            } else {
                console.log(`⚠️ Campo no encontrado: ${fieldId}`);
            }
        });

        // Guardar etiqueta original
        const etiquetaField = document.getElementById('modifyEtiqueta');
        if (etiquetaField) {
            etiquetaField.dataset.original = data.etiqueta || '';
        }

        // Mostrar formulario
        document.getElementById('modifyFormContainer').style.display = 'block';
        showMessage('modifySuccess', '✅ Datos cargados correctamente. Modifica los campos necesarios.');

    } catch (error) {
        console.error('❌ Error cargando datos para modificación:', error);
        showMessage('modifyError', 'Error al cargar los datos del QR: ' + error.message);
    }
}
function verificarCamposModificacion() {
    console.log('🔍 Verificando campos de modificación...');

    const camposRequeridos = [
        'modifyEtiqueta', 'modifyFecha', 'modifySuc', 'modifyCodigo',
        'modifyDescripcion', 'modifyProveedor'
    ];

    camposRequeridos.forEach(id => {
        const campo = document.getElementById(id);
        if (!campo) {
            console.error(`❌ Campo no encontrado: ${id}`);
        } else {
            console.log(`✅ Campo encontrado: ${id}`);
        }
    });
}

// Ejecutar verificación al cargar la página
setTimeout(verificarCamposModificacion, 3000);

document.getElementById('modifyForm').addEventListener('submit', function (e) {
    e.preventDefault();
    modificarDatosQR();
});

function modificarDatosQR() {
    console.log('🔄 Iniciando modificación de datos QR');

    try {
        const formData = obtenerDatosFormulario('modifyForm');
        console.log('📋 Datos del formulario de modificación:', formData);

        // Validar datos requeridos
        if (!formData.etiqueta || !formData.codigo) {
            showMessage('modifyError', '❌ Etiqueta y código son campos requeridos');
            return;
        }

        const etiquetaOriginal = document.getElementById('modifyEtiqueta')?.dataset?.original;
        console.log('🏷️ Etiqueta original:', etiquetaOriginal, 'Nueva:', formData.etiqueta);

        // Crear nuevo QR
        const modifyQrCanvas = document.createElement('canvas');
        new QRious({
            element: modifyQrCanvas,
            value: JSON.stringify(formData),
            size: 300,
            background: 'white',
            foreground: 'black',
            level: 'H'
        });

        // Descargar nuevo QR
        const link = document.createElement('a');
        const fileName = `QR_${formData.codigo}_MODIFICADO_${new Date().getTime()}.png`;
        link.download = fileName;
        link.href = modifyQrCanvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showMessage('modifySuccess', '✅ Nuevo QR generado y descargado: ' + fileName);

        // Opcional: enviar datos modificados a Google Sheets
        setTimeout(() => {
            sendDataToGoogleSheets(formData, false);
        }, 1000);

        // Limpiar formulario después de 3 segundos
        setTimeout(() => {
            document.getElementById('modifyFormContainer').style.display = 'none';
            document.getElementById('modifyForm').reset();
            console.log('🧹 Formulario de modificación limpiado');
        }, 3000);

    } catch (error) {
        console.error('❌ Error modificando QR:', error);
        showMessage('modifyError', 'Error al generar el nuevo QR: ' + error.message);
    }
}

function convertirFechaFormato(fechaStr) {
    try {
        if (fechaStr.includes('/')) {
            const parts = fechaStr.split('/');
            if (parts.length === 3) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }
        if (fechaStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return fechaStr;
        }
        const date = new Date(fechaStr);
        if (!isNaN(date)) {
            return date.toISOString().split('T')[0];
        }
        return '';
    } catch (error) {
        console.error('Error convirtiendo fecha:', error);
        return '';
    }
}


// FUNCIÓN PRINCIPAL DE ENVÍO A GOOGLE SHEETS

function obtenerDatosFormulario(formId) {
    const form = document.getElementById(formId);

    // Para formulario de modificación
    if (formId === 'modifyForm') {
        return {
            etiqueta: document.getElementById('modifyEtiqueta')?.value || '',
            fecha: formatDate(document.getElementById('modifyFecha')?.value || ''),
            suc: document.getElementById('modifySuc')?.value || '',
            codAutorizacion: document.getElementById('modifyCodAutorizacion')?.value || '',
            codigo: document.getElementById('modifyCodigo')?.value || '',
            descripcion: document.getElementById('modifyDescripcion')?.value || '',
            motivo: document.getElementById('modifyMotivo')?.value || '',
            noRemito: document.getElementById('modifyNoRemito')?.value || '',
            condicion: document.getElementById('modifyCondicion')?.value || '',
            comentarios: document.getElementById('modifyComentarios')?.value || '',
            control: document.getElementById('modifyControl')?.value || '',
            cantidad: document.getElementById('modifyCantidad')?.value || '',
            familia: document.getElementById('modifyFamilia')?.value || '',
            falla: document.getElementById('modifyFalla')?.value || '',
            proveedor: document.getElementById('modifyProveedor')?.value || ''
        };
    }

    // Para formulario principal
    return {
        etiqueta: document.getElementById('etiqueta')?.value || '',
        fecha: formatDate(document.getElementById('fecha')?.value || ''),
        suc: document.getElementById('suc')?.value || '',
        codAutorizacion: document.getElementById('codAutorizacion')?.value || '',
        codigo: document.getElementById('codigo')?.value || '',
        descripcion: document.getElementById('descripcion')?.value || '',
        motivo: document.getElementById('motivo')?.value || '',
        noRemito: document.getElementById('noRemito')?.value || '',
        condicion: document.getElementById('condicion')?.value || '',
        comentarios: document.getElementById('comentarios')?.value || '',
        control: document.getElementById('control')?.value || '',
        cantidad: document.getElementById('cantidad')?.value || '',
        familia: document.getElementById('familia')?.value || '',
        falla: document.getElementById('falla')?.value || '',
        proveedor: document.getElementById('proveedor')?.value || ''
    };
}

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

    console.log("📤 Enviando datos:", payload);
    console.log("🔗 URL:", scriptUrl);

    // USAR DIRECTAMENTE FORMULARIO (único método que funciona con CORS)
    enviarConFormulario(scriptUrl, payload, isNewScan);
}

// MÉTODO 1: Enviar como formulario (único método que funciona con CORS)
function enviarComoJson(scriptUrl, payload, isNewScan) {
    console.log('🔄 Usando método de formulario (CORS compatible)');

    // Usar directamente el método de formulario que SÍ funciona
    enviarConFormulario(scriptUrl, payload, isNewScan);
}

function enviarConFormulario(scriptUrl, payload, isNewScan) {
    console.log('🔄 Enviando mediante formulario:', payload);

    return new Promise((resolve) => {
        try {
            const iframe = document.createElement('iframe');
            iframe.name = 'gscriptFrame_' + Date.now();
            iframe.style.display = 'none';
            let responseProcessed = false;

            // Agregar un identificador único para debug
            const requestId = Date.now();
            console.log(`📨 [${requestId}] Iniciando envío a:`, scriptUrl);

            iframe.onload = function () {
                if (responseProcessed) return;
                responseProcessed = true;
                console.log(`✅ [${requestId}] Formulario enviado correctamente`);

                setTimeout(() => {
                    try {
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        const responseText = iframeDoc.body.textContent;

                        console.log(`📨 [${requestId}] Respuesta COMPLETA del servidor:`, responseText);
                        console.log(`📊 [${requestId}] Tipo de respuesta:`, typeof responseText);
                        console.log(`📏 [${requestId}] Longitud:`, responseText ? responseText.length : 0);

                        if (responseText && responseText.trim() !== '') {
                            try {
                                const response = JSON.parse(responseText);
                                console.log(`🎯 [${requestId}] Respuesta JSON parseada:`, response);

                                if (response.result === "success") {
                                    showMessage('sucursalSuccess', '✅ ' + response.message);
                                    console.log(`✅ [${requestId}] Éxito:`, response.message);
                                } else {
                                    showMessage('sucursalError', '❌ ' + response.message);
                                    console.log(`❌ [${requestId}] Error:`, response.message);
                                }
                            } catch (e) {
                                console.log(`⚠️ [${requestId}] Respuesta no es JSON válido:`, responseText);
                                console.log(`⚠️ [${requestId}] Error parsing:`, e);
                                showMessage('sucursalSuccess', '✅ Datos enviados correctamente (respuesta no JSON)');
                            }
                        } else {
                            console.log(`⚠️ [${requestId}] Respuesta vacía o undefined`);
                            showMessage('sucursalSuccess', '✅ Datos enviados al inventario');
                        }
                    } catch (error) {
                        console.log(`❌ [${requestId}] Error leyendo respuesta:`, error);
                        showMessage('sucursalSuccess', '✅ Datos enviados correctamente');
                    }

                    // Limpiar
                    safeRemoveElement(iframe);
                    safeRemoveElement(form);
                    resolve(true);

                }, 1500);
            };

            iframe.onerror = function () {
                if (responseProcessed) return;
                responseProcessed = true;
                console.log(`❌ [${requestId}] Error en iframe`);
                showMessage('sucursalError', '❌ Error de conexión con Google Sheets');

                safeRemoveElement(iframe);
                safeRemoveElement(form);
                resolve(false);
            };

            document.body.appendChild(iframe);

            const form = document.createElement('form');
            form.method = 'POST';
            form.action = scriptUrl;
            form.target = iframe.name;
            form.style.display = 'none';

            // Agregar todos los campos del payload
            Object.keys(payload).forEach(key => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = payload[key];
                form.appendChild(input);
                console.log(`📋 [${requestId}] Campo: ${key} = ${payload[key]}`);
            });

            document.body.appendChild(form);
            console.log(`🚀 [${requestId}] Enviando formulario...`);
            form.submit();
            console.log(`📤 [${requestId}] Datos enviados mediante formulario`);

            // Timeout después de 15 segundos
            setTimeout(() => {
                if (!responseProcessed) {
                    responseProcessed = true;
                    console.log(`⏰ [${requestId}] Timeout del formulario (15s)`);
                    showMessage('sucursalError', '❌ Timeout. Verifica la conexión e intenta nuevamente.');

                    safeRemoveElement(iframe);
                    safeRemoveElement(form);
                    resolve(false);
                }
            }, 15000);

        } catch (error) {
            console.error('❌ Error con formulario tradicional:', error);
            showMessage('sucursalError', '❌ Error al enviar datos: ' + error.message);
            resolve(false);
        }
    });
}
// FUNCIÓN AUXILIAR PARA ELIMINAR ELEMENTOS
function safeRemoveElement(element) {
    try {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    } catch (error) {
        console.log('⚠️ Error al eliminar elemento:', error);
    }
}

// Función para verificar la conexión
function probarConexionGoogleScript() {
    const scriptUrl = localStorage.getItem('googleScriptUrl');
    if (!scriptUrl) return false;
    return true;
}

function testGoogleScriptConnection() {
    const scriptUrl = localStorage.getItem('googleScriptUrl');
    if (!scriptUrl) {
        console.log('❌ No hay URL configurada');
        return;
    }

    console.log('🔗 Probando conexión con:', scriptUrl);

    // Crear un iframe para probar la conexión GET
    const iframe = document.createElement('iframe');
    iframe.src = scriptUrl;
    iframe.style.display = 'none';
    iframe.onload = function () {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const response = iframeDoc.body.textContent;
            console.log('✅ Conexión exitosa. Respuesta:', response);
        } catch (error) {
            console.log('⚠️ No se pudo leer la respuesta, pero la conexión funciona');
        }
        document.body.removeChild(iframe);
    };
    iframe.onerror = function () {
        console.log('❌ Error de conexión');
        document.body.removeChild(iframe);
    };
    document.body.appendChild(iframe);
}

// Llama a esta función después de cargar la configuración
setTimeout(testGoogleScriptConnection, 2000);

