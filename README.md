# Dulcería Dulce Encanto

Sistema web de gestión y comercialización de productos de repostería para **Dulcería Dulce Encanto**. La plataforma permite a los clientes consultar el catálogo, seleccionar productos y gestionar sus pedidos, mientras que los administradores disponen de herramientas para gestionar el inventario, supervisar pedidos y consultar información de ventas.

## Elaborado por

| Integrante | Rol |
|---|---|
| **KENIA LOURDES SOLÓRZANO VÉLIZ** | Tester y Administrador de Base de Datos |
| **MARÍA EDITH MONTES MINAYA** | Desarrollador Backend |
| **ANTHONY ALEJANDRO MOREIRA MOREIRA** | Project Manager |
| **GABRIELA MARILYN MOREIRA ROSADO** | Coordinador Técnico y de Producto |
| **VIVIANA MAGDALENA MOREIRA ZAMBRANO** | Desarrollador Frontend |

---

## 1. Descripción del sistema

Dulcería Dulce Encanto es una aplicación web que digitaliza los procesos de consulta, selección y gestión de productos de una dulcería.

El sistema integra una interfaz orientada a los clientes y un panel administrativo que facilita el control de productos, variantes, inventario y pedidos. Su desarrollo busca mejorar la organización de las operaciones, centralizar la información y ofrecer una experiencia de navegación sencilla e intuitiva.

## 2. Tecnologías utilizadas

### Frontend
- **React:** construcción de interfaces de usuario mediante componentes.
- **TypeScript:** tipado estático y mayor seguridad en el desarrollo.
- **Vite:** entorno de desarrollo y herramienta de compilación.
- **CSS:** diseño visual, estilos adaptables y temas claro y oscuro.
- **Vitest:** ejecución de pruebas automatizadas.

### Backend
- **Node.js:** entorno de ejecución de JavaScript.
- **Express:** framework para la construcción de la API REST.
- **TypeScript:** desarrollo del backend con tipado estático.
- **MySQL:** sistema de gestión de bases de datos relacionales.
- **Zod:** validación de datos y esquemas.
- **Vitest:** pruebas automatizadas de servicios y rutas.

### Seguridad
- Autenticación mediante sesiones.
- Protección de solicitudes mediante tokens CSRF.
- Control de acceso basado en roles (`CLIENTE` y `ADMIN`).
- Validación de datos de entrada.
- Protección de cabeceras HTTP mediante Helmet.
- Control de origen de solicitudes mediante CORS.

### Herramientas de desarrollo
- Git y GitHub para el control de versiones.
- npm Workspaces para la gestión del monorepo.
- ESLint para el análisis estático del código.
- SonarCloud para el análisis de calidad del código y su integración con CI/CD.

## 3. Arquitectura del sistema

El proyecto utiliza una arquitectura de tipo monorepo, organizada en dos aplicaciones principales: frontend y backend.

```text
Dulceria-Dulce-Encanto/
│
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── config/
│   │       ├── modules/
│   │       │   ├── admin/
│   │       │   ├── auth/
│   │       │   ├── audit/
│   │       │   ├── catalog/
│   │       │   ├── favorites/
│   │       │   ├── orders/
│   │       │   └── users/
│   │       └── shared/
│   │
│   └── web/
│       └── src/
│           ├── modules/
│           │   ├── admin/
│           │   ├── app/
│           │   ├── auth/
│           │   ├── cart/
│           │   ├── catalog/
│           │   ├── favorites/
│           │   ├── notifications/
│           │   └── orders/
│           ├── services/
│           ├── styles/
│           └── utils/
│
└── package.json
```

### Frontend

La aplicación frontend está desarrollada con React y TypeScript. Se organiza mediante módulos funcionales que separan las responsabilidades de cada área del sistema.

Entre sus principales componentes se encuentran:
- Módulo de autenticación.
- Catálogo y navegación de productos.
- Gestión de favoritos.
- Carrito de compras.
- Administración de productos e inventario.
- Gestión y seguimiento de pedidos.
- Notificaciones y preferencias visuales.

### Backend

El backend está desarrollado con Express y TypeScript, siguiendo una organización modular por dominios funcionales.

Cada módulo concentra las responsabilidades correspondientes a sus rutas, servicios, repositorios y esquemas de validación, según las necesidades de cada funcionalidad.

La API REST proporciona la comunicación entre el frontend y la base de datos MySQL.

### Base de datos

MySQL permite almacenar y relacionar la información necesaria para el funcionamiento del sistema, incluyendo usuarios, roles, productos, categorías, variantes, inventario y pedidos.

## 4. Funcionalidades principales

### 4.1. Módulo de clientes

- Registro de usuarios.
- Inicio y cierre de sesión.
- Consulta del catálogo de productos.
- Visualización de detalles y variantes de productos.
- Gestión de productos favoritos.
- Administración del carrito de compras.
- Creación de pedidos.
- Consulta del historial y estado de los pedidos.
- Recepción de notificaciones relacionadas con los pedidos.

### 4.2. Módulo de administración

- Acceso restringido mediante rol de administrador.
- Creación, consulta y actualización de productos.
- Gestión de categorías y variantes.
- Administración de precios y existencias.
- Carga y eliminación de imágenes de productos.
- Consulta y gestión de pedidos.
- Actualización de estados de pedidos.
- Visualización de indicadores y estadísticas administrativas.
- Consulta de cantidades e importes de pedidos por períodos.
- Visualización de gráficos de ventas y distribución de pedidos por estado.

### 4.3. Interfaz de usuario

- Diseño adaptable a diferentes tamaños de pantalla.
- Tema claro y oscuro.
- Componentes reutilizables.
- Notificaciones visuales de acciones.
- Interfaz organizada para clientes y administradores.

## 5. API REST

La API se encuentra versionada bajo el prefijo:

```text
/api/v1
```

Entre sus principales grupos de rutas se encuentran:

| Recurso | Responsabilidad |
|---|---|
| `/auth` | Registro, autenticación, sesiones y protección CSRF. |
| `/catalog` | Consulta del catálogo de productos. |
| `/users` | Operaciones relacionadas con usuarios. |
| `/health` | Verificación del estado del servicio. |

También existen rutas administrativas y módulos específicos para favoritos y pedidos.

## 6. Pruebas y calidad del software

El proyecto incorpora pruebas automatizadas para verificar el comportamiento de sus componentes, servicios, rutas y funcionalidades principales.

Se utilizan:
- **Vitest** para pruebas unitarias y de integración.
- **TypeScript** para comprobación de tipos.
- **ESLint** para mantener estándares de calidad.
- **SonarCloud** para análisis estático y seguimiento de calidad.
- **GitHub Actions** para automatizar procesos de validación e integración continua.

### Cobertura de pruebas verificada

| Aplicación | Archivos de prueba | Pruebas aprobadas |
|---|---:|---:|
| Backend | 51 | 841 |
| Frontend | 42 | 662 |
| **Total** | **93** | **1503** |

Los últimos resultados de cobertura registrados fueron:

| Métrica | Backend | Frontend |
|---|---:|---:|
| Statements | 99.92% | 99.48% |
| Branches | 99.56% | 98.28% |
| Functions | 100% | 99.77% |
| Lines | 99.92% | 99.79% |

Estos porcentajes corresponden a la última ejecución de cobertura realizada durante el desarrollo.

## 7. Instalación y ejecución

### Requisitos previos

- Node.js.
- npm.
- MySQL.
- Git.

### Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd Dulceria-Dulce-Encanto
```

### Instalar dependencias

```bash
npm install
```

### Ejecutar el backend

```bash
npm run dev --workspace @dulceria/api
```

### Ejecutar el frontend

```bash
npm run dev --workspace @dulceria/web
```

Para ejecutar correctamente el sistema, es necesario configurar las variables de entorno correspondientes a la conexión con MySQL y los servicios del backend y frontend.

### Validaciones

Comprobar los tipos del backend:

```bash
npm run type-check --workspace @dulceria/api
```

Comprobar los tipos del frontend:

```bash
npm run type-check --workspace @dulceria/web
```

Ejecutar las pruebas del backend:

```bash
npm test --workspace @dulceria/api
```

Ejecutar las pruebas del frontend:

```bash
npm test --workspace @dulceria/web
```

Ejecutar cobertura del backend:

```bash
npm run test:coverage --workspace @dulceria/api
```

Ejecutar cobertura del frontend:

```bash
npm run test:coverage --workspace @dulceria/web
```

---

## 8. Objetivo del proyecto

Dulcería Dulce Encanto busca proporcionar una solución tecnológica que facilite la comercialización de productos de repostería y la administración de las operaciones del negocio.

Mediante la integración de tecnologías web, una API modular y una base de datos relacional, el sistema permite centralizar los procesos de venta y administración, mejorar el control de inventario y facilitar el seguimiento de pedidos.

**Dulcería Dulce Encanto — Tecnología para una gestión más organizada y una mejor experiencia de compra.**
