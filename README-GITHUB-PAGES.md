# Configuración para GitHub Pages

## 📋 Configuración Centralizada

Todo el proyecto ahora utiliza configuración centralizada en `config.js` para funcionar correctamente en GitHub Pages.

### 🔧 Configuración Automática

El archivo `config.js` detecta automáticamente si está ejecutándose en GitHub Pages y ajusta las rutas accordingly:

```javascript
// Detección automática de GitHub Pages
github: {
  isGitHubPages: window.location.hostname.includes('github.io'),
  basePath: window.location.hostname.includes('github.io') ? 
    `/${window.location.pathname.split('/')[1]}` : ''
}
```

### 🚀 Pasos para Desplegar en GitHub Pages

1. **Subir el código a GitHub:**
   ```bash
   git add .
   git commit -m "Configuración centralizada para GitHub Pages"
   git push origin main
   ```

2. **Configurar GitHub Pages:**
   - Ve a Settings > Pages en tu repositorio
   - Selecciona "Deploy from a branch"
   - Elige "main" branch y "/ (root)"
   - Guarda los cambios

3. **Configurar Variables de Entorno:**
   - Ve a Settings > Secrets and variables > Actions
   - Añade estos secrets:
     - `SUPABASE_URL`: Tu URL de Supabase
     - `SUPABASE_ANON_KEY`: Tu clave anónima de Supabase

4. **Crear GitHub Action (opcional):**
   Crea `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to GitHub Pages
   on:
     push:
       branches: [ main ]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Replace config values
           run: |
             sed -i "s/TU_SUPABASE_URL/${{ secrets.SUPABASE_URL }}/g" config.js
             sed -i "s/TU_SUPABASE_KEY/${{ secrets.SUPABASE_ANON_KEY }}/g" config.js
         - name: Deploy to GitHub Pages
           uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./
   ```

### 📁 Estructura de Configuración

```
config.js
├── Configuración de Supabase
├── Configuración del Negocio (barberia0001)
├── Rutas de la aplicación
├── URLs de CDN
└── Configuración específica de GitHub Pages
```

### 🔗 URLs Centralizadas

Todas las rutas ahora se manejan centralmente:
- `Config.getRoute('login')` → `./login.html` (local) o `/repo-name/login.html` (GitHub Pages)
- `Config.getRoute('panel')` → `./panel.html` (local) o `/repo-name/panel.html` (GitHub Pages)
- `Config.getCDN('supabase')` → URL del CDN de Supabase

### ✅ Archivos Actualizados

- ✅ `config.js` - Configuración centralizada completa
- ✅ `database.js` - Usa CDN desde config.js
- ✅ `admin/login.js` - Usa configuración centralizada
- ✅ `admin/panel.js` - Usa rutas centralizadas
- ✅ `admin/configuracion.js` - Usa rutas centralizadas
- ✅ `admin/negocio.js` - Usa rutas centralizadas
- ✅ `usuario/usuario.js` - Usa configuración del negocio centralizada

### 🌐 Acceso en GitHub Pages

Una vez desplegado, tu aplicación estará disponible en:
`https://tu-usuario.github.io/nombre-del-repositorio/`

### 🔒 Seguridad

- Las credenciales de Supabase se reemplazan automáticamente via GitHub Actions
- No hay credenciales hardcodeadas en el código
- Configuración separada para desarrollo y producción