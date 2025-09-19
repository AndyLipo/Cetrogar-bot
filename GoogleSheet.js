function doPost(e) {
    console.log('📨 Recibida petición POST');

    // Verificar si 'e' está definido
    if (!e) {
        console.log('⚠️ Ejecución manual detectada - probando con datos de ejemplo');
        e = {
            parameters: {
                etiqueta: ['TEST_123'],
                fecha: ['20/09/2025'],
                suc: ['999'],
                codAutorizacion: ['TEST_AUTH'],
                codigo: ['TEST_CODE'],
                descripcion: ['Producto de prueba'],
                motivo: ['Testing'],
                noRemito: ['0'],
                condicion: ['Nueva'],
                comentarios: ['Prueba manual'],
                control: ['TEST'],
                cantidad: ['1'],
                familia: ['TEST'],
                falla: ['Ninguna'],
                proveedor: ['Proveedor Test']
            }
        };
    }

    let data = {};
    let duplicateCheck = false;
    let codigoDuplicateCheck = false;

    try {
        // Procesar datos de formulario
        if (e.parameters) {
            console.log('📝 Datos recibidos como formulario');

            for (let key in e.parameters) {
                if (e.parameters.hasOwnProperty(key) && key !== 'callback') {
                    data[key] = e.parameters[key][0];
                }
            }
        }

        console.log('✅ Datos procesados:', data);

        // Abrir la hoja de cálculo
        const SPREADSHEET_ID = "1CP1YlV_qNLtLTnQIzMGbiMHA39zbh4d3kjgobbV70JA";
        const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        let sheet = spreadsheet.getSheetByName("Hoja1");

        // Verificar si la hoja existe y tiene datos
        if (!sheet) {
            console.log('📋 Creando nueva hoja "Hoja1"');
            sheet = spreadsheet.insertSheet("Hoja1");
            // Agregar encabezados
            const headers = [
                'ETIQUETA', 'FECHA', 'SUC', 'COD. AUTORIZACION', 'CODIGO',
                'DESCRIPCION', 'MOTIVO', 'NO REMITO', 'CONDICION', 'COMENTARIOS',
                'CONTROL', 'CANT.', 'FLIA', 'FALLA', 'PROVEEDOR', 'Timestamp'
            ];
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

            // Formatear encabezados
            const headerRange = sheet.getRange(1, 1, 1, headers.length);
            headerRange.setBackground('#dddddd')
                .setFontWeight('bold')
                .setBorder(true, true, true, true, true, true);

            console.log('✅ Encabezados creados y formateados');
        }

        // Verificar si la hoja tiene filas (solo encabezados)
        const lastRow = sheet.getLastRow();
        console.log('📊 Última fila de la hoja:', lastRow);

        // Verificar duplicados de ETIQUETA
        const etiqueta = data.etiqueta || '';
        if (etiqueta && etiqueta !== 'Sin etiqueta' && lastRow > 1) {
            console.log('🔍 Buscando etiquetas duplicadas...');
            const etiquetasRange = sheet.getRange(2, 1, lastRow - 1, 1);
            const etiquetasValues = etiquetasRange.getValues();

            for (let i = 0; i < etiquetasValues.length; i++) {
                if (etiquetasValues[i][0] === etiqueta) {
                    duplicateCheck = true;
                    break;
                }
            }
        }

        if (duplicateCheck) {
            console.log('❌ Etiqueta duplicada encontrada:', etiqueta);
            return ContentService
                .createTextOutput(JSON.stringify({
                    result: "error",
                    message: "DUPLICADO: La etiqueta " + etiqueta + " ya existe en el sistema"
                }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        // Verificar duplicados de CODIGO
        const codigo = data.codigo || '';
        if (codigo && lastRow > 1) {
            console.log('🔍 Buscando códigos duplicados...');
            const codigosRange = sheet.getRange(2, 5, lastRow - 1, 1); // Columna 5 = CODIGO
            const codigosValues = codigosRange.getValues();

            for (let i = 0; i < codigosValues.length; i++) {
                if (codigosValues[i][0] === codigo) {
                    codigoDuplicateCheck = true;
                    break;
                }
            }
        }

        // Agregar datos a la hoja
        const newRow = [
            data.etiqueta || '',
            data.fecha || '',
            data.suc || '',
            data.codAutorizacion || '',
            data.codigo || '',
            data.descripcion || '',
            data.motivo || '',
            data.noRemito || '',
            data.condicion || '',
            data.comentarios || '',
            data.control || '',
            data.cantidad || '1',
            data.familia || '',
            data.falla || '',
            data.proveedor || '',
            new Date().toLocaleString('es-AR')
        ];

        sheet.appendRow(newRow);
        const nuevaFila = sheet.getLastRow();
        console.log('✅ Datos guardados exitosamente en la fila:', nuevaFila);

        // Aplicar formato de color si es código duplicado
        if (codigoDuplicateCheck) {
            console.log('🎨 Aplicando color rojo a código duplicado:', codigo);

            // Pintar toda la fila de rojo claro
            const duplicateRowRange = sheet.getRange(nuevaFila, 1, 1, 16);
            duplicateRowRange.setBackground('#ffcccc'); // Rojo claro

            // Pintar específicamente la celda del código de rojo más intenso
            const codigoCell = sheet.getRange(nuevaFila, 5); // Columna 5 = CODIGO
            codigoCell.setBackground('#ff6666') // Rojo más intenso
                .setFontColor('#ffffff')  // Texto blanco
                .setFontWeight('bold');

            console.log('✅ Formato aplicado a fila duplicada');
        } else {
            // Formato normal para filas no duplicadas
            const newRowRange = sheet.getRange(nuevaFila, 1, 1, 16);
            newRowRange.setBackground('#ffffff') // Fondo blanco
                .setBorder(true, true, true, true, true, true);
        }

        // También revisar y actualizar filas anteriores con el mismo código
        if (codigoDuplicateCheck) {
            console.log('🔄 Actualizando formato de códigos duplicados anteriores...');
            actualizarFormatosCodigosDuplicados(sheet, codigo);
        }

        return ContentService
            .createTextOutput(JSON.stringify({
                result: "success",
                message: "Datos guardados correctamente en la fila " + nuevaFila,
                row: nuevaFila,
                codigoDuplicado: codigoDuplicateCheck
            }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        console.error('❌ Error guardando en Google Sheets:', error);
        return ContentService
            .createTextOutput(JSON.stringify({
                result: "error",
                message: "Error guardando datos: " + error.toString()
            }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// Función para actualizar formatos de códigos duplicados
function actualizarFormatosCodigosDuplicados(sheet, codigo) {
    try {
        const lastRow = sheet.getLastRow();
        if (lastRow <= 1) return; // Solo encabezados

        const codigosRange = sheet.getRange(2, 5, lastRow - 1, 1); // Columna 5 = CODIGO
        const codigosValues = codigosRange.getValues();

        // Encontrar todas las filas con el mismo código
        const filasDuplicadas = [];
        for (let i = 0; i < codigosValues.length; i++) {
            if (codigosValues[i][0] === codigo) {
                filasDuplicadas.push(i + 2); // +2 porque empezamos desde la fila 2
            }
        }

        // Aplicar formato a todas las filas duplicadas
        if (filasDuplicadas.length > 1) {
            console.log('🔄 Aplicando formato a', filasDuplicadas.length, 'filas duplicadas');

            filasDuplicadas.forEach(fila => {
                // Pintar toda la fila de rojo claro
                const rowRange = sheet.getRange(fila, 1, 1, 16);
                rowRange.setBackground('#ffcccc'); // Rojo claro

                // Pintar específicamente la celda del código
                const codigoCell = sheet.getRange(fila, 5);
                codigoCell.setBackground('#ff6666') // Rojo más intenso
                    .setFontColor('#ffffff')  // Texto blanco
                    .setFontWeight('bold');
            });
        }
    } catch (error) {
        console.error('❌ Error actualizando formatos duplicados:', error);
    }
}

function doGet(e) {
    console.log('📨 Recibida petición GET');

    return ContentService
        .createTextOutput(JSON.stringify({
            result: "success",
            message: "Google Apps Script funcionando correctamente",
            version: "1.0",
            available_methods: ["POST"]
        }))
        .setMimeType(ContentService.MimeType.JSON);
}

// Función adicional para limpiar formatos (opcional)
function limpiarFormatos() {
    const SPREADSHEET_ID = "1CP1YlV_qNLtLTnQIzMGbiMHA39zbh4d3kjgobbV70JA";
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName("Hoja1");

    if (sheet && sheet.getLastRow() > 1) {
        const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, 16);
        dataRange.setBackground('#ffffff')
            .setFontColor('#000000')
            .setFontWeight('normal');

        console.log('✅ Formatos limpiados');
    }
}