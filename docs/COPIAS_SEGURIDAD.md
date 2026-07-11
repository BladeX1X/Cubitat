# Manual de Políticas de Copias de Seguridad (Backup) y Restauración

Este documento detalla los procedimientos técnicos y operativos para asegurar que los datos del portal **Cubitat** (usuarios, anuncios, leads y notificaciones) estén respaldados y puedan recuperarse ante cualquier pérdida de información o fallo del sistema.

---

## 📅 1. Estrategia General de Backup

Para garantizar la continuidad operativa sin generar costos extras, se implementan dos flujos independientes:

### 1.1 Respaldo Automático Semanal (GitHub Actions)
*   **Frecuencia**: Todos los domingos a las 00:00 UTC (y ejecutable bajo demanda).
*   **Ubicación**: Pestaña *Actions* del repositorio en GitHub. Los backups se empaquetan en archivos `.zip` y se guardan como artefactos del repositorio durante 90 días.
*   **Contenido**: Respaldo completo del esquema de la base de datos y de los datos de las tablas críticas.

### 1.2 Respaldo Local bajo Demanda (PowerShell)
*   **Frecuencia**: Se recomienda correr este script antes de realizar cualquier cambio manual de estructura en base de datos o migración crítica.
*   **Ubicación**: Disco local (`D:/Proyectos/Cubitat/backups/`).
*   **Ejecución**: Script local de un clic (`scripts/backup-local.ps1`).

---

## 🛠️ 2. Procedimiento de Restauración

En caso de pérdida de datos o borrado accidental, siga estos pasos:

### 2.1 Obtención del Respaldo
1.  **Si es en GitHub**: Descargue el archivo `.zip` del backup más reciente desde los artefactos del workflow "Supabase Backup" y descomprímalo para obtener el archivo `.sql`.
2.  **Si es Local**: Busque el archivo en la carpeta `/backups/` de su computadora local (el archivo tiene la fecha en el nombre, ej: `cubitat-backup-20260711.sql`).

### 2.2 Restauración Completa de Base de Datos
Para restaurar toda la base de datos al estado del backup:
1. Abra el panel de **Supabase Dashboard** de su proyecto.
2. Vaya a **SQL Editor**.
3. Abra el archivo `.sql` de respaldo en un editor de texto, copie su contenido, péguelo en el editor de Supabase y presione **Run**.

---

## 🔐 3. Seguridad de las Credenciales
Para evitar filtraciones de seguridad, la contraseña de base de datos nunca debe guardarse en código.
*   En **GitHub**: Configure el secreto `SUPABASE_DB_PASSWORD` ingresando a `Settings > Secrets and variables > Actions > New repository secret`.
*   En **Local**: El script de PowerShell le solicitará la contraseña de forma interactiva en la terminal sin imprimirla en pantalla.
