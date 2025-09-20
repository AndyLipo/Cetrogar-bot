
# 📱 Cetrogar Bot - Sistema de Inventario con QR

> Sistema completo para gestionar productos mediante códigos QR que se sincronizan automáticamente con Google Sheets.

![Badge](https://img.shields.io/badge/Estado-Estable-brightgreen)
![Badge](https://img.shields.io/badge/Licencia-MIT-blue)
![Badge](https://img.shields.io/badge/Versión-1.0-orange)
![GitHub Stars](https://img.shields.io/github/stars/AndyLipo/Cetrogar-bot?style=social)

## ✨ Características

- 🏷️ **Generación de QR** - Crea códigos QR con datos de productos
- 📷 **Escaneo inteligente** - Usa la cámara del dispositivo
- 🔄 **Sincronización automática** - Conecta directamente con Google Sheets
- ✏️ **Edición de productos** - Modifica datos existentes fácilmente
- 🔍 **Detección de duplicados** - Coloreado automático para evitar errores
- 📱 **Responsive** - Funciona en móviles y desktop

## 🚀 Instalación Rápida

### 1. Clonar el repositorio
```bash
git clone https://github.com/AndyLipo/Cetrogar-bot.git
cd Cetrogar-bot
```

### 2. Configurar Google Sheets
```bash
1. Crear hoja en Google Sheets
2. Copiar el ID de la URL: docs.google.com/spreadsheets/d/[ESTE_ID]/edit
3. Guardar el ID para el siguiente paso
```

### 3. Google Apps Script
```javascript
1. Ir a script.google.com
2. Nuevo proyecto → Pegar código de GoogleSheet.js
3. Reemplazar SPREADSHEET_ID con tu ID
4. Desplegar → Nueva implementación → Aplicación web
```

### 3. Configurar App
```bash
1. Abrir la aplicación
2. Ir a Configuración
3. Pegar URL de Google Apps Script
4. ¡Listo para usar! 🎉
```

## 💻 Uso

### Central - Generar Productos
1. Completa el formulario
2. Haz clic en "Generar QR"
3. Descarga o escanea el código

### Sucursal - Escanear
1. Presiona "Iniciar Scanner"
2. Apunta la cámara al QR
3. Los datos aparecen automáticamente

### Modificación - Editar
1. Escanea un QR existente
2. Modifica los datos
3. Genera un nuevo QR actualizado

## 🛠️ Tecnologías

- **Frontend:** HTML5, CSS3, JavaScript
- **QR:** QRious, jsQR
- **Backend:** Google Apps Script
- **Storage:** Google Sheets + localStorage

## 📋 Estructura de Datos

La aplicación maneja estos campos en Google Sheets:

| Campo | Descripción |
|-------|-------------|
| ETIQUETA | Identificador único |
| CODIGO | Código del producto |
| DESCRIPCION | Nombre del producto |
| CANTIDAD | Stock disponible |
| SUCURSAL | Ubicación |

## 🔧 Solución de Problemas

### Error de conexión
- ✅ Verificar URL de Google Script
- ✅ Confirmar permisos de la hoja
- ✅ Revisar despliegue como "Aplicación web"

### Problemas con cámara
- ✅ Permitir acceso a cámara en el navegador
- ✅ Usar HTTPS (requerido para cámara)
- ✅ Probar con diferentes navegadores

## 📱 Compatibilidad

| Navegador | Móvil | Desktop |
|-----------|-------|---------|
| Chrome    | ✅     | ✅       |
| Firefox   | ✅     | ✅       |
| Safari    | ✅     | ✅       |
| Edge      | ✅     | ✅       |

## 🎯 Casos de Uso

- 🏪 Control de inventario retail
- 📦 Gestión de almacenes
- 🏢 Seguimiento de activos
- 🔄 Control de devoluciones
- 📝 Registro de incidencias

## 🤝 Contribuir

1. Fork el proyecto desde [AndyLipo/Cetrogar-bot](https://github.com/AndyLipo/Cetrogar-bot)
2. Crea tu rama: `git checkout -b feature/AmazingFeature`
3. Commit: `git commit -m 'Add: nueva característica'`
4. Push: `git push origin feature/AmazingFeature`
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - mira [LICENSE](LICENSE) para más detalles.

## 📞 Soporte

¿Necesitas ayuda? 
- 🐛 **Issues:** [Reportar problema](https://github.com/AndyLipo/Cetrogar-bot/issues)
- 💬 **Discusiones:** [GitHub Discussions](https://github.com/AndyLipo/Cetrogar-bot/discussions)
- 📧 **Contacto:** Abre un issue en el repositorio

---

⭐ **¡Si te gusta Cetrogar Bot, dale una estrella en [GitHub](https://github.com/AndyLipo/Cetrogar-bot)!** ⭐
