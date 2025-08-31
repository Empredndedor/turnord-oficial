# 🔐 Configuración de Secrets en GitHub

## Pasos para Configurar las Variables de Entorno

### 1. Acceder a la Configuración del Repositorio
1. Ve a tu repositorio en GitHub
2. Haz clic en **Settings** (Configuración)
3. En el menú lateral, busca **Secrets and variables**
4. Haz clic en **Actions**

### 2. Añadir los Secrets Necesarios

Debes crear **2 secrets** con estos nombres exactos:

#### Secret 1: SUPABASE_URL
- **Nombre:** `SUPABASE_URL`
- **Valor:** Tu URL de Supabase (ejemplo: `https://tu-proyecto.supabase.co`)

#### Secret 2: SUPABASE_ANON_KEY
- **Nombre:** `SUPABASE_ANON_KEY`
- **Valor:** Tu clave anónima de Supabase (la clave pública que empieza con `eyJ...`)

### 3. Cómo Añadir un Secret
1. Haz clic en **New repository secret**
2. Escribe el **Name** exactamente como se indica arriba
3. Pega el **Value** correspondiente
4. Haz clic en **Add secret**
5. Repite para el segundo secret

### 4. Verificar la Configuración
Una vez añadidos los secrets:
1. Haz un commit y push a la rama `main`
2. Ve a la pestaña **Actions** en tu repositorio
3. Verifica que el workflow se ejecute sin errores
4. En los logs del workflow deberías ver:
   - ✅ SUPABASE_URL configurada correctamente
   - ✅ SUPABASE_ANON_KEY configurada correctamente

### 5. Obtener tus Credenciales de Supabase

Si no tienes las credenciales:
1. Ve a [supabase.com](https://supabase.com)
2. Accede a tu proyecto
3. Ve a **Settings** > **API**
4. Copia:
   - **Project URL** → Para `SUPABASE_URL`
   - **Project API keys** > **anon public** → Para `SUPABASE_ANON_KEY`

### ⚠️ Importante
- **NUNCA** pongas estas credenciales directamente en el código
- Los secrets son seguros y solo GitHub Actions puede acceder a ellos
- Si cambias las credenciales en Supabase, actualiza también los secrets

### 🚀 Resultado
Una vez configurado correctamente, tu aplicación funcionará automáticamente en:
`https://tu-usuario.github.io/nombre-del-repositorio/`