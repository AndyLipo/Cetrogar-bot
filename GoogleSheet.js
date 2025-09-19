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
            console.log('✅ Encabezados creados');
        }

        // Verificar si la hoja tiene filas (solo encabezados)
        const lastRow = sheet.getLastRow();
        console.log('📊 Última fila de la hoja:', lastRow);

        // Verificar duplicados SOLO si hay datos además de los encabezados
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

        return ContentService
            .createTextOutput(JSON.stringify({
                result: "success",
                message: "Datos guardados correctamente en la fila " + nuevaFila,
                row: nuevaFila
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